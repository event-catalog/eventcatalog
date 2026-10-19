/**
 * WebMCP: in the browser, the page offers the MCP server's tools to AI agents in the browser (Chrome's built in agent,
 * the MCP-B extension), working on the canvas the user has open rather than on a new diagram in a chat.
 * https://webmachinelearning.github.io/webmcp/
 * Adapted from EventCatalog's Studio (packages/core/eventcatalog/src/features/studio/hooks/use-canvas-webmcp.ts).
 */
import { useEffect, useRef, useState } from 'react';
import { z } from 'zod';
import { initializeWebMCPPolyfill } from '@mcp-b/webmcp-polyfill';
import { LEVELS, Model, Tour, type ArchitecturePayload, type Scene } from '@eventcatalog/visualiser/model';
import { checkPayload, checkTour } from '../src/model/check';
import { summarise } from '../src/model/to-text';
import { parseViewFragment } from '../src/lib/encode';
import { SCHEMA_GUIDE } from '../src/mcp/guide';
import { track } from './analytics';

type ToolResult = { content: { type: 'text'; text: string }[]; isError?: boolean };
type ToolAnnotations = { readOnlyHint?: boolean; consequentialHint?: boolean; untrustedContentHint?: boolean };
type ModelContextTool = {
  name: string;
  title?: string;
  description: string;
  inputSchema?: object;
  annotations?: ToolAnnotations;
  execute: (input: unknown, options?: { signal?: AbortSignal }) => Promise<ToolResult>;
};
export type ModelContext = { registerTool: (tool: ModelContextTool, options?: { signal?: AbortSignal }) => Promise<void> | void };

// The spec moved modelContext from navigator to document; older runtimes still have the navigator one
const getModelContext = () =>
  ((document as unknown as { modelContext?: ModelContext }).modelContext ??
    (navigator as unknown as { modelContext?: ModelContext }).modelContext) as ModelContext | undefined;

// Survives remounts, so a native WebMCP runtime is never shadowed by the polyfill
let usingPolyfill = false;

/**
 * WebMCP through the polyfill (for browsers without WebMCP of their own) is opt in, remembered in this browser: the
 * polyfill watches every change to the page (for declarative form tools), and a canvas changes on every drag and pan.
 */
const POLYFILL_KEY = 'eventcatalog-webmcp';
export const isWebMcpPolyfillOn = () => {
  try {
    return localStorage.getItem(POLYFILL_KEY) === 'true';
  } catch {
    return false;
  }
};
export const turnOnWebMcpPolyfill = () => {
  try {
    localStorage.setItem(POLYFILL_KEY, 'true');
  } catch {}
};

export type WebMcpStatus = { state: 'off' } | { state: 'on'; source: 'native' | 'polyfill'; tools: number };

/** The canvas the tools work on, read when a tool runs */
export type WebMcpCanvas = {
  /** The diagram as it is on the canvas now, with the user's changes */
  model: Model;
  focus?: string;
  /** The resource the user has selected, if any */
  selected?: string;
  /** In a live session: a diagram in place of the canvas would be a copy beside the session's, for everyone */
  live: boolean;
  /** Puts the agent's diagram on the canvas in place of what's there, built up in front of the user; false if they said no */
  render: (payload: ArchitecturePayload) => Promise<boolean>;
  /** Plays a walkthrough over the canvas */
  showTour: (tour: Scene[]) => Promise<void>;
};

type WebMcpTool<Input extends z.ZodType = z.ZodType> = {
  name: string;
  title: string;
  description: string;
  input: Input;
  annotations?: ToolAnnotations;
  execute: (input: z.output<Input>) => unknown;
};

const defineTool = <Input extends z.ZodType>(tool: WebMcpTool<Input>) => tool as unknown as WebMcpTool;

const result = (value: unknown, isError = false): ToolResult => ({
  content: [{ type: 'text', text: JSON.stringify(value, null, 2) }],
  ...(isError && { isError }),
});

