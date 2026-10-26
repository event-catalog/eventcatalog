import { tool } from 'ai';
import { z } from 'zod';
import { getCanvasMaps, getLayoutPositions, readCanvas } from '@eventcatalog/visualiser/studio';
import {
  ADD_TO_CANVAS_DESCRIPTION,
  describeCanvas,
  edgeSpecsSchema,
  indexCatalog,
  nodeSpecsSchema,
  withNotesPlaced,
} from '../canvas-actions';
import { getCatalogResources } from '../catalog-resources';
import { playAddToCanvas, playConnectAll, playHotspot, playLayout, playRemove, playUpdateNode } from '../agent-choreography';
import { getAgent } from '../agents';
import { agentOnCanvas } from './canvas-agent';
import { findStudioRuntime } from './runtime';

/**
 * The assistant (Ask AI) on a Studio canvas: the canvas it was opened on, drawn on with the model the catalog has
 * configured. Its tools play changes out like the MCP canvas tools do (same choreography), so everyone on the canvas
 * watches the assistant's pointer draw the diagram.
 */

const ASSISTANT = getAgent('EventCatalog AI');
// Someone's waiting on the assistant in the chat: it draws about three times as fast as an MCP agent
const ASSISTANT_PACE = 0.3;

/** What the assistant is told when it's opened on a canvas, after its usual instructions */
const CANVAS_ASSISTANT_PROMPT = `
The user is on an EventCatalog Studio canvas: a live, collaborative diagram. They opened you there to draw on it with them.
When they ask you to diagram, design, map out, sketch or change something, draw it on the canvas with the canvas tools; don't answer with Mermaid or text diagrams.

If you need to ask the user something first (what to diagram, or a request too vague to draw), ask straight away, without calling any tools.

How to draw:
1. Read the canvas before you change it (getCanvas), so you build on what's there and don't add what's already on it.
2. Find what they asked about in the catalog (getResources, getResource, getMessagesProducedOrConsumedByResource, getArchitectureDiagramAsMermaid) and add those resources by collection and id. Catalog resources are connected to the related resources already on the canvas for you.
   - A domain or system from the catalog: add it with contents: true, which brings everything in it at once. Don't look up and add its services and messages yourself.
   - A service or message with what it connects to: add it with connections (e.g. ["sends", "receives"]), rather than finding each one.
3. Only add new components (type, name, summary) for what isn't in the catalog yet, e.g. a proposed service or event when the user is designing something new.
4. Add things in one or a few addToCanvas calls (with refs and edges), rather than one call per node. Use containers (domains, systems) when the diagram covers more than one of them.
5. Don't lay the canvas out yourself: when you've finished, the canvas is tidied for you if you added things or connections. Only call layoutCanvas when the user asks you to tidy up.

Explaining the diagram on the canvas:
- Hotspots flag something people should know about a node, or a place on the canvas: a risk, a problem or something worth knowing (addHotspot: critical, warning or info, with a short title and why it matters). Use them when the user asks to flag, highlight or review things, e.g. single points of failure.
- Sticky notes hold free text on the canvas: add a node with type "note" and its text in summary. Use them for notes, assumptions, open questions, suggestions and explanations. Keep each one very short and precise, like a sticky note on a whiteboard: one point in a few words (at most about 12), e.g. "Kafka: ordered, replayable order events". Add as many as are useful, one point per note, each beside the part of the diagram it's about: give it x/y about 300 to the right of, or 250 above, that node's centre (from getCanvas, after you've drawn), clear of other nodes. Add notes and text after the nodes they're about, so you know where those are. A note or text that would land on a node is moved to the nearest clear spot beside it, and notes stay beside their node when the canvas is tidied.
- Text is words written straight on the canvas, without a note around them: add a node with type "text", what it says in summary, and fontSize for how big (22 by default; 40 to 60 for a title or a heading over part of the diagram). Use it for a diagram's title (above everything: y about 200 above the top of what's on the canvas), headings over areas (just above the domain or group they name), or short labels. Never put text where a node is. Move it with updateCanvasNode (x, y), and make it bigger or smaller with fontSize.
- When asked to review or improve the design: flag each problem or risk with a hotspot on the node it's about, and write your suggestions on a few sticky notes (one per idea), then sum up what you found in a sentence or two. The hotspots you flag are listed under your reply for the user to go to, so don't list them again.
Only add hotspots and notes when the user asks for them, or the request is about reviewing or annotating the design.

Showing and explaining what's on the canvas:
- showOnCanvas takes the user to nodes: their view zooms to them and they're highlighted. Use it to show them what you're talking about.
- Whenever you mention something that's on the canvas in your reply, write it as a reference to it, which the user can hover or click to be taken there: [Order Service](#canvas-ref=service:<node id>). The type before the colon gives it its icon and colour: service, event, command, query, channel, domain, system, container (a data store), entity, agent, flow, user, team or data-product; for anything else, leave it out: [Customer](#canvas-ref=:<node id>). Use the node ids from getCanvas (or what addToCanvas created).
- To walk the user through how something works (e.g. "walk me through how checkout works"), read the canvas, then call walkThrough with the steps in order: each a short title, a sentence or two on what happens, and the nodes involved (ids from getCanvas). The user sees the steps in the chat, and each takes them to its nodes on the canvas, starting with the first: don't write the steps out again in your reply, just a sentence to introduce them. If what they ask about isn't on the canvas, draw it first.

Keep your reply short: say what you drew and anything you couldn't find in the catalog.
`;

