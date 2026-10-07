import type { Server as HttpServer } from 'node:http';
import { Server } from '@hocuspocus/server';
import * as Y from 'yjs';
import { Awareness, applyAwarenessUpdate, encodeAwarenessUpdate, removeAwarenessStates } from 'y-protocols/awareness';
import type { XYPosition } from '@xyflow/react';
import type { AgentPresence } from '../agent-choreography';
import { canvasDocumentName, canvasIdFromDocumentName, getCanvasMaps, readMeta } from '../canvas-doc';
import { fromBase64, toBase64, type SyncRequest, type SyncResponse } from '../tool-sync';

export const STUDIO_SOCKET_PATH = '/_eventcatalog/studio';
const SOCKET_PATH_PATTERN = /\/_eventcatalog\/studio\/?$/;
// Agents show as present while they work, and leave a while after their last change (before awareness's own
// 30 second timeout would drop them anyway)
const AGENT_PRESENCE_TTL_MS = 25_000;

export type AgentIdentity = { name: string; color: string };
export type CanvasSummary = {
  canvasId: string;
  title?: string;
  createdAt?: number;
  nodeCount: number;
  edgeCount: number;
  openComments: number;
  people: string[];
};

/**
 * What the collaboration server keeps for the life of the process: one Hocuspocus instance, and the canvases
 * in memory (a snapshot each time one is stored), so they last until the process restarts.
 */
type RuntimeState = {
  server: Server;
  snapshots: Map<string, Uint8Array>;
  agents: Map<string, { awareness: Awareness; expires: ReturnType<typeof setTimeout> }>;
  attached: WeakSet<HttpServer>;
};

const createState = (): RuntimeState => {
  const snapshots = new Map<string, Uint8Array>();
  return {
    snapshots,
    agents: new Map(),
    attached: new WeakSet(),
    server: new Server({
      quiet: true,
      onLoadDocument: async ({ documentName, document }) => {
        const snapshot = snapshots.get(documentName);
        if (!snapshot) return;
        // A hook that throws leaves the document half loaded in Hocuspocus (ueberdosis/hocuspocus#1156)
        try {
          Y.applyUpdate(document, snapshot);
        } catch (error) {
          console.error(`[studio] Could not load canvas ${documentName}, starting it empty`, error);
        }
      },
      onStoreDocument: async ({ documentName, document }) => {
        snapshots.set(documentName, Y.encodeStateAsUpdate(document));
      },
    }),
  };
};

/**
 * The collaboration server, shared (through globalThis) by the WebSocket upgrade handler and server code such
 * as MCP tools, which edit canvases as agents. Only the state is shared, so code changes apply without a restart.
 */
class StudioRuntime {
  constructor(private readonly state: RuntimeState) {}

  get server() {
    return this.state.server;
  }
  private get snapshots() {
    return this.state.snapshots;
  }
  private get agents() {
    return this.state.agents;
  }
  private get attached() {
    return this.state.attached;
  }

  /** Handle collaboration WebSocket upgrades on an HTTP server (the dev server, or the production server) */
  attach(httpServer: HttpServer) {
    if (this.attached.has(httpServer)) return;
    this.attached.add(httpServer);
    httpServer.on('upgrade', (request, socket, head) => {
      const { pathname } = new URL(request.url ?? '/', 'http://localhost');
      if (SOCKET_PATH_PATTERN.test(pathname)) this.server.httpServer.emit('upgrade', request, socket, head);
    });
  }

  exists(canvasId: string) {
    const name = canvasDocumentName(canvasId);
    return this.server.hocuspocus.documents.has(name) || this.snapshots.has(name);
  }

  /** Read or change a canvas as the server. Changes sync to everyone on it, like anyone else's. */
  async withCanvas<T>(canvasId: string, fn: (doc: Y.Doc) => T): Promise<T> {
    const connection = await this.server.hocuspocus.openDirectConnection(canvasDocumentName(canvasId));
    let result!: T;
    try {
      await connection.transact((doc) => {
        result = fn(doc);
      });
    } finally {
      await connection.disconnect({ unloadImmediately: false });
    }
    return result;
  }

