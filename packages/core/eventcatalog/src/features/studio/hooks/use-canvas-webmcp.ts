import { useEffect, useRef, useState } from 'react';
import { z } from 'zod';
import type * as Y from 'yjs';
import { initializeWebMCPPolyfill } from '@mcp-b/webmcp-polyfill';
import { replyToThread, setThreadResolved, type Author, CANVAS_STATUSES, setCanvasStatus } from '../canvas-doc';
import { CATALOG_COLLECTIONS } from '../node-types';
import {
  ADD_TO_CANVAS_DESCRIPTION,
  describeCanvas,
  edgeSpecsSchema,
  nodeSpecsSchema,
  type CatalogIndex,
} from '../canvas-actions';
import type { CatalogResource } from '../catalog-resources';
import {
  playAddToCanvas,
  playComment,
  playConnectAll,
  playRemove,
  playUpdateNode,
  type AgentPresence,
  type AgentStage,
} from '../agent-choreography';
import type { Peer, PresenceStore } from './presence-store';
import { BROWSER_AGENT_ORIGIN } from './use-studio-flow';

// The browser agent shows on the canvas (in this tab) while it works, and fades out a while after
const AGENT_PRESENCE_TTL_MS = 30_000;

/**
 * WebMCP: the canvas page offers its tools to AI agents in the browser (Chrome's built in agent,
 * ChatGPT desktop, the MCP-B extension, or desktop clients through the local relay), so an agent works
 * on the canvas the user has open, live for everyone on it. The same actions as the MCP tools.
 * https://webmachinelearning.github.io/webmcp/
 */

type ToolResult = { content: { type: 'text'; text: string }[]; isError?: boolean };
type ModelContextTool = {
  name: string;
  title?: string;
  description: string;
  inputSchema?: object;
  annotations?: { readOnlyHint?: boolean; consequentialHint?: boolean };
  execute: (input: unknown, options?: { signal?: AbortSignal }) => Promise<ToolResult>;
};
type ModelContext = { registerTool: (tool: ModelContextTool, options?: { signal?: AbortSignal }) => Promise<void> | void };

// The spec moved modelContext from navigator to document; older runtimes still have the navigator one
const getModelContext = () =>
  ((document as unknown as { modelContext?: ModelContext }).modelContext ??
    (navigator as unknown as { modelContext?: ModelContext }).modelContext) as ModelContext | undefined;

// Survives remounts, so a native WebMCP runtime is never shadowed by the polyfill
let usingPolyfill = false;

type CanvasTool<Input extends z.ZodType> = {
  name: string;
  title: string;
  description: string;
  input: Input;
  annotations?: ModelContextTool['annotations'];
  execute: (input: z.output<Input>) => unknown;
};

const defineTool = <Input extends z.ZodType>(tool: CanvasTool<Input>) => tool as unknown as CanvasTool<z.ZodType>;

const result = (value: unknown, isError = false): ToolResult => ({
  content: [{ type: 'text', text: JSON.stringify(value, null, 2) }],
  ...(isError && { isError }),
});

export type WebMcpStatus = { state: 'off' } | { state: 'on'; source: 'native' | 'polyfill'; tools: number; lastCall?: string };

type CanvasWebMcpOptions = {
  doc: Y.Doc | null;
  /** Where the agent shows up while it works (only in this tab: it acts through this tab's connection) */
  presence: PresenceStore | null;
  /** Who's on the canvas, read when an agent asks */
  getPeers: () => Peer[];
  resources: CatalogResource[];
  catalog: CatalogIndex;
  /** Who agents act as in the browser: the user's agent */
  agent: Author;
  select: (nodeIds: string[]) => void;
  fitView: (nodeIds?: string[]) => void;
  /** Lays the canvas out with the visualiser's layout */
  reorder: () => Promise<void>;
  /**
   * Whether to install the WebMCP polyfill when the browser has no WebMCP of its own. It's opt in: it watches
   * every change to the page (for declarative form tools), and a canvas changes on every drag and pan.
   */
  allowPolyfill: boolean;
};

