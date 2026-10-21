/**
 * The MCP server: a new one for each request (stateless). The agent learns the model (get_architecture_schema),
 * shows a diagram once (render_architecture: MCP hosts that support MCP Apps show it as an interactive view), then
 * changes and reads that same diagram where the user has it open (edit_diagram, read_diagram), through the open
 * view (see bridge.ts). read_diagram also reads diagram links people paste.
 */
import { McpServer } from '@modelcontextprotocol/server';
import { z } from 'zod';
import { appViewMeta, getViewLoader, mcpAppNote, registerMcpApp } from './register';
import { ask, answerRequest, DIAGRAM_ID, newDiagramId, viewTokenFor, waitForRequests } from './bridge';
import { SCHEMA_GUIDE, SERVER_INSTRUCTIONS } from './guide';
import { LEVELS, Model, type ArchitecturePayload } from '@eventcatalog/visualiser/model';
import { summarise, toMermaid } from '../model/to-text';
import { checkPayload } from '../model/check';
import { Changes, Reorder, type ChangeResult } from '../model/changes';
import { outlineModel } from '../model/outline';
import { parseViewFragment, viewLink } from '../lib/encode';
import { POSTHOG_ORIGIN } from '../lib/posthog';
import { modelMix, modelStats, sizeBucket } from '../lib/stats';
import type { Properties } from '../analytics';

export const VIEW_RESOURCE_URI = 'ui://eventcatalog/architecture';
export const VIEW_META_KEY = 'eventcatalog/architecture';
export const VIEW_TOOL = 'get_architecture_view';
/** App-only: the open diagram's view waiting for what the agent asks of it, and answering (bridge.ts) */
export const WAIT_TOOL = 'wait_for_diagram_requests';
export const ANSWER_TOOL = 'answer_diagram_request';

const diagramId = z.string().regex(DIAGRAM_ID).describe('The diagramId render_architecture returned');
// The diagram's view token: only its views, which get it in the result's _meta, take and answer what's asked of it (bridge.ts)
const viewToken = z.string().length(64);

const readOnly = { readOnlyHint: true, openWorldHint: false, destructiveHint: false } as const;

/** What a tool reports for analytics: whether it worked (and why not), and the diagram's shape (never the model) */
type Report = (details: Properties) => void;
/** What a tool adds to its request's log line: numbers and names only */
type Log = (fields: Record<string, string | number | boolean | undefined>) => void;

/** What the open view answers an edit with (view/diagram-bridge.ts) */
export type EditAnswer = { results: ChangeResult[]; resources: number; relations: number; reordered?: boolean };

const text = (value: unknown, isError = false) => ({
  content: [{ type: 'text' as const, text: JSON.stringify(value, null, 2) }],
  ...(isError && { isError: true }),
});

const NOT_OPEN =
  "The user doesn't have that diagram open (it was closed, or this client doesn't show diagrams). To show it again, call render_architecture with the whole model (read_diagram with its viewUrl gives you the diagram as you drew it).";