const IN_THE_BROWSER = `## In the browser (WebMCP)
These tools work on the canvas the user has open in EventCatalog Studio, not on a new diagram: read_diagram (without a link) reads what's on it now, with their changes; render_architecture puts a diagram on it in place of what's there, so read it first and build on that model (keep their notes, layout, hotspots and comments); show_on_diagram takes just the tour and plays it over the canvas.`;

const LIVE_SESSION =
  "The user's canvas is a live session shared with other people: a new diagram can't be put in its place there. Tell the user what to change (they can change it on the canvas), or ask them to leave the live session first.";

export function createWebMcpTools(get: () => WebMcpCanvas): WebMcpTool[] {
  return [
    defineTool({
      name: 'get_architecture_schema',
      title: 'Learn the architecture model',
      description:
        "Returns how to describe an architecture for render_architecture: the resource types, relation rules, summaries, schemas and links, notes, hotspots, comments, walkthroughs (show_on_diagram), levels, the JSON schema of the model and an example. Call it once, before your first render_architecture.",
      input: z.object({}),
      annotations: { readOnlyHint: true },
      execute: () => `${SCHEMA_GUIDE}\n${IN_THE_BROWSER}`,
    }),
    defineTool({
      name: 'read_diagram',
      title: 'Read the diagram',
      description:
        "Returns the diagram on the user's canvas as its model, with their changes: its resources, relations, notes, hotspots and comments (the summary lists the hotspots and open comments), and what they have selected. Call it before changing the diagram, and build on the model it returns. Pass a diagram link (one with #m= in it) to read that diagram instead.",
      input: z.object({ diagram: z.string().optional().describe('A diagram link, e.g. https://…/#m=… (leave out to read the open canvas)') }),
      // Comments, notes and links come from people
      annotations: { readOnlyHint: true, untrustedContentHint: true },
      execute: ({ diagram }) => {
        if (diagram) {
          const { model, focus, level } = parseViewFragment(diagram);
          if (!model)
            return { error: 'Not a diagram link with a diagram in it (#m=…). Live session links (#room=…) are end-to-end encrypted and cannot be read.' };
          return { summary: summarise(model, []), ...(focus && { focus }), ...(level && { level }), model };
        }
        const { model, focus, selected } = get();
        return { summary: summarise(model, []), ...(focus && { focus }), ...(selected && { selected }), model };
      },
    }),
    defineTool({
      name: 'render_architecture',
      title: 'Visualise architecture',
      description:
        "Draws an architecture (domains, systems, services, messages, channels, data stores) on the user's canvas in place of what's there. Use it to show or change their diagram: call read_diagram first and build on its model, keeping their notes, layout, hotspots and comments. Call get_architecture_schema before your first one. Give every resource a summary (shown on its node) and flag risks and key parts with hotspots. No resources clears it to a blank canvas.",
      input: z.object({
        model: Model,
        focus: z.string().optional().describe('Id of the resource to highlight'),
        level: z.enum(LEVELS).optional().describe('Level to open at: overview, services or messages (default)'),
        tour: Tour.optional().describe('Scenes to play on the diagram once it is drawn (see show_on_diagram)'),
      }),
      // Replacing what's on the canvas can't be undone (the page asks first when there's work on it)
      annotations: { consequentialHint: true },
      execute: async ({ model, focus, level, tour }) => {
        const canvas = get();
        if (canvas.live) return { error: LIVE_SESSION };
        const payload: ArchitecturePayload = { model, focus, level, tour };
        const { problem, warnings } = checkPayload(payload);
        if (problem) return { error: problem.error };
        if (!(await canvas.render(payload)))
          return { error: 'The user kept their canvas as it is. Ask them before trying again, or tell them what you would change.' };
        if (!model.resources.length && !model.notes?.length)
          return { cleared: true, next: 'The canvas is blank. The user adds to it, or tells you what to draw (call read_diagram before you build on it).' };
        return {
          drawn: true,
          summary: summarise(model, warnings),
          next: "It's on the user's canvas. Explain what it shows, and offer to walk them through it (show_on_diagram) or to expand it.",
        };
      },
    }),
    defineTool({
      name: 'show_on_diagram',
      title: 'Show on the diagram',
      description:
        "Walks the user through the diagram on their canvas, like a person at the canvas: switch level, zoom into a service or area, highlight resources (fading the rest), write notes next to them and pin code (e.g. an event's schema, copied from the files you read). Use it when the user asks to be shown or taught something (\"how does this service work?\", \"show me the schema for OrderPlaced\"). Use the resource ids from read_diagram.",
      input: z.object({
        tour: Tour.describe('Scenes to play in order: each can switch level, zoom to and highlight resources, write notes beside them and pin code (e.g. a schema)'),
      }),
      // Not read only: it changes what the user sees (the level, the view, a walkthrough over the canvas)
      execute: async ({ tour }) => {
        const canvas = get();
        if (!canvas.model.resources.length) return { error: 'There is nothing on the canvas to walk through: draw a diagram with render_architecture first' };
        const problem = checkTour(canvas.model, tour);
        if (problem) return { error: problem.error };
        await canvas.showTour(tour);
        return {
          playing: true,
          scenes: tour.map((scene, index) => `${index + 1}. ${scene.caption ?? scene.focus?.join(', ') ?? 'scene'}`),
          next: 'The user steps through the scenes on their canvas: tell them what each one shows.',
        };
      },
    }),
  ];
}