export function useCanvasWebMcp(options: CanvasWebMcpOptions) {
  const [status, setStatus] = useState<WebMcpStatus>({ state: 'off' });
  const agentPointer = useRef<AgentPresence['pointer']>(null);
  const presenceTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  /** How the agent works on the canvas: played out like a person (see agent-choreography), shown in this tab */
  const stage = (): AgentStage | undefined => {
    const { doc } = latest.current;
    if (!doc) return undefined;
    return {
      // The agent's changes aren't the user's: their undo leaves them alone, as it does other people's and MCP agents'
      change: (fn) => doc.transact(() => fn(doc), BROWSER_AGENT_ORIGIN),
      present: (presence) => {
        const { agent, presence: store } = latest.current;
        agentPointer.current = presence.pointer;
        store?.setLocalAgent({ clientId: -1, name: agent.name, color: agent.color, agent: true, ...presence });
        clearTimeout(presenceTimer.current);
        presenceTimer.current = setTimeout(() => latest.current.presence?.setLocalAgent(null), AGENT_PRESENCE_TTL_MS);
      },
      lastPointer: agentPointer.current,
    };
  };
  const stageRef = useRef(stage);
  stageRef.current = stage;
  // Tools are registered once per canvas and read the latest state when they run
  const latest = useRef(options);
  latest.current = options;

  useEffect(() => {
    if (!options.doc) return;
    if (!getModelContext()) {
      if (!options.allowPolyfill) return;
      initializeWebMCPPolyfill();
      usingPolyfill = true;
    }
    const modelContext = getModelContext();
    if (!modelContext) return;

    const controller = new AbortController();
    const tools = createCanvasTools(
      () => latest.current,
      () => stageRef.current()
    );
    const onCall = (name: string) => setStatus((current) => (current.state === 'on' ? { ...current, lastCall: name } : current));

    void Promise.allSettled(
      tools.map((tool) =>
        modelContext.registerTool(
          {
            name: tool.name,
            title: tool.title,
            description: tool.description,
            inputSchema: z.toJSONSchema(tool.input, { io: 'input', unrepresentable: 'any' }),
            annotations: tool.annotations,
            execute: async (input) => {
              const parsed = tool.input.safeParse(input ?? {});
              if (!parsed.success) return result({ error: z.prettifyError(parsed.error) }, true);
              onCall(tool.name);
              try {
                const value = await tool.execute(parsed.data);
                return result(value, !!value && typeof value === 'object' && 'error' in value);
              } catch (error) {
                return result({ error: String((error as Error)?.message ?? error) }, true);
              }
            },
          },
          { signal: controller.signal }
        )
      )
    ).then((outcomes) => {
      if (controller.signal.aborted) return;
      // A tool that's already registered (e.g. after a hot reload) rejects, but is still there
      setStatus({ state: 'on', source: usingPolyfill ? 'polyfill' : 'native', tools: outcomes.length });
    });

    return () => {
      controller.abort();
      setStatus({ state: 'off' });
    };
  }, [options.doc, options.allowPolyfill]);

  useEffect(() => () => clearTimeout(presenceTimer.current), []);

  return status;
}

const NOT_CONNECTED = { error: 'The canvas is not connected yet' };

