import type { Server as HttpServer } from 'node:http';
import { Server } from '@hocuspocus/server';
import * as Y from 'yjs';
import { Awareness, applyAwarenessUpdate, encodeAwarenessUpdate, removeAwarenessStates } from 'y-protocols/awareness';
import type { XYPosition } from '@xyflow/react';
import type { AgentPresence } from '../agent-choreography';
import {
  CANVAS_DELETED_REASON,
  addCanvasContent,
  canvasDocumentName,
  canvasIdFromDocumentName,
  getCanvasMaps,
  readMeta,
  setMeta,
  getCanvasStatus,
  type CanvasContent,
  type CanvasStatus,
} from '../canvas-doc';
import { getCanvasPreview, type CanvasPreview } from '../canvas-preview';
import { MAX_TITLE_LENGTH } from '../limits';
import { fromBase64, toBase64, type SyncRequest, type SyncResponse } from '../tool-sync';
import config from '../../../utils/eventcatalog-config/source';
import { isAuthEnabled } from '../../../utils/feature';
import { createStorage, memoryStorage, type CanvasStorage } from './storage';
import type { StorageConfig } from '../../storage/database';
import { isDatabaseTooNew } from '../../storage/migrations';

export const STUDIO_SOCKET_PATH = '/_eventcatalog/studio';
const SOCKET_PATH_PATTERN = /\/_eventcatalog\/studio\/?$/;
// Agents show as present while they work, and leave a while after their last change (before awareness's own
// 30 second timeout would drop them anyway)
const AGENT_PRESENCE_TTL_MS = 25_000;
// Application close codes are 4000-4999
const CANVAS_DELETED_CLOSE_CODE = 4410;

export type AgentIdentity = { name: string; color: string };
export type CanvasSummary = {
  canvasId: string;
  title?: string;
  status: CanvasStatus;
  createdAt?: number;
  /** Who started it (a person, or an agent) */
  createdBy?: string;
  /** When anyone (a person, or an agent) last changed it */
  updatedAt?: number;
  nodeCount: number;
  edgeCount: number;
  openComments: number;
  people: string[];
  /** The canvas drawn small (asked for with `withPreview`, e.g. for the canvases page) */
  preview?: CanvasPreview | null;
};

/**
 * What the collaboration server keeps for the life of the process: one Hocuspocus instance, and every canvas's
 * latest snapshot in memory (read from storage when the server starts, and written through to it each time a
 * canvas is stored), so listing canvases and opening one never wait on storage.
 */
type RuntimeState = {
  server: Server;
  snapshots: Map<string, Uint8Array>;
  /** When each canvas last changed (kept with it in storage) */
  updatedAt: Map<string, number>;
  /** Canvases deleted (by document name): refused from then on, so a browser still holding one can't bring it back */
  deleted: Set<string>;
  agents: Map<string, { awareness: Awareness; expires: ReturnType<typeof setTimeout> }>;
  attached: WeakSet<HttpServer>;
  storage: CanvasStorage;
  /** The storage config in use (to tell when it changes) */
  storageKey?: string;
  /** Settles once the stored canvases are in `snapshots` */
  ready: Promise<void>;
  /** Studio started (by startStudio): its storage loaded */
  started?: Promise<void>;
  savesOnExit: boolean;
  /**
   * Whether a collaboration connection comes from someone signed in, when sign-in is on. Given by the pages
   * (see startStudio): Auth.js's config only loads in the app, not in the dev server's integration.
   */
  isSignedIn?: (request: Request) => Promise<boolean>;
};