/** Offers the tools to the page's WebMCP runtime until the signal aborts; resolves with how many there are */
export async function registerWebMcpTools(modelContext: ModelContext, tools: WebMcpTool[], signal: AbortSignal) {
  const outcomes = await Promise.allSettled(
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
            if (!parsed.success) {
              track('webmcp_tool_called', { tool: tool.name, ok: false, error_kind: 'invalid_input' });
              return result({ error: z.prettifyError(parsed.error) }, true);
            }
            try {
              const value = await tool.execute(parsed.data);
              const failed = !!value && typeof value === 'object' && 'error' in value;
              track('webmcp_tool_called', { tool: tool.name, ok: !failed });
              return typeof value === 'string' ? { content: [{ type: 'text', text: value }] } : result(value, failed);
            } catch (error) {
              track('webmcp_tool_called', { tool: tool.name, ok: false, error_kind: 'threw' });
              return result({ error: String((error as Error)?.message ?? error) }, true);
            }
          },
        },
        { signal }
      )
    )
  );
  // A tool that's already registered (e.g. after a hot reload) rejects, but is still there
  return outcomes.length;
}

/**
 * The page's tools for agents in this browser, while `enabled` (the page, not a chat's view: there the agent has the
 * MCP server). Browsers without WebMCP of their own get it through the polyfill, once it's turned on (Connect agent).
 */
export function useWebMcp({ enabled, allowPolyfill, canvas }: { enabled: boolean; allowPolyfill: boolean; canvas: WebMcpCanvas }) {
  const [status, setStatus] = useState<WebMcpStatus>({ state: 'off' });
  // Tools are registered once and read the canvas as it is when they run
  const latest = useRef(canvas);
  latest.current = canvas;

  useEffect(() => {
    if (!enabled) return;
    if (!getModelContext()) {
      if (!allowPolyfill) return;
      initializeWebMCPPolyfill();
      usingPolyfill = true;
    }
    const modelContext = getModelContext();
    if (!modelContext) return;

    const controller = new AbortController();
    const source = usingPolyfill ? 'polyfill' : 'native';
    void registerWebMcpTools(
      modelContext,
      createWebMcpTools(() => latest.current),
      controller.signal
    ).then((tools) => {
      if (controller.signal.aborted) return;
      setStatus({ state: 'on', source, tools });
      track('webmcp_on', { source });
    });
    return () => {
      controller.abort();
      setStatus({ state: 'off' });
    };
  }, [enabled, allowPolyfill]);

  return status;
}
