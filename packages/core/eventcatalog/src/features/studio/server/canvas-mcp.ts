import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type * as Y from 'yjs';
import { z } from 'zod';
import { buildUrl } from '@utils/url-builder';
import { appViewMeta, getMcpAppViewLoader, registerMcpApp } from '@features/mcp/mcp-apps';
import {
  CANVAS_CATALOG_TOOL,
  CANVAS_SYNC_TOOL,
  CANVAS_META_KEY,
  CANVAS_RESOURCE_URI,
  CANVAS_VIEW_TOOL,
  type CanvasPayload,
} from '@features/mcp/apps/canvas/shared';
import {
  CANVAS_STATUSES,
  getCanvasMaps,
  readCanvas,
  readMeta,
  reopeningIfEdited,
  replyToThread,
  setCanvasStatus,
  setThreadResolved,
  type Author,
} from '../canvas-doc';
import { ADD_TO_CANVAS_DESCRIPTION, describeCanvas, edgeSpecsSchema, indexCatalog, nodeSpecsSchema } from '../canvas-actions';
import { getCatalogResources } from '../catalog-resources';
import { getLayoutPositions } from '../layout';
import {
  playAddToCanvas,
  playComment,
  playConnectAll,
  playLayout,
  playOnNode,
  playRemove,
  playUpdateNode,
  type AgentStage,
} from '../agent-choreography';
import { STUDIO_SOCKET_PATH, findStudioRuntime, type AgentIdentity } from './runtime';
import { addToolIcons } from './tool-icons';

/**
 * MCP tools for the collaborative canvas: agents create canvases, join the ones people are on, and
 * add, connect, move and comment on things there, live, like anyone else on the canvas. openCanvas
 * also shows the canvas in the chat (MCP App), where the user works on it with everyone else.
 */

const loadCanvasView = getMcpAppViewLoader('canvas');

const AGENT_COLORS: Record<string, string> = { ChatGPT: '#10a37f', Claude: '#d97757' };

// The canvases entrypoint's icon (OpenAI MCP extensions: a 20x20, monochrome SVG in currentColor, 1.33px strokes)
const CANVAS_ICON_SVG =
  '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.33" stroke-linecap="round" stroke-linejoin="round"><rect x="2.5" y="3.5" width="5.5" height="4.5" rx="1"/><rect x="12" y="3.5" width="5.5" height="4.5" rx="1"/><rect x="12" y="12" width="5.5" height="4.5" rx="1"/><path d="M8 5.75h4M14.75 8v4"/></svg>';
const CANVAS_ICON = { src: `data:image/svg+xml;base64,${btoa(CANVAS_ICON_SVG)}`, mimeType: 'image/svg+xml', sizes: ['20x20'] };

/** Who the agent is, from what it tells us or its client's user agent */
const getAgent = (agentName: string | undefined, userAgent = ''): AgentIdentity => {
  const name =
    agentName?.trim() ||
    (/openai|chatgpt/i.test(userAgent) ? 'ChatGPT' : /claude|anthropic/i.test(userAgent) ? 'Claude' : 'AI agent');
  return { name, color: AGENT_COLORS[name] ?? '#8b5cf6' };
};

const text = (value: unknown, isError = false) => ({
  content: [{ type: 'text' as const, text: typeof value === 'string' ? value : JSON.stringify(value, null, 2) }],
  ...(isError && { isError }),
});

const canvasId = z.string().describe('The id of the canvas (from openCanvas, createCanvas, listCanvases or a /studio/<id> link)');
const agentName = z
  .string()
  .optional()
  .describe('Your name, as people on the canvas see it (e.g. "Claude"). Defaults to the name of your client.');

const readOnly = { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false } as const;
const writes = { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: false } as const;

/** Names of the canvas tools, for the MCP server's tool list */
export const CANVAS_TOOL_NAMES = [
  'openCanvas',
  'listCanvases',
  'createCanvas',
  'getCanvas',
  'addToCanvas',
  'updateCanvasNode',
  'connectCanvasNodes',
  'removeFromCanvas',
  'layoutCanvas',
  'setCanvasStatus',
  'commentOnCanvas',
  'replyToCanvasComment',
  'resolveCanvasComment',
];

type ToolContext = { catalogUrl: string; userAgent?: string };