const createState = (): RuntimeState => {
  const state: RuntimeState = {
    snapshots: new Map(),
    updatedAt: new Map(),
    deleted: new Set(),
    agents: new Map(),
    attached: new WeakSet(),
    storage: memoryStorage(),
    ready: Promise.resolve(),
    savesOnExit: false,
    server: new Server({
      quiet: true,
      // With sign-in on, only signed-in people can open a canvas (refused until the pages have said how to check)
      onConnect: async ({ request, documentName }) => {
        if (isAuthEnabled() && !(await state.isSignedIn?.(request).catch(() => false))) {
          throw new Error('Sign in to open this canvas');
        }
        if (state.deleted.has(documentName)) {
          throw Object.assign(new Error('This canvas was deleted'), { reason: CANVAS_DELETED_REASON });
        }
      },
      onLoadDocument: async ({ documentName, document }) => {
        // A hook that throws leaves the document half loaded in Hocuspocus (ueberdosis/hocuspocus#1156)
        try {
          await state.ready;
          const snapshot = state.snapshots.get(documentName);
          if (snapshot) Y.applyUpdate(document, snapshot);
        } catch (error) {
          console.error(`[studio] Could not load canvas ${documentName}, starting it empty`, error);
        }
      },
      // Changes only: Hocuspocus starts listening once a canvas has loaded
      onChange: async ({ documentName }) => {
        state.updatedAt.set(documentName, Date.now());
      },
      onStoreDocument: async ({ documentName, document }) => saveSnapshot(state, documentName, document),
    }),
  };
  return state;
};

/** A canvas just started: its title, and when and by whom (a person, or an agent) */
const setStarted = (doc: Y.Doc, { title, createdBy }: { title?: string; createdBy?: string }) =>
  setMeta(doc, { ...(title && { title }), createdAt: Date.now(), ...(createdBy && { createdBy }) });

/** Nothing on it, no title, and nobody on it */
const isBlank = (canvas: CanvasSummary) =>
  canvas.nodeCount === 0 && canvas.openComments === 0 && !canvas.title && canvas.people.length === 0;

/** Keeps a canvas's snapshot, and writes it to storage (failing to store it doesn't lose it from memory) */
const saveSnapshot = (state: RuntimeState, documentName: string, document: Y.Doc) => {
  // Deleted while it was still open (e.g. waiting to be stored)
  if (state.deleted.has(documentName)) return;
  const snapshot = Y.encodeStateAsUpdate(document);
  state.snapshots.set(documentName, snapshot);
  try {
    state.storage.save(documentName, snapshot, state.updatedAt.get(documentName));
  } catch (error) {
    console.error(`[studio] Could not store canvas ${documentName} (${state.storage.type} storage)`, error);
  }
};

/**
 * The collaboration server, shared (through globalThis) by the WebSocket upgrade handler and server code such
 * as MCP tools, which edit canvases as agents. Only the state is shared, so code changes apply without a restart.
 */
export class StudioRuntime {
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

  /** Where canvases are kept (memory: until the server restarts) */
  get storage(): Pick<CanvasStorage, 'type' | 'location'> {
    const { type, location } = this.state.storage;
    return { type, location };
  }

  /**
   * Keeps canvases in the storage configured (the catalog's `storage`, memory by default), and loads the ones
   * stored there. Set once when the server starts; calling it again with the same config does nothing.
   */
  async useStorage(config: StorageConfig | undefined, projectDirectory: string) {
    const key = JSON.stringify({ config: config ?? null, projectDirectory });
    if (this.state.storageKey === key) return this.state.ready;
    const storage = createStorage(config, projectDirectory);
    this.state.storageKey = key;
    this.state.storage = storage;
    this.state.ready = storage.loadAll().then(({ canvases, deleted }) => {
      deleted.forEach((name) => this.state.deleted.add(name));
      // Canvases already open here (e.g. the dev server reloading) are kept as they are
      canvases.forEach(({ state, updatedAt }, name) => {
        if (this.snapshots.has(name) || this.state.deleted.has(name)) return;
        this.snapshots.set(name, state);
        if (updatedAt) this.state.updatedAt.set(name, updatedAt);
      });
    });
    this.saveOnExit();
    return this.state.ready;
  }

