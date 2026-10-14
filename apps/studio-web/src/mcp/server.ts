/**
 * The MCP server: a new one for each request (stateless), with the schema tool (get_architecture_schema),
 * render_architecture (whose result MCP hosts that support MCP Apps show as an interactive diagram), show_on_diagram
 * (the agent walking the user through a diagram it drew: zooming, highlighting, writing notes and pinning code on it)
 * and read_diagram (a diagram link the user pasted, as its model).
 */
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { appViewMeta, getViewLoader, mcpAppNote, registerMcpApp } from './register';
import { SCHEMA_GUIDE, SERVER_INSTRUCTIONS } from './guide';
import { LEVELS, Model, Tour, type ArchitecturePayload, validateModel, validateTour } from '@eventcatalog/visualiser/model';
import { summarise, toMermaid } from '../model/to-text';
import { parseViewFragment, viewLink } from '../lib/encode';
import { POSTHOG_ORIGIN } from '../lib/posthog';
import { modelMix, modelStats, sizeBucket, tourStats } from '../lib/stats';
import type { Properties } from '../analytics';

export const VIEW_RESOURCE_URI = 'ui://eventcatalog/architecture';
export const VIEW_META_KEY = 'eventcatalog/architecture';
export const VIEW_TOOL = 'get_architecture_view';
const SESSION_ID = 'eventcatalog-architecture';

const readOnly = { readOnlyHint: true, openWorldHint: false, destructiveHint: false } as const;

const tourInput = Tour.describe(
  'Scenes to play on the diagram, in order, like walking someone through it at a whiteboard: each can switch level, zoom to resources, highlight them (fading the rest), write notes next to them and pin code (e.g. a schema). The user steps through them; notes and code are temporary.'
);

/** What a tool reports for analytics: whether it worked (and why not), and the diagram's shape (never the model) */
type Report = (details: Properties) => void;