/** The assistant's tools and instructions for the canvas it was opened on, or undefined if there's no such canvas */
export const getCanvasAssistant = (canvasId: string) => {
  const runtime = findStudioRuntime();
  if (!runtime?.exists(canvasId)) return undefined;
  const agent = () => agentOnCanvas(runtime, canvasId, ASSISTANT, { pace: ASSISTANT_PACE });
  // Added things or connections since the canvas was last laid out: it's tidied once the assistant has finished
  let drew = false;

  const layout = async () => {
    drew = false;
    const { nodes, edges } = await runtime.withCanvas(canvasId, readCanvas);
    // Notes and text stay beside what they're about
    const positions = withNotesPlaced(nodes, await getLayoutPositions(nodes, edges));
    await playLayout(agent().stage, positions);
    return { laidOut: positions.nodes.size };
  };

  const tools = {
    getCanvas: tool({
      description:
        'Reads everything on the canvas the user has open: its nodes (with ids, names, positions (their centres), sizes and the catalog resource they stand for), the connections between them, its hotspots and the comment threads. Read it before changing the canvas, and again to see what people have changed.',
      inputSchema: z.object({}),
      execute: async () => runtime.withCanvas(canvasId, describeCanvas),
    }),
    addToCanvas: tool({
      description: `${ADD_TO_CANVAS_DESCRIPTION} The user watches you add them one by one. Use getResources to find catalog resources first, and prefer them over new components.`,
      inputSchema: z.object({ nodes: nodeSpecsSchema, edges: edgeSpecsSchema.optional() }),
      execute: async ({ nodes, edges }) => {
        const { resources, relations } = await getCatalogResources();
        const result = await playAddToCanvas(agent().stage, { nodes, edges }, indexCatalog(resources, relations));
        // Notes and text alone (a review) leave the layout as it is
        if (result.connections.length || nodes.some((node) => node.type !== 'note' && node.type !== 'text')) drew = true;
        return result;
      },
    }),
    updateCanvasNode: tool({
      description:
        'Renames, re-describes, re-versions or moves a node on the canvas (x/y: its new centre). Catalog resources keep their catalog name, summary and version. For notes and text, summary is what is written; fontSize makes text bigger or smaller.',
      inputSchema: z.object({
        nodeId: z.string(),
        name: z.string().optional(),
        summary: z.string().optional(),
        version: z.string().optional().describe('e.g. 1.0.0'),
        fontSize: z.number().min(8).max(200).optional().describe('For text: how big it is written, in pixels'),
        x: z.number().optional(),
        y: z.number().optional(),
      }),
      execute: async (update) => playUpdateNode(agent().stage, update),
    }),
    connectCanvasNodes: tool({
      description:
        'Draws connections between nodes already on the canvas, one at a time. Labels default to EventCatalog wording (e.g. "publishes event", "sent to").',
      inputSchema: z.object({ edges: edgeSpecsSchema.min(1) }),
      execute: async ({ edges }) => {
        const result = await playConnectAll(agent().stage, edges);
        if (result.connections.length) drew = true;
        return result;
      },
    }),
    addHotspot: tool({
      description:
        'Flags a hotspot on a node (nodeId), or at a place on the canvas (x, y): a marker everyone sees, with how serious it is, a short title and, optionally, why it matters and what to do about it. For risks, problems and things worth knowing, e.g. a single point of failure.',
      inputSchema: z.object({
        severity: z.enum(['critical', 'warning', 'info']).describe('critical: a problem; warning: a risk; info: worth knowing'),
        title: z.string().describe('What people should know, in a few words, e.g. "Single point of failure"'),
        description: z.string().optional().describe('Why it matters, and what to do about it'),
        nodeId: z.string().optional().describe('The node it is about (from getCanvas or addToCanvas)'),
        x: z.number().optional(),
        y: z.number().optional(),
      }),
      execute: async (hotspot) => {
        const { stage, author } = agent();
        return playHotspot(stage, hotspot, author);
      },
    }),
    showOnCanvas: tool({
      description:
        "Takes the user to nodes on the canvas: their view zooms to them and they're highlighted (only their view, not anyone else's). Use it to show them what you're talking about, e.g. the first step of a walkthrough.",
      inputSchema: z.object({ nodeIds: z.array(z.string()).min(1).describe('The nodes to show (ids from getCanvas)') }),
      execute: async ({ nodeIds }) => {
        const onCanvas = await runtime.withCanvas(canvasId, (doc) => new Set(getCanvasMaps(doc).nodes.keys()));
        const shown = nodeIds.filter((id) => onCanvas.has(id));
        const missing = nodeIds.filter((id) => !onCanvas.has(id));
        if (!shown.length)
          return { error: `None of these are on the canvas: ${missing.join(', ')}. Use getCanvas for their ids.` };
        return { nodeIds: shown, ...(missing.length && { notOnCanvas: missing }) };
      },
    }),
    walkThrough: tool({
      description:
        'Walks the user through how something on the canvas works, step by step: they see the steps in the chat, and each takes them to its nodes on the canvas (starting with the first). Use it when they ask how something works or flows, e.g. "walk me through checkout".',
      inputSchema: z.object({
        title: z.string().describe('What it walks through, e.g. "How checkout works"'),
        steps: z
          .array(
            z.object({
              title: z.string().describe('The step, in a few words, e.g. "Customer places an order"'),
              description: z.string().describe('What happens in this step, in a sentence or two'),
              nodeIds: z.array(z.string()).min(1).describe('The nodes involved in this step (ids from getCanvas)'),
            })
          )
          .min(1)
          .max(20),
      }),
      execute: async ({ title, steps }) => {
        const onCanvas = await runtime.withCanvas(canvasId, (doc) => new Set(getCanvasMaps(doc).nodes.keys()));
        const missing = [...new Set(steps.flatMap((step) => step.nodeIds).filter((id) => !onCanvas.has(id)))];
        return {
          title,
          steps: steps.map((step) => ({ ...step, nodeIds: step.nodeIds.filter((id) => onCanvas.has(id)) })),
          ...(missing.length && { notOnCanvas: missing }),
        };
      },
    }),
    removeFromCanvas: tool({
      description:
        'Removes nodes (and their connections) or connections from the canvas. Only remove what the user asked for or what you added.',
      inputSchema: z.object({ nodeIds: z.array(z.string()).optional(), connectionIds: z.array(z.string()).optional() }),
      execute: async ({ nodeIds = [], connectionIds = [] }) => {
        await playRemove(agent().stage, nodeIds, connectionIds);
        return { removedNodes: nodeIds, removedConnections: connectionIds };
      },
    }),
    layoutCanvas: tool({
      description:
        "Lays the whole canvas out again with EventCatalog's visualiser layout (left to right, connections routed around nodes). Only when the user asks you to tidy up: what you draw is laid out for you when you've finished.",
      inputSchema: z.object({}),
      execute: layout,
    }),
  };

  return {
    tools,
    instructions: CANVAS_ASSISTANT_PROMPT,
    /**
     * The model started writing a call to a tool: a big addToCanvas takes a while to write, so the canvas shows the
     * assistant planning it meanwhile
     */
    startedWriting: (toolName: string) => {
      if (toolName !== 'addToCanvas') return;
      const { stage } = agent();
      stage.present({ pointer: stage.lastPointer ?? { x: 0, y: 0 }, selection: [], activity: 'Planning the diagram' });
    },
    /** The assistant has finished: what it drew is laid out, so the canvas is tidy (the model doesn't always remember to) */
    finished: async () => {
      if (drew) await layout();
    },
  };
};