  /**
   * Starts Studio once: canvases kept in the storage configured (in memory if it can't be used), and in production the
   * collaboration connection on the server `eventcatalog start` runs (the dev server's integration attaches it there).
   */
  start() {
    this.state.started ??= (async () => {
      const projectDirectory = process.env.PROJECT_DIR || process.cwd();
      try {
        await this.useStorage(config.storage, projectDirectory);
      } catch (error) {
        // Not kept in memory instead: everyone's changes would quietly stop being saved
        if (isDatabaseTooNew(error)) {
          console.error(`[studio] Studio isn't available: ${(error as Error).message}`);
          throw error;
        }
        console.error(
          `[studio] Could not use the Studio storage configured, keeping canvases in memory: ${(error as Error).message}`
        );
        await this.useStorage({ type: 'memory' }, projectDirectory);
      }
      const httpServer = (globalThis as Record<symbol, unknown>)[HTTP_SERVER_KEY] as HttpServer | undefined;
      if (httpServer && !this.attached.has(httpServer)) {
        this.attach(httpServer);
        const { type, location } = this.storage;
        console.log(
          type === 'memory'
            ? `[studio] Collaboration server ready at ${STUDIO_SOCKET_PATH}. Canvases are kept in memory and lost when the server restarts or redeploys: set storage in eventcatalog.config.js to keep them.`
            : `[studio] Collaboration server ready at ${STUDIO_SOCKET_PATH} (canvases stored in ${location})`
        );
      }
    })();
    return this.state.started;
  }

  /**
   * Canvases change a moment before they're stored (Hocuspocus waits for edits to settle): as the process exits,
   * the open ones are stored straight away so the last edits aren't lost. Storage writes are synchronous for this.
   */
  private saveOnExit() {
    if (this.state.savesOnExit) return;
    this.state.savesOnExit = true;
    const saveOpenCanvases = () =>
      this.server.hocuspocus.documents.forEach((document, name) => {
        saveSnapshot(this.state, name, document);
      });
    process.once('exit', saveOpenCanvases);
    for (const signal of ['SIGINT', 'SIGTERM'] as const) {
      process.once(signal, () => {
        saveOpenCanvases();
        // Stopping as it would have without this (unless something else handles the signal)
        if (process.listenerCount(signal) === 0) process.kill(process.pid, signal);
      });
    }
  }

  /** How to tell whether a collaboration connection comes from someone signed in (checked when sign-in is on) */
  useSignIn(isSignedIn: (request: Request) => Promise<boolean>) {
    this.state.isSignedIn = isSignedIn;
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
    return !this.state.deleted.has(name) && (this.server.hocuspocus.documents.has(name) || this.snapshots.has(name));
  }

  isDeleted(canvasId: string) {
    return this.state.deleted.has(canvasDocumentName(canvasId));
  }

  /**
   * Deletes a canvas for everyone: from storage, and from the browsers that have it open (they're disconnected, told
   * why, and refused from then on, so their copy can't bring it back). Returns false if there's no such canvas.
   * Throws if storage can't delete it, leaving it as it was.
   */
  deleteCanvas(canvasId: string) {
    if (!this.exists(canvasId)) return false;
    const name = canvasDocumentName(canvasId);
    this.state.storage.remove(name);
    this.state.deleted.add(name);
    this.snapshots.delete(name);
    this.state.updatedAt.delete(name);
    this.agents.forEach(({ awareness, expires }, key) => {
      if (!key.startsWith(`${name}::`)) return;
      clearTimeout(expires);
      awareness.destroy();
      this.agents.delete(key);
    });
    const { hocuspocus } = this.server;
    const document = hocuspocus.documents.get(name);
    if (document) {
      // Told why, so they can say so (Hocuspocus's closeConnections only says it reset them)
      document.connections.forEach((_clients, connection) =>
        connection.close({ code: CANVAS_DELETED_CLOSE_CODE, reason: CANVAS_DELETED_REASON })
      );
      // Unloaded now, or once it's done storing (which skips deleted canvases)
      void hocuspocus.unloadDocument(document);
    }
    return true;
  }

  /**
   * Starts a canvas with a title, recording when and by whom (a person, or an agent), and what's on it to begin
   * with, if anything. Returns its id.
   */
  async createCanvas(started: { title?: string; createdBy?: string }, content?: CanvasContent) {
    const canvasId = crypto.randomUUID();
    await this.withCanvas(canvasId, (doc) => {
      setStarted(doc, started);
      if (content) addCanvasContent(doc, content);
    });
    return canvasId;
  }