export function registerCanvasTools(server: McpServer, { catalogUrl, userAgent }: ToolContext) {
  const runtime = findStudioRuntime();
  if (!runtime) return;

  const canvasUrl = (id: string) => `${catalogUrl}${buildUrl(`/studio/${id}`)}`;
  const socketUrl = `${catalogUrl.replace(/^http/, 'ws')}${buildUrl(STUDIO_SOCKET_PATH, true)}`;
  const missing = (id: string) =>
    text({ error: `No canvas "${id}". Use listCanvases to find one, or openCanvas to start one.` }, true);

  const createCanvas = (title: string, name?: string) =>
    runtime.createCanvas({ title, createdBy: getAgent(name, userAgent).name });

  /**
   * Work on a canvas as an agent: changes are played out like a person would make them (see agent-choreography),
   * with the agent's pointer, selection and what it's doing shown to everyone on the canvas.
   */
  const asAgent = (id: string, name: string | undefined) => {
    const agent = getAgent(name, userAgent);
    const author = { ...agent, agent: true } as Author;
    const stage: AgentStage = {
      // An agent changing an accepted (or rejected) canvas makes it a draft again, like a person doing it
      change: (fn) => runtime.withCanvas(id, (doc) => reopeningIfEdited(doc, author, () => fn(doc))),
      present: (presence) => runtime.setAgentPresence(id, agent, presence),
      lastPointer: runtime.getAgentPointer(id, agent),
      sharesMoves: true,
    };
    return { stage, author };
  };

  // ---- The canvas in the chat (MCP App) ----

  registerMcpApp(server, {
    loadView: loadCanvasView,
    resource: {
      name: 'EventCatalog canvas',
      uri: CANVAS_RESOURCE_URI,
      description: 'A live, collaborative EventCatalog canvas, shown by MCP hosts that support MCP Apps',
      // The view joins the canvas over the collaboration WebSocket, and shows icons served by this EventCatalog
      csp: { connectDomains: [new URL(socketUrl).origin, catalogUrl], resourceDomains: [catalogUrl] },
      displayModes: { preferred: 'fullscreen', available: ['inline', 'fullscreen'] },
    },
    metaKey: CANVAS_META_KEY,
    tool: {
      name: 'openCanvas',
      // Also the name of the entrypoints in ChatGPT's sidebar and thread tabs (it differs from the plugin's name)
      title: 'Canvases',
      description: [
        'Shows the user a collaborative canvas right here in the chat, live: they can drag in catalog resources, connect them and comment, together with anyone else on it (in EventCatalog or another chat) and with you through the canvas tools.',
        'Pass canvasId to open an existing canvas (e.g. one the user shared a /studio/<id> link to), or a title to start a new one. With neither, it shows the user the canvases to pick one or start one.',
        'Use it when the user wants to design, sketch, map out or brainstorm architecture with you, or to see a canvas.',
      ].join(' '),
      // ChatGPT entrypoints (OpenAI MCP extensions): people can open canvases from the sidebar or as a tab in a
      // thread, which calls the tool with {} (the list of canvases)
      meta: { 'openai/ui': { entrypoints: [{ type: 'global' }, { type: 'thread' }] } },
      input: {
        canvasId: canvasId.optional(),
        title: z.string().optional().describe('For a new canvas: what it is for'),
        userName: z
          .string()
          .optional()
          .describe(
            'The name of the person you are working with, if you know it: others on the canvas see them by this name. Leave it out if you do not know it.'
          ),
        agentName,
      },
    },
    viewTool: {
      name: CANVAS_VIEW_TOOL,
      title: 'Load a canvas for the canvas view',
      description:
        'Loads what the canvas view needs to join a canvas (or, without a canvasId, the list of canvases). To show the user a canvas, use openCanvas instead.',
      input: { canvasId: canvasId.optional() },
    },
    annotations: writes,
    errorMessage: 'Failed to open the canvas',
    load: async (params) => {
      const { title: newTitle, agentName: name, userName } = params as { title?: string; agentName?: string; userName?: string };

      // Opened without a canvas (e.g. from an entrypoint): the canvases to pick from, or start one
      if (!params.canvasId && !newTitle) {
        const canvases = runtime
          .listCanvases()
          .sort((a, b) => (b.createdAt ?? 0) - (a.createdAt ?? 0))
          .map(({ canvasId: id, title, status, people, nodeCount, openComments }) => ({
            canvasId: id,
            title,
            status,
            people,
            nodeCount,
            openComments,
          }));
        const home: CanvasPayload = { view: 'home', canvases };
        return {
          forModel: {
            canvases: canvases.map((canvas) => ({ ...canvas, url: canvasUrl(canvas.canvasId) })),
            note: 'Clients that support MCP Apps are showing the user these canvases to pick one or start one. Otherwise, list them for the user.',
          },
          label: 'the canvases',
          getPayload: async (): Promise<CanvasPayload> => home,
        };
      }

      const id = params.canvasId ?? (await createCanvas(newTitle ?? 'Untitled canvas', name));
      if (!runtime.exists(id))
        return { error: `No canvas "${id}". Use listCanvases to find one, or open a new one without a canvasId.` };
      const { title } = await runtime.withCanvas(id, readMeta);
      const payload: CanvasPayload = {
        view: 'canvas',
        canvasId: id,
        title,
        socketUrl,
        canvasUrl: canvasUrl(id),
        mcpUrl: `${catalogUrl}${buildUrl('/docs/mcp', true)}`,
        userName,
      };
      return {
        forModel: {
          canvasId: id,
          title,
          url: canvasUrl(id),
          people: runtime.peopleOn(id),
          note: 'Clients that support MCP Apps are showing the user this canvas, live. Work on it with them using the canvas tools (getCanvas, addToCanvas...): they see your changes as you make them. Talk with them in the conversation, not in canvas comments (only comment when they ask you to). Otherwise, share the url so they can open it.',
        },
        label: `the canvas ${title ?? id}`,
        getPayload: async (): Promise<CanvasPayload> => payload,
      };
    },
  });

  // The view loads the catalog separately, so the canvas opens fast and tool results stay small
  server.registerTool(
    CANVAS_CATALOG_TOOL,
    {
      title: 'Load the catalog for the canvas view',
      description: 'Loads the catalog resources the canvas view lets people drag onto a canvas.',
      inputSchema: z.object({}),
      annotations: readOnly,
      _meta: appViewMeta(CANVAS_RESOURCE_URI, ['app']),
    },
    async () => {
      const catalog = await getCatalogResources();
      return {
        content: [{ type: 'text' as const, text: `Loaded ${catalog.resources.length} catalog resources` }],
        structuredContent: catalog,
      };
    }
  );

  // The view syncs through this when the chat's sandbox won't let it open the collaboration WebSocket
  server.registerTool(
    CANVAS_SYNC_TOOL,
    {
      title: 'Sync the canvas view',
      description:
        'Exchanges changes and presence between the canvas view and the canvas, when the view cannot use the WebSocket.',
      inputSchema: z.object({
        canvasId,
        clientId: z.number(),
        stateVector: z.string(),
        update: z.string(),
        awareness: z.string(),
      }),
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true, openWorldHint: false },
      _meta: appViewMeta(CANVAS_RESOURCE_URI, ['app']),
    },
    async (request) => {
      if (!runtime.exists(request.canvasId)) return missing(request.canvasId);
      const response = await runtime.syncCanvas(request);
      return { content: [{ type: 'text' as const, text: 'Synced' }], structuredContent: response };
    }
  );

  // ---- Working on canvases ----

  server.registerTool(
    'listCanvases',
    {
      title: 'List canvases',
      description:
        'Lists the collaborative canvases on this EventCatalog: shared, live design boards where people and agents map out architecture and ideas together. Shows who is on each one right now.',
      inputSchema: z.object({}),
      annotations: readOnly,
    },
    async () => text({ canvases: runtime.listCanvases().map((canvas) => ({ ...canvas, url: canvasUrl(canvas.canvasId) })) })
  );

  server.registerTool(
    'createCanvas',
    {
      title: 'Create a canvas',
      description:
        'Creates a new collaborative canvas and returns its link, without showing it. Prefer openCanvas, which also shows it to the user in the chat. Share the link so people can join you on it.',
      inputSchema: z.object({ title: z.string().describe('What the canvas is for, e.g. "Payments redesign"'), agentName }),
      annotations: writes,
    },
    async ({ title, agentName: name }) => {
      const id = await createCanvas(title, name);
      return text({ canvasId: id, url: canvasUrl(id), title });
    }
  );

  server.registerTool(
    'getCanvas',
    {
      title: 'Read a canvas',
      description:
        'Reads everything on a canvas: its nodes (with ids, names, positions (their centres), sizes and the catalog resource they stand for), the connections between them, the comment threads, and who is on it right now. Read it before changing a canvas, and again to see what people have changed.',
      inputSchema: z.object({ canvasId }),
      annotations: readOnly,
    },
    async ({ canvasId: id }) => {
      if (!runtime.exists(id)) return missing(id);
      const canvas = await runtime.withCanvas(id, describeCanvas);
      return text({ canvasId: id, url: canvasUrl(id), people: runtime.peopleOn(id), ...canvas });
    }
  );

  server.registerTool(
    'setCanvasStatus',
    {
      title: 'Set a canvas status',
      description: [
        "Changes a canvas's status: draft (being worked on, where every canvas starts), proposed (ready for review), accepted (the agreed design) or rejected (decided against).",
        'Only change it when the user asks you to. Changing the nodes or connections on an accepted or rejected canvas makes it a draft again.',
      ].join(' '),
      inputSchema: z.object({
        canvasId,
        status: z.enum(CANVAS_STATUSES),
        note: z.string().optional().describe('Why, e.g. "Agreed in the architecture review"'),
        agentName,
      }),
      annotations: writes,
    },
    async ({ canvasId: id, status, note, agentName: name }) => {
      if (!runtime.exists(id)) return missing(id);
      const { author } = asAgent(id, name);
      const changed = await runtime.withCanvas(id, (doc) => setCanvasStatus(doc, status, author, note));
      return text({ canvasId: id, status, ...(!changed && { note: `The canvas was already ${status}` }) });
    }
  );

  server.registerTool(
    'addToCanvas',
    {
      title: 'Add to a canvas',
      description: `${ADD_TO_CANVAS_DESCRIPTION} People on the canvas watch you add them one by one, like a person would. Use getResources to find catalog resources first.`,
      inputSchema: z.object({ canvasId, nodes: nodeSpecsSchema, edges: edgeSpecsSchema.optional(), agentName }),
      annotations: writes,
    },
    async ({ canvasId: id, nodes, edges, agentName: name }) => {
      if (!runtime.exists(id)) return missing(id);
      const { resources, relations } = await getCatalogResources();
      const result = await playAddToCanvas(asAgent(id, name).stage, { nodes, edges }, indexCatalog(resources, relations));
      return text(result, result.created.length === 0 && result.errors.length > 0);
    }
  );

  server.registerTool(
    'updateCanvasNode',
    {
      title: 'Update a node on a canvas',
      description:
        'Renames, re-describes, re-versions or moves a node on a canvas (x/y: its new centre). Catalog resources keep their catalog name, summary and version; change those in the catalog. For notes, summary is the note text.',
      inputSchema: z.object({
        canvasId,
        nodeId: z.string(),
        name: z.string().optional(),
        summary: z.string().optional(),
        version: z.string().optional().describe('e.g. 1.0.0'),
        x: z.number().optional(),
        y: z.number().optional(),
        agentName,
      }),
      annotations: writes,
    },
    async ({ canvasId: id, agentName: name, ...update }) => {
      if (!runtime.exists(id)) return missing(id);
      const result = await playUpdateNode(asAgent(id, name).stage, update);
      return text(result, 'error' in result);
    }
  );

  server.registerTool(
    'connectCanvasNodes',
    {
      title: 'Connect nodes on a canvas',
      description:
        'Draws connections between nodes on a canvas, one at a time like a person dragging them. Labels default to EventCatalog wording (e.g. "publishes event", "sent to").',
      inputSchema: z.object({ canvasId, edges: edgeSpecsSchema.min(1), agentName }),
      annotations: writes,
    },
    async ({ canvasId: id, edges, agentName: name }) => {
      if (!runtime.exists(id)) return missing(id);
      const result = await playConnectAll(asAgent(id, name).stage, edges);
      return text(result, result.connections.length === 0);
    }
  );

  server.registerTool(
    'removeFromCanvas',
    {
      title: 'Remove from a canvas',
      description:
        'Removes nodes (and their connections) or connections from a canvas. Comments on removed nodes stay on the canvas. Only remove what the user asked for or what you added.',
      inputSchema: z.object({
        canvasId,
        nodeIds: z.array(z.string()).optional(),
        connectionIds: z.array(z.string()).optional(),
        agentName,
      }),
      annotations: { readOnlyHint: false, destructiveHint: true, idempotentHint: true, openWorldHint: false },
    },
    async ({ canvasId: id, nodeIds = [], connectionIds = [], agentName: name }) => {
      if (!runtime.exists(id)) return missing(id);
      await playRemove(asAgent(id, name).stage, nodeIds, connectionIds);
      return text({ removedNodes: nodeIds, removedConnections: connectionIds });
    }
  );

  server.registerTool(
    'layoutCanvas',
    {
      title: 'Tidy a canvas',
      description:
        "Lays the whole canvas out again with EventCatalog's visualiser layout (left to right, connections routed around nodes); everyone on it sees the nodes glide into place. It moves everything, including what people placed themselves, so only use it when the user asks to tidy up: addToCanvas already places what you add next to what it connects to.",
      inputSchema: z.object({ canvasId, agentName }),
      annotations: writes,
    },
    async ({ canvasId: id, agentName: name }) => {
      if (!runtime.exists(id)) return missing(id);
      const { nodes, edges } = await runtime.withCanvas(id, readCanvas);
      const positions = await getLayoutPositions(nodes, edges);
      await playLayout(asAgent(id, name).stage, positions);
      return text({ laidOut: positions.nodes.size });
    }
  );

  server.registerTool(
    'commentOnCanvas',
    {
      title: 'Comment on a canvas',
      description:
        "Starts a comment thread on a canvas, pinned to a node (nodeId) or a spot (x, y). Only use it when the user asks you to comment (e.g. to review the canvas or leave notes for others on it). Don't use comments to greet people, introduce yourself or ask the user questions: talk to them in the conversation.",
      inputSchema: z.object({
        canvasId,
        text: z.string(),
        nodeId: z.string().optional(),
        x: z.number().optional(),
        y: z.number().optional(),
        agentName,
      }),
      annotations: writes,
    },
    async ({ canvasId: id, agentName: name, ...comment }) => {
      if (!runtime.exists(id)) return missing(id);
      const { stage, author } = asAgent(id, name);
      const result = await playComment(stage, comment, author);
      return 'error' in result ? text(result, true) : text(result);
    }
  );

  /** For replies and resolving: point at the thread's node (if it's on one) while doing it */
  const onThread = async <T>(
    id: string,
    name: string | undefined,
    threadId: string,
    activity: string,
    change: (doc: Y.Doc, author: Author) => T
  ) => {
    const { stage, author } = asAgent(id, name);
    const nodeId = await runtime.withCanvas(
      id,
      (doc) => getCanvasMaps(doc).threads.get(threadId)?.get('nodeId') as string | undefined
    );
    return nodeId
      ? playOnNode(stage, nodeId, activity, (doc) => change(doc, author))
      : stage.change((doc) => change(doc, author));
  };

  server.registerTool(
    'replyToCanvasComment',
    {
      title: 'Reply to a comment',
      description: 'Replies to a comment thread on a canvas (threadId from getCanvas).',
      inputSchema: z.object({ canvasId, threadId: z.string(), text: z.string(), agentName }),
      annotations: writes,
    },
    async ({ canvasId: id, threadId, text: message, agentName: name }) => {
      if (!runtime.exists(id)) return missing(id);
      const replied = await onThread(id, name, threadId, 'Replying to a comment', (doc, author) =>
        replyToThread(doc, threadId, message, author)
      );
      return replied ? text({ threadId }) : text({ error: `No comment thread "${threadId}"` }, true);
    }
  );

  server.registerTool(
    'resolveCanvasComment',
    {
      title: 'Resolve a comment',
      description: 'Resolves (or reopens) a comment thread on a canvas once it has been dealt with.',
      inputSchema: z.object({ canvasId, threadId: z.string(), resolved: z.boolean().default(true), agentName }),
      annotations: writes,
    },
    async ({ canvasId: id, threadId, resolved, agentName: name }) => {
      if (!runtime.exists(id)) return missing(id);
      const activity = resolved ? 'Resolving a comment' : 'Reopening a comment';
      const found = await onThread(id, name, threadId, activity, (doc) => setThreadResolved(doc, threadId, resolved));
      return found ? text({ threadId, resolved }) : text({ error: `No comment thread "${threadId}"` }, true);
    }
  );

  addToolIcons(server, { openCanvas: [CANVAS_ICON] });
}