export function createMcpServer({ baseUrl, report = () => {} }: { baseUrl: string; report?: Report }) {
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

  /** Checks a diagram (and its tour) and builds what the model reads and what the view shows */
  const prepare = (payload: ArchitecturePayload): { error: string } | { url?: string; tourUrl?: string; warnings: string[] } => {
    const { errors, warnings } = validateModel(payload.model);
    report({
      ...modelStats(payload.model),
      ...modelMix(payload.model),
      ...(payload.tour?.length ? tourStats(payload.tour) : { tour_scenes: 0 }),
      level: payload.level,
      has_focus: !!payload.focus,
      warnings: sizeBucket(warnings.length),
    });
    if (errors.length) {
      report({ ok: false, error_kind: 'invalid_model', problems: sizeBucket(errors.length) });
      return { error: `The model has ${errors.length} problem(s). Fix them all and call render_architecture again:\n- ${errors.join('\n- ')}` };
    }
    if (payload.focus && !payload.model.resources.some((r) => r.id === payload.focus)) {
      report({ ok: false, error_kind: 'unknown_focus' });
      return { error: `focus "${payload.focus}" isn't the id of a resource in the model` };
    }
    const tourErrors = payload.tour ? validateTour(payload.model, payload.tour) : [];
    if (tourErrors.length) {
      report({ ok: false, error_kind: 'invalid_tour', problems: sizeBucket(tourErrors.length) });
      return { error: `The tour has ${tourErrors.length} problem(s). Fix them and try again:\n- ${tourErrors.join('\n- ')}` };
    }

    // The diagram's link (shared from the view, and passed back to show_on_diagram), and one with the tour
    const url = viewLink(baseUrl, payload.model, { focus: payload.focus, level: payload.level, from: 'agent' });
    const tourUrl = payload.tour && viewLink(baseUrl, payload.model, { focus: payload.focus, level: payload.level, tour: payload.tour, from: 'agent' });
    report({ ok: true, too_big_for_link: !url });
    return { url, tourUrl, warnings };
  };

  registerMcpApp(server, {
    loadView,
    resource: {
      name: 'EventCatalog architecture diagram',
      uri: VIEW_RESOURCE_URI,
      description: 'Interactive, levelled architecture diagram (EventCatalog visualiser)',
      // Usage analytics (view/analytics.ts): kinds and counts, never the diagram
      csp: { resourceDomains: [], connectDomains: [POSTHOG_ORIGIN] },
      // Diagrams need the room: hosts that can (ChatGPT) open the view full screen straight away, as EventCatalog's do
      displayModes: { preferred: 'fullscreen', available: ['inline', 'fullscreen'] },
    },
    sessionId: SESSION_ID,
    metaKey: VIEW_META_KEY,
    tool: {
      name: 'render_architecture',
      title: 'Visualise architecture',
      description:
        'Shows the user an interactive EventCatalog diagram of an architecture you describe (domains, systems, services, messages, channels, data stores), with levels from an overview down to every message. Build the model from the code and specs you read; call get_architecture_schema first. Give every resource a summary (what it is or does) when you can: it is shown on its node. Flag risks, problems and the key parts with hotspots (model.hotspots). Keep the hotspots and comments people added when you change it. Start with one service or domain and set focus. To walk the user through how something works, add a tour (or use show_on_diagram later).',
      input: {
        model: Model,
        focus: z.string().optional().describe('Id of the resource to highlight'),
        level: z.enum(LEVELS).optional().describe('Level to open at: overview, services or messages (default)'),
        tour: tourInput.optional(),
      },
    },
    viewTool: {
      name: VIEW_TOOL,
      title: 'Load the architecture diagram',
      description: 'Loads a diagram for the EventCatalog view. To show the user a diagram, use render_architecture.',
      input: { viewUrl: z.string().describe('The viewUrl from render_architecture') },
    },
    annotations: readOnly,
    errorMessage: 'Failed to render the architecture',
    load: async (params) => {
      let payload: ArchitecturePayload;
      if ('viewUrl' in params) {
        const { model, focus, level, tour } = parseViewFragment(params.viewUrl);
        if (!model) {
          report({ ok: false, error_kind: 'invalid_link' });
          return { error: 'The viewUrl has no valid model' };
        }
        payload = { model, focus, level: level as ArchitecturePayload['level'], tour };
      } else {
        payload = { model: params.model, focus: params.focus, level: params.level, tour: params.tour };
      }
      const prepared = prepare(payload);
      if ('error' in prepared) return prepared;

      return {
        label: payload.model.title,
        forModel: {
          note: mcpAppNote(
            'diagram',
            'redraw it as Mermaid or ASCII',
            'show the user the viewUrl to open the interactive diagram, and the mermaid diagram'
          ),
          viewUrl: prepared.tourUrl ?? prepared.url ?? 'The model is too large for a link: render a smaller part of it (set focus, or fewer resources)',
          diagram: prepared.url
            ? 'Pass viewUrl as `diagram` to show_on_diagram to walk the user through this diagram (zoom in, highlight, write notes, show code).'
            : undefined,
          mermaid: toMermaid(payload.model, payload.level ?? 'messages'),
          summary: summarise(payload.model, prepared.warnings),
          next: 'Offer to walk the user through it (show_on_diagram), to expand the diagram, or to focus on one part of it.',
        },
        getPayload: async () => ({ ...payload, viewUrl: prepared.url }),
      };
    },
  });

  // The agent at the canvas: plays scenes on a diagram it already drew, in the same view
  server.registerTool(
    'show_on_diagram',
    {
      title: 'Show on the diagram',
      description:
        'Walks the user through a diagram you drew with render_architecture, like a person at the canvas: switch level, zoom into a service or area, highlight resources (fading the rest), write notes next to them and pin code (e.g. an event\'s schema, copied from the files you read). Use it when the user asks to be shown or taught something ("how does this service work?", "show me the schema for OrderPlaced"). Pass the viewUrl render_architecture returned as `diagram`.',
      inputSchema: z.object({
        diagram: z.string().describe('The viewUrl from render_architecture (or the diagram link the view gave you)'),
        tour: tourInput,
      }),
      annotations: readOnly,
      _meta: loadView ? appViewMeta(VIEW_RESOURCE_URI) : undefined,
    },
    async ({ diagram, tour }) => {
      const { model, focus, level } = parseViewFragment(diagram);
      if (!model) {
        report({ ok: false, error_kind: 'invalid_link' });
        return {
          content: [{ type: 'text' as const, text: JSON.stringify({ error: 'diagram is not a valid diagram link: pass the viewUrl render_architecture returned' }) }],
          isError: true,
        };
      }
      const payload: ArchitecturePayload = { model, focus, level: level as ArchitecturePayload['level'], tour };
      const prepared = prepare(payload);
      if ('error' in prepared) return { content: [{ type: 'text' as const, text: JSON.stringify(prepared) }], isError: true };
      return {
        content: [
          {
            type: 'text' as const,
            text: JSON.stringify(
              {
                note: mcpAppNote(
                  'walkthrough',
                  'repeat the notes and code word for word',
                  'tell the user what each scene shows, and give them the viewUrl to see it'
                ),
                viewUrl: prepared.tourUrl ?? prepared.url,
                scenes: tour.map((scene, index) => `${index + 1}. ${scene.caption ?? scene.focus?.join(', ') ?? 'scene'}`),
              },
              null,
              2
            ),
          },
        ],
        ...(loadView && { _meta: { [VIEW_META_KEY]: { ...payload, viewUrl: prepared.url }, 'openai/widgetSessionId': SESSION_ID } }),
      };
    }
  );

  // A diagram link someone gave the agent (shared from the view, by a teammate or themselves): what's in it, to talk
  // about or build on (the model is in the link's fragment, compressed: agents can't read it as it is)
  server.registerTool(
    'read_diagram',
    {
      title: 'Read a diagram link',
      description:
        'Reads an EventCatalog Studio diagram link (one with #m= in it, e.g. shared by the user or a teammate) and returns its model: its resources, relations, notes, hotspots and comments (the summary lists the hotspots and open comments). Use it when the user pastes a diagram link, to understand it or build on it: change the model, then call render_architecture with it (keep their notes and layout).',
      inputSchema: z.object({ diagram: z.string().describe('The diagram link, e.g. https://…/#m=… or https://…/view#m=…') }),
      annotations: readOnly,
    },
    async ({ diagram }) => {
      const { model, focus, level } = parseViewFragment(diagram);
      if (!model) {
        report({ ok: false, error_kind: diagram.includes('#room=') ? 'live_session_link' : 'invalid_link' });
        return {
          content: [{ type: 'text' as const, text: JSON.stringify({ error: 'Not a diagram link with a diagram in it (#m=…). Live session links (#room=…) are end-to-end encrypted and cannot be read.' }) }],
          isError: true,
        };
      }
      report({ ok: true, ...modelStats(model), ...modelMix(model) });
      return {
        content: [
          {
            type: 'text' as const,
            text: JSON.stringify({ summary: summarise(model, []), ...(focus && { focus }), ...(level && { level }), model }, null, 2),
          },
        ],
      };
    }
  );

  // What agents learn first (the server's instructions and render_architecture tell them to): the vocabulary, the
  // relation rules, the JSON schema and an example
  server.registerTool(
    'get_architecture_schema',
    {
      title: 'Learn the architecture model',
      description:
        'Returns how to describe an architecture for render_architecture: the resource types, relation rules, summaries, schemas and links, notes, hotspots, comments, walkthroughs (show_on_diagram), levels, the JSON schema of the model and an example. Call it once, before your first render_architecture.',
      inputSchema: z.object({}),
      annotations: readOnly,
    },
    async () => ({ content: [{ type: 'text' as const, text: SCHEMA_GUIDE }] })
  );

  return server;
}