  /**
   * Makes a copy of a canvas's design (its nodes and connections, not its comments or status) as a new draft, called
   * "Copy of" the original unless given a title. Returns the copy's id, or undefined if there's no such canvas.
   */
  async copyCanvas(canvasId: string, { title, createdBy }: { title?: string; createdBy?: string } = {}) {
    if (!this.exists(canvasId)) return undefined;
    const original = await this.withCanvas(canvasId, (doc) => {
      const { nodes, edges } = getCanvasMaps(doc);
      return { title: readMeta(doc).title, nodes: [...nodes.entries()], edges: [...edges.entries()] };
    });
    const copyId = crypto.randomUUID();
    await this.withCanvas(copyId, (doc) => {
      const { nodes, edges } = getCanvasMaps(doc);
      setStarted(doc, { title: title ?? `Copy of ${original.title ?? 'Untitled canvas'}`.slice(0, MAX_TITLE_LENGTH), createdBy });
      original.nodes.forEach(([id, node]) => nodes.set(id, structuredClone(node)));
      original.edges.forEach(([id, edge]) => edges.set(id, structuredClone(edge)));
    });
    return copyId;
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

  /**
   * The canvases, the most recently changed first. Ones started and left empty (e.g. a made-up link opened, then left)
   * aren't listed: they can still be opened by their link.
   */
  listCanvases({ withPreview = false }: { withPreview?: boolean } = {}): CanvasSummary[] {
    const names = new Set([...this.server.hocuspocus.documents.keys(), ...this.snapshots.keys()]);
    return [...names]
      .flatMap((name) => {
        const canvasId = canvasIdFromDocumentName(name);
        return canvasId && this.exists(canvasId) ? [this.summarize(canvasId, { withPreview })] : [];
      })
      .filter((canvas) => !isBlank(canvas))
      .sort((a, b) => (b.updatedAt ?? 0) - (a.updatedAt ?? 0));
  }

  /** One canvas, as listed (undefined if there's no such canvas) */
  getCanvas(canvasId: string): CanvasSummary | undefined {
    return this.exists(canvasId) ? this.summarize(canvasId) : undefined;
  }

  private summarize(canvasId: string, { withPreview = false }: { withPreview?: boolean } = {}): CanvasSummary {
    const name = canvasDocumentName(canvasId);
    const live = this.server.hocuspocus.documents.get(name);
    const doc = live ?? new Y.Doc();
    if (!live) Y.applyUpdate(doc, this.snapshots.get(name)!);
    const { nodes, edges, threads } = getCanvasMaps(doc);
    const meta = readMeta(doc);
    return {
      canvasId,
      title: meta.title,
      status: getCanvasStatus(meta),
      createdAt: meta.createdAt,
      ...(meta.createdBy && { createdBy: meta.createdBy }),
      updatedAt: this.state.updatedAt.get(name) ?? meta.createdAt,
      nodeCount: nodes.size,
      edgeCount: edges.size,
      openComments: Array.from(threads.values()).filter((thread) => !thread.get('resolved')).length,
      people: live ? this.peopleOn(canvasId) : [],
      ...(withPreview && { preview: getCanvasPreview(Array.from(nodes.values()), Array.from(edges.values())) }),
    };
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

/**
 * State kept from before a code change (the dev server reloads code but keeps globalThis) gets what's been added to it
 * since. Hooks given to Hocuspocus when it was created (e.g. onChange, onConnect) only change on a restart.
 */
const upgrade = (state: RuntimeState) => {
  state.updatedAt ??= new Map();
  state.deleted ??= new Set();
  return state;
};

/** The process wide collaboration runtime (created on first use) */
export const getStudioRuntime = (): StudioRuntime => new StudioRuntime(upgrade((store[RUNTIME_KEY] ??= createState())));

/**
 * In production, `eventcatalog start` leaves the HTTP server it runs here, so Studio's collaboration connection can be
 * served on it (Astro's Node adapter doesn't expose it otherwise)
 */
const HTTP_SERVER_KEY = Symbol.for('eventcatalog.http-server');

/**
 * Studio, started: what pages and tools use before working with canvases. Pages say how to tell who's signed in,
 * for the collaboration connection.
 */
export const startStudio = async ({ isSignedIn }: { isSignedIn?: (request: Request) => Promise<boolean> } = {}) => {
  const runtime = getStudioRuntime();
  if (isSignedIn) runtime.useSignIn(isSignedIn);
  await runtime.start();
  return runtime;
};

/** The runtime if the collaboration server is running in this process */
export const findStudioRuntime = (): StudioRuntime | undefined => {
  const state = store[RUNTIME_KEY];
  return state ? new StudioRuntime(upgrade(state)) : undefined;
};