const createCanvasTools = (get: () => CanvasWebMcpOptions, getStage: () => AgentStage | undefined) => {
  const withDoc = <T>(fn: (doc: Y.Doc) => T) => {
    const { doc } = get();
    return doc ? doc.transact(() => fn(doc), BROWSER_AGENT_ORIGIN) : NOT_CONNECTED;
  };
  /** Show the user what the agent changed */
  const reveal = (nodeIds: string[]) => {
    if (!nodeIds.length) return;
    get().select(nodeIds);
    get().fitView(nodeIds);
  };

  return [
    defineTool({
      name: 'get_canvas',
      title: 'Read the canvas',
      description:
        'Reads the collaborative canvas open on this page: its nodes (ids, names, positions, the catalog resource they stand for), connections, comment threads, and who is on it. Call it first, and again to see what people changed.',
      input: z.object({}),
      annotations: { readOnlyHint: true },
      execute: () =>
        withDoc((doc) => ({
          ...describeCanvas(doc),
          people: get()
            .getPeers()
            .map((peer) => `${peer.name}${peer.agent ? ' (agent)' : ''}`),
        })),
    }),
    defineTool({
      name: 'search_catalog',
      title: 'Search the catalog',
      description:
        'Finds EventCatalog resources (domains, systems, services, events, commands, queries, channels, data stores) to add to the canvas with add_to_canvas.',
      input: z.object({
        query: z.string().optional().describe('Matches names and ids'),
        collection: z.enum(CATALOG_COLLECTIONS).optional(),
      }),
      annotations: { readOnlyHint: true },
      execute: ({ query, collection }) => {
        const term = query?.toLowerCase();
        return get()
          .resources.filter((resource) => !collection || resource.collection === collection)
          .filter((resource) => !term || `${resource.name} ${resource.id}`.toLowerCase().includes(term))
          .slice(0, 50)
          .map(({ collection, id, name, version, summary }) => ({ collection, id, name, version, summary }));
      },
    }),
    defineTool({
      name: 'add_to_canvas',
      title: 'Add to the canvas',
      description: `${ADD_TO_CANVAS_DESCRIPTION} Use search_catalog to find catalog resources first.`,
      input: z.object({ nodes: nodeSpecsSchema, edges: edgeSpecsSchema.optional() }),
      execute: async (input) => {
        const stage = getStage();
        if (!stage) return NOT_CONNECTED;
        const outcome = await playAddToCanvas(stage, input, get().catalog);
        reveal(outcome.created.map((node) => node.nodeId));
        return outcome;
      },
    }),
    defineTool({
      name: 'update_node',
      title: 'Update a node',
      description:
        'Renames, re-describes, re-versions or moves a node (x/y: its new centre). Catalog resources keep their catalog name, summary and version. For notes, summary is the note text.',
      input: z.object({
        nodeId: z.string(),
        name: z.string().optional(),
        summary: z.string().optional(),
        version: z.string().optional().describe('e.g. 1.0.0'),
        x: z.number().optional(),
        y: z.number().optional(),
      }),
      execute: async (input) => {
        const stage = getStage();
        return stage ? playUpdateNode(stage, input) : NOT_CONNECTED;
      },
    }),
    defineTool({
      name: 'connect_nodes',
      title: 'Connect nodes',
      description: 'Draws connections between nodes (by id). Labels default to EventCatalog wording, e.g. "publishes event".',
      input: z.object({ edges: edgeSpecsSchema.min(1) }),
      execute: async ({ edges }) => {
        const stage = getStage();
        return stage ? playConnectAll(stage, edges) : NOT_CONNECTED;
      },
    }),
    defineTool({
      name: 'remove_from_canvas',
      title: 'Remove from the canvas',
      description: 'Removes nodes (and their connections) or connections. Only remove what the user asked for.',
      input: z.object({ nodeIds: z.array(z.string()).optional(), connectionIds: z.array(z.string()).optional() }),
      annotations: { consequentialHint: true },
      execute: async ({ nodeIds = [], connectionIds = [] }) => {
        const stage = getStage();
        if (!stage) return NOT_CONNECTED;
        await playRemove(stage, nodeIds, connectionIds);
        return { removedNodes: nodeIds, removedConnections: connectionIds };
      },
    }),
    defineTool({
      name: 'layout_canvas',
      title: 'Tidy the canvas',
      description:
        "Lays the whole canvas out again with EventCatalog's visualiser layout (left to right, connections routed around nodes), for everyone on it. It moves everything, including what people placed themselves, so only use it when the user asks to tidy up: add_to_canvas already places what you add next to what it connects to.",
      input: z.object({}),
      execute: async () => {
        await get().reorder();
        return { laidOut: true };
      },
    }),
    defineTool({
      name: 'set_canvas_status',
      title: 'Set the canvas status',
      description:
        "Changes the canvas's status: draft (being worked on, where every canvas starts), proposed (ready for review), accepted (the agreed design) or rejected (decided against). Only change it when the user asks you to. Changing the nodes or connections on an accepted or rejected canvas makes it a draft again.",
      input: z.object({ status: z.enum(CANVAS_STATUSES), note: z.string().optional() }),
      execute: ({ status, note }) => withDoc((doc) => ({ status, changed: setCanvasStatus(doc, status, get().agent, note) })),
    }),
    defineTool({
      name: 'add_comment',
      title: 'Comment on the canvas',
      description:
        "Starts a comment thread pinned to a node (nodeId) or a spot (x, y). Only use it when the user asks you to comment (e.g. to review the canvas). Don't use comments to greet people or ask the user questions: talk to them in the conversation.",
      input: z.object({ text: z.string(), nodeId: z.string().optional(), x: z.number().optional(), y: z.number().optional() }),
      execute: async (input) => {
        const stage = getStage();
        return stage ? playComment(stage, input, get().agent) : NOT_CONNECTED;
      },
    }),
    defineTool({
      name: 'reply_to_comment',
      title: 'Reply to a comment',
      description: 'Replies to a comment thread (threadId from get_canvas).',
      input: z.object({ threadId: z.string(), text: z.string() }),
      execute: ({ threadId, text }) =>
        withDoc((doc) =>
          replyToThread(doc, threadId, text, get().agent) ? { threadId } : { error: `No comment thread "${threadId}"` }
        ),
    }),
    defineTool({
      name: 'resolve_comment',
      title: 'Resolve a comment',
      description: 'Resolves (or reopens) a comment thread.',
      input: z.object({ threadId: z.string(), resolved: z.boolean().default(true) }),
      execute: ({ threadId, resolved }) =>
        withDoc((doc) =>
          setThreadResolved(doc, threadId, resolved) ? { threadId, resolved } : { error: `No comment thread "${threadId}"` }
        ),
    }),
    defineTool({
      name: 'show_nodes',
      title: 'Show nodes to the user',
      description:
        'Selects nodes and moves the view to them, to point the user at something. Leave out nodeIds to show the whole canvas.',
      input: z.object({ nodeIds: z.array(z.string()).optional() }),
      annotations: { readOnlyHint: true },
      execute: ({ nodeIds }) => {
        if (nodeIds?.length) get().select(nodeIds);
        get().fitView(nodeIds);
        return { shown: nodeIds ?? 'everything' };
      },
    }),
  ];
};