export function createMcpServer({ baseUrl, report = () => {}, log = () => {} }: { baseUrl: string; report?: Report; log?: Log }) {
  const server = new McpServer(
    {
      name: 'EventCatalog',
      title: 'EventCatalog',
      version: '0.0.1',
      websiteUrl: 'https://www.eventcatalog.dev',
      // Shown beside the server by clients that read serverInfo.icons (the light and dark logo, in one SVG)
      icons: [{ src: `${baseUrl.replace(/\/$/, '')}/icon.svg`, mimeType: 'image/svg+xml', sizes: ['any'] }],
    },
    { instructions: SERVER_INSTRUCTIONS }
  );
  const loadView = getViewLoader();

  /** Checks a diagram and makes its link */
  const prepare = (payload: ArchitecturePayload): { error: string } | { url?: string; warnings: string[] } => {
    const { problem, warnings } = checkPayload(payload);
    log({ resources: payload.model.resources.length, relations: payload.model.relations.length });
    report({
      ...modelStats(payload.model),
      ...modelMix(payload.model),
      level: payload.level,
      has_focus: !!payload.focus,
      warnings: sizeBucket(warnings.length),
    });
    if (problem) {
      report({ ok: false, error_kind: problem.kind, ...(problem.kind !== 'unknown_focus' && { problems: sizeBucket(problem.problems) }) });
      return { error: problem.error };
    }
    // The diagram's link: for clients that don't show diagrams, and where the view loads it from when the host
    // doesn't pass it
    const url = viewLink(baseUrl, payload.model, { focus: payload.focus, level: payload.level, from: 'agent' });
    report({ ok: true, too_big_for_link: !url });
    return { url, warnings };
  };

  registerMcpApp(server, {
    loadView,
    resource: {
      name: 'EventCatalog architecture diagram',
      uri: VIEW_RESOURCE_URI,
      description: 'Interactive, levelled architecture diagram (EventCatalog visualiser)',
      // Usage analytics (view/analytics.ts): kinds and counts, never the diagram
      csp: { resourceDomains: [], connectDomains: [POSTHOG_ORIGIN] },
      // Diagrams need the room, and stay open across turns: hosts that can (ChatGPT) open the view full screen
      displayModes: { preferred: 'fullscreen', available: ['inline', 'fullscreen'] },
      // The canvas has its own background: no frame around it, on the web and on phones alike
      prefersBorder: false,
    },
    metaKey: VIEW_META_KEY,
    tool: {
      name: 'render_architecture',
      title: 'Show an architecture diagram',
      description:
        'Shows the user an interactive diagram of an architecture you describe (domains, systems, services, messages, channels, data stores), with levels from an overview down to every message. Call it ONCE per diagram: it stays open beside the conversation, and every later change to it goes through edit_diagram with the diagramId this returns (calling render_architecture again shows a separate, new diagram). Call get_architecture_schema first. Build the model from the code and specs you read, give every resource a summary, set parent to put services in their domain or system, flag risks with hotspots, and start with one service or domain in focus.',
      input: {
        model: Model,
        focus: z.string().optional().describe('Id of the resource to highlight'),
        level: z.enum(LEVELS).optional().describe('Level to open at: overview, services or messages (default)'),
      },
    },
    viewTool: {
      name: VIEW_TOOL,
      title: 'Load the architecture diagram',
      description: 'Loads a diagram for the EventCatalog view. To show the user a diagram, use render_architecture.',
      input: {
        viewUrl: z.string().describe('The viewUrl from render_architecture'),
        diagramId: diagramId.optional(),
      },
    },
    annotations: readOnly,
    errorMessage: 'Failed to render the architecture',
    load: async (params) => {
      let payload: ArchitecturePayload;
      if ('viewUrl' in params) {
        const { model, focus, level } = parseViewFragment(params.viewUrl);
        if (!model) {
          report({ ok: false, error_kind: 'invalid_link' });
          return { error: 'The viewUrl has no valid model' };
        }
        payload = { model, focus, level: level as ArchitecturePayload['level'] };
      } else {
        payload = { model: params.model, focus: params.focus, level: params.level };
      }
      const prepared = prepare(payload);
      if ('error' in prepared) return prepared;
      // Which diagram this is, for edit_diagram and read_diagram to reach it where it's open (bridge.ts)
      const id = ('diagramId' in params && params.diagramId) || newDiagramId();

      return {
        label: payload.model.title,
        forModel: {
          note: mcpAppNote('diagram', 'redraw it as Mermaid or ASCII', 'give the user the viewUrl to open the interactive diagram, and the mermaid diagram'),
          diagramId: id,
          next: 'To change this diagram, call edit_diagram with this diagramId (not render_architecture again: that shows a new diagram). Offer to expand it, or to focus on one part of it.',
          summary: summarise(payload.model, prepared.warnings),
          viewUrl: prepared.url ?? 'The model is too large for a link: render a smaller part of it (set focus, or fewer resources)',
          mermaid: toMermaid(payload.model, payload.level ?? 'messages'),
        },
        // (its views wait for requests with its token: in _meta, which the model isn't shown)
        getPayload: async () => ({ ...payload, viewUrl: prepared.url, diagramId: id, viewToken: viewTokenFor(id) }),
      };
    },
  });

  // Changing the diagram the user has open, where it is: no view of its own (that would show a new diagram), the
  // open diagram's view makes the changes and answers (bridge.ts)
  server.registerTool(
    'edit_diagram',
    {
      title: 'Change the open diagram',
      description:
        "Changes a diagram render_architecture showed, where the user has it open: they watch your changes made on it. Use it for every change to that diagram, instead of render_architecture. Send only what changes (add_resource, update_resource, remove_resource, add_relation, remove_relation, add_hotspot, remove_hotspot, add_note, set_title), using the ids read_diagram shows: the diagram keeps everything else, including what the user changed and where things are. Returns which changes were made and why any weren't. Set reorder on the last edit of a round of changes, to lay the diagram out again so it reads well (it moves everything, including what the user arranged: leave it off when they asked to keep their layout).",
      inputSchema: z.object({ diagramId, changes: Changes, reorder: Reorder }),
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: false },
    },
    async ({ diagramId: id, changes, reorder }) => {
      const started = performance.now();
      const result = await ask(id, { kind: 'edit', changes, reorder });
      log({ changes: changes.length, reorder: !!reorder, outcome: result.outcome, answer_ms: Math.round(performance.now() - started) });
      report({ changes: sizeBucket(changes.length), outcome: result.outcome, ok: result.outcome === 'answered' });
      if (result.outcome === 'not_open') return text({ error: NOT_OPEN }, true);
      if (result.outcome === 'busy') return text({ error: 'The diagram has too many changes waiting. Try again in a moment.' }, true);
      if (result.outcome === 'not_taken')
        return text(
          {
            error:
              "The diagram didn't take the changes: it isn't being shown right now (the user may be on another tab). Nothing was changed. Ask them to go back to it, then send the changes again.",
          },
          true
        );
      if (result.outcome === 'not_answered')
        return text({
          note: "The diagram took the changes but hasn't confirmed them yet: they may still be made. Check with read_diagram before sending them again. Don't call render_architecture.",
          diagramId: id,
        });
      // The diagram couldn't make them (e.g. still opening)
      const failure = (result.answer as { error?: unknown }).error;
      if (typeof failure === 'string') return text({ error: `${failure} Nothing was changed.` }, true);
      const answer = result.answer as EditAnswer;
      const failed = answer.results.filter((change) => !change.ok);
      const applied = answer.results.length - failed.length;
      report({ applied: sizeBucket(applied), failed: sizeBucket(failed.length) });
      return text(
        {
          note: applied
            ? `Made ${applied} of ${answer.results.length} changes on the diagram the user has open${answer.reordered ? ', and laid it out again' : ''}: don't redraw it. Tell them what you changed${failed.length ? ', and fix or explain the ones that failed' : ''}.`
            : 'None of the changes could be made: fix them and call edit_diagram again.',
          diagramId: id,
          ...(failed.length && { failed: failed.map(({ index, op, error }) => ({ index, op, error })) }),
          diagram: { resources: answer.resources, relations: answer.relations },
        },
        !applied
      );
    }
  );

  // Reading a diagram: the one the user has open (with what they changed on it, from its view), or a link someone
  // pasted (the model is in the link's fragment, compressed: agents can't read it as it is)
  server.registerTool(
    'read_diagram',
    {
      title: 'Read a diagram',
      description:
        "Returns a diagram's resources, relations, notes, hotspots and comments (the summary lists the hotspots and open comments). Pass diagramId for one the user has open: you get it as it is now, with what they changed. Pass diagram for an EventCatalog Studio link someone pasted (one with #m= in it). Read it before changing it with edit_diagram, for the ids.",
      inputSchema: z.object({
        diagramId: diagramId.optional(),
        diagram: z.string().optional().describe('A diagram link, e.g. https://…/#m=… or https://…/view#m=…'),
      }),
      annotations: readOnly,
    },
    async ({ diagramId: id, diagram }) => {
      if (id) {
        const result = await ask(id, { kind: 'read' });
        if (result.outcome === 'answered') {
          const model = (result.answer as { model?: Model }).model;
          if (model) {
            report({ ok: true, ...modelStats(model) });
            return text({ diagramId: id, summary: summarise(model, []), model: outlineModel(model) });
          }
        }
        if (!diagram) return text({ error: result.outcome === 'not_open' ? NOT_OPEN : "The diagram didn't answer: it may be out of sight. Try again in a moment." }, true);
      }
      if (!diagram) return text({ error: 'Pass diagramId (a diagram the user has open) or diagram (a link).' }, true);
      const { model, focus, level } = parseViewFragment(diagram);
      if (!model) {
        report({ ok: false, error_kind: diagram.includes('#room=') ? 'live_session_link' : 'invalid_link' });
        return text({ error: 'Not a diagram link with a diagram in it (#m=…). Live session links (#room=…) are end-to-end encrypted and cannot be read.' }, true);
      }
      report({ ok: true, ...modelStats(model), ...modelMix(model) });
      return text({ summary: summarise(model, []), ...(focus && { focus }), ...(level && { level }), model: outlineModel(model) });
    }
  );

  // App-only: the open diagram's view waiting for what the agent asks of it (it waits again as soon as this returns)
  // and answering it (bridge.ts)
  if (loadView) {
    server.registerTool(
      WAIT_TOOL,
      {
        title: 'Wait for requests to the open diagram',
        description: 'The diagram view waiting for changes and reads the agent asks of it.',
        inputSchema: z.object({ diagramId, token: viewToken }),
        annotations: readOnly,
        _meta: appViewMeta(VIEW_RESOURCE_URI, ['app']),
      },
      async ({ diagramId: id, token }, extra) => {
        const signal = (extra as { mcpReq?: { signal?: AbortSignal } } | undefined)?.mcpReq?.signal;
        const result = await waitForRequests(id, token, { signal });
        if ('error' in result) return text(result, true);
        log({ requests: result.requests.length });
        return { content: [{ type: 'text' as const, text: `${result.requests.length} request(s)` }], structuredContent: result };
      }
    );
    server.registerTool(
      ANSWER_TOOL,
      {
        title: 'Answer a request to the open diagram',
        description: 'The diagram view answering a change or read the agent asked of it.',
        inputSchema: z.object({ diagramId, token: viewToken, requestId: z.string().uuid(), answer: z.record(z.string(), z.unknown()) }),
        annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true, openWorldHint: false },
        _meta: appViewMeta(VIEW_RESOURCE_URI, ['app']),
      },
      async ({ diagramId: id, token, requestId, answer }) => text({ answered: answerRequest(id, token, requestId, answer) })
    );
  }

  // What agents learn first (the server's instructions and render_architecture tell them to): the vocabulary, the
  // relation rules and an example
  server.registerTool(
    'get_architecture_schema',
    {
      title: 'Learn the architecture model',
      description:
        'Returns how to describe an architecture for render_architecture and change it with edit_diagram: the resource types, relation rules, summaries, schemas and links, notes, hotspots, comments, levels, and an example. Call it once, before your first render_architecture.',
      inputSchema: z.object({}),
      annotations: readOnly,
    },
    async () => ({ content: [{ type: 'text' as const, text: SCHEMA_GUIDE }] })
  );

  return server;
}