  /**
   * Sync a view that can't use the WebSocket (see tool-sync): apply its changes and presence (everyone on the
   * WebSocket gets them live), and send back what it's missing and everyone else's presence.
   */
  async syncCanvas({ canvasId, clientId, stateVector, update, awareness }: SyncRequest): Promise<SyncResponse> {
    const name = canvasDocumentName(canvasId);
    const connection = await this.server.hocuspocus.openDirectConnection(name);
    let response!: SyncResponse;
    try {
      await connection.transact((doc) => {
        Y.applyUpdate(doc, fromBase64(update));
        response = {
          update: toBase64(Y.encodeStateAsUpdate(doc, fromBase64(stateVector))),
          stateVector: toBase64(Y.encodeStateVector(doc)),
        };
      });
      const document = this.server.hocuspocus.documents.get(name);
      if (document) {
        applyAwarenessUpdate(document.awareness, fromBase64(awareness), 'tool-sync');
        const others = [...document.awareness.getStates().keys()].filter((id) => id !== clientId);
        if (others.length) response.awareness = toBase64(encodeAwarenessUpdate(document.awareness, others));
      }
    } finally {
      await connection.disconnect({ unloadImmediately: false });
    }
    return response;
  }

  listCanvases(): CanvasSummary[] {
    const names = new Set([...this.server.hocuspocus.documents.keys(), ...this.snapshots.keys()]);
    return [...names].flatMap((name) => {
      const canvasId = canvasIdFromDocumentName(name);
      if (!canvasId) return [];
      const live = this.server.hocuspocus.documents.get(name);
      const doc = live ?? new Y.Doc();
      if (!live) Y.applyUpdate(doc, this.snapshots.get(name)!);
      const { nodes, edges, threads } = getCanvasMaps(doc);
      const meta = readMeta(doc);
      return [
        {
          canvasId,
          title: meta.title,
          createdAt: meta.createdAt,
          nodeCount: nodes.size,
          edgeCount: edges.size,
          openComments: Array.from(threads.values()).filter((thread) => !thread.get('resolved')).length,
          people: live ? this.peopleOn(canvasId) : [],
        },
      ];
    });
  }

  /** Names of the people and agents on a canvas right now */
  peopleOn(canvasId: string): string[] {
    const document = this.server.hocuspocus.documents.get(canvasDocumentName(canvasId));
    if (!document) return [];
    return Array.from(document.awareness.getStates().values())
      .map((state) => state.user?.name)
      .filter((name): name is string => !!name);
  }

  /** Where an agent's pointer was left on a canvas, so its next action carries on from there */
  getAgentPointer(canvasId: string, agent: AgentIdentity): XYPosition | null {
    const state = this.agents.get(`${canvasDocumentName(canvasId)}::${agent.name}`)?.awareness.getLocalState();
    return (state?.pointer as XYPosition | undefined) ?? null;
  }

  /**
   * Show an agent on a canvas like a person: in the list of who's here, with a pointer and selection.
   * Each agent gets its own awareness client, kept while it works and removed for everyone after.
   */
  setAgentPresence(canvasId: string, agent: AgentIdentity, presence: AgentPresence) {
    const name = canvasDocumentName(canvasId);
    const document = this.server.hocuspocus.documents.get(name);
    if (!document) return;

    const key = `${name}::${agent.name}`;
    const existing = this.agents.get(key);
    if (existing) clearTimeout(existing.expires);
    const awareness = existing?.awareness ?? new Awareness(new Y.Doc());
    awareness.setLocalState({ user: { ...agent, agent: true }, ...presence });
    applyAwarenessUpdate(document.awareness, encodeAwarenessUpdate(awareness, [awareness.clientID]), 'agent');

    const expires = setTimeout(() => {
      const current = this.server.hocuspocus.documents.get(name);
      if (current) removeAwarenessStates(current.awareness, [awareness.clientID], 'agent');
      awareness.destroy();
      this.agents.delete(key);
    }, AGENT_PRESENCE_TTL_MS);
    this.agents.set(key, { awareness, expires });
  }
}

const RUNTIME_KEY = Symbol.for('eventcatalog.studio.runtime');
const store = globalThis as typeof globalThis & { [RUNTIME_KEY]?: RuntimeState };

/** The process wide collaboration runtime (created on first use) */
export const getStudioRuntime = (): StudioRuntime => new StudioRuntime((store[RUNTIME_KEY] ??= createState()));

/** The runtime if the collaboration server is running in this process */
export const findStudioRuntime = (): StudioRuntime | undefined => {
  const state = store[RUNTIME_KEY];
  return state ? new StudioRuntime(state) : undefined;
};
