/**
 * The collaborative canvas as an MCP App: openCanvas shows it in the chat (ChatGPT, Claude...), where it
 * joins the canvas (over the collaboration WebSocket, or through tool calls when the chat's sandbox blocks it).
 * The user edits it there with everyone else on it, people in EventCatalog and agents, live.
 *
 * Opened without a canvas (e.g. from ChatGPT's sidebar or a thread tab, its entrypoints), it lists the canvases
 * to open one or start one. Follows the OpenAI MCP extensions for ChatGPT: entrypoints, display modes, deep
 * links (/canvas/<id>) and model context (background context, and the selection as titled attachments).
 *
 * Built into a single HTML file by scripts/build-mcp-apps.mjs and served as a ui:// resource.
 */
import { useCallback, useEffect, useMemo, useState } from 'react';
import { ArrowLeft, ExternalLink, Maximize2, Minimize2, Plus, Users } from 'lucide-react';
import type { App } from '@modelcontextprotocol/ext-apps';
import styles from './styles.css?inline';
import visualiserStyles from '@eventcatalog/visualiser/styles.css?inline';
import StudioDesigner, { type SelectedNode } from '@features/studio/components/StudioDesigner';
import { STATUS } from '@features/studio/components/status';
import { getToolResultPayload, mountView, useMcpAppView } from '../shared/app-view';
import {
  CANVAS_CATALOG_TOOL,
  CANVAS_META_KEY,
  CANVAS_SYNC_TOOL,
  CANVAS_VIEW_TOOL,
  type CanvasCatalog,
  type CanvasHome,
  type CanvasPayload,
  type CanvasView,
} from './shared';
import type { SyncResponse, ToolSync } from '@features/studio/tool-sync';

const isCanvasPayload = (payload?: CanvasPayload): payload is CanvasPayload =>
  payload?.view === 'home' ? Array.isArray(payload.canvases) : Boolean(payload?.canvasId && payload.socketUrl);

const VIEW_OPTIONS = {
  name: 'EventCatalog canvas',
  metaKey: CANVAS_META_KEY,
  viewTool: CANVAS_VIEW_TOOL,
  isPayload: isCanvasPayload,
  getViewToolArguments: ({ canvasId }: Record<string, any>) => ({ canvasId }),
  loadErrorMessage: 'The canvas could not be opened',
};

const INLINE_HEIGHT = 640;
/** Deep links into the app (ChatGPT's `openai/deepLink`), e.g. /canvas/<id> */
const DEEP_LINK = /^\/canvas(?:es)?\/([0-9a-f-]{36})/i;

/** Loads what to show through a tool (the canvas view's own, or openCanvas to start a canvas) */
const loadPayload = async (app: App, name: string, args: Record<string, unknown>) => {
  const result = await app.callServerTool({ name, arguments: args });
  const payload = getToolResultPayload<CanvasPayload>(result, CANVAS_META_KEY);
  if (result.isError || !isCanvasPayload(payload)) throw new Error('The canvas could not be opened');
  return payload;
};

function CanvasPicker({
  home,
  onOpen,
  onCreate,
}: {
  home: CanvasHome;
  onOpen: (id: string) => void;
  onCreate: (title: string) => void;
}) {
  const [title, setTitle] = useState('');
  return (
    <div className="mx-auto max-w-2xl space-y-6 p-6">
      <div className="space-y-1">
        <h1 className="text-lg font-semibold">Canvases</h1>
        <p className="text-sm text-[rgb(var(--ec-page-text-muted))]">
          Work together, live: people in EventCatalog, people in chats and agents, on the same canvas.
        </p>
      </div>
      <form
        className="flex gap-2"
        onSubmit={(event) => {
          event.preventDefault();
          if (title.trim()) onCreate(title.trim());
        }}
      >
        <input
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          placeholder="What are you designing?"
          className="min-w-0 flex-1 rounded-lg border px-3 py-2 text-sm bg-[rgb(var(--ec-input-bg))] border-[rgb(var(--ec-input-border))] text-[rgb(var(--ec-input-text))]"
        />
        <button
          type="submit"
          disabled={!title.trim()}
          className="flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium disabled:opacity-50 bg-[rgb(var(--ec-button-bg))] text-[rgb(var(--ec-button-text))] hover:bg-[rgb(var(--ec-button-bg-hover))]"
        >
          <Plus size={16} /> New canvas
        </button>
      </form>
      <div className="space-y-2">
        {home.canvases.length === 0 && <p className="text-sm text-[rgb(var(--ec-page-text-muted))]">No canvases yet.</p>}
        {home.canvases.map((canvas) => (
          <button
            key={canvas.canvasId}
            onClick={() => onOpen(canvas.canvasId)}
            className="flex w-full items-center justify-between gap-3 rounded-xl border px-4 py-3 text-left bg-[rgb(var(--ec-card-bg))] border-[rgb(var(--ec-page-border))] hover:border-[rgb(var(--ec-accent))]"
          >
            <span className="min-w-0">
              <span className="block truncate text-sm font-semibold">{canvas.title ?? 'Untitled canvas'}</span>
              <span className="text-xs text-[rgb(var(--ec-page-text-muted))]">
                {canvas.nodeCount} {canvas.nodeCount === 1 ? 'node' : 'nodes'}
                {canvas.openComments > 0 && ` · ${canvas.openComments} open comments`}
              </span>
            </span>
            {canvas.people.length > 0 && (
              <span
                className={`flex shrink-0 items-center gap-1 text-xs ${STATUS.success.text}`}
                title={canvas.people.join(', ')}
              >
                <Users size={14} /> {canvas.people.length} here now
              </span>
            )}
          </button>
        ))}
      </div>
    </div>
  );
}

function CanvasApp() {
  const { app, payload, setPayload, error, hostContext } = useMcpAppView(VIEW_OPTIONS);
  const [catalog, setCatalog] = useState<CanvasCatalog>({ resources: [], relations: [] });
  const [selection, setSelection] = useState<SelectedNode[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const canvas = payload?.view === 'canvas' ? payload : undefined;

  const show = useCallback(
    (load: Promise<CanvasPayload>) =>
      load.then(setPayload).catch((cause) => setLoadError(String((cause as Error)?.message ?? cause))),
    [setPayload]
  );
  const openCanvas = (canvasId?: string) => app && show(loadPayload(app, CANVAS_VIEW_TOOL, canvasId ? { canvasId } : {}));

  // Deep links (ChatGPT's `openai/deepLink`): /canvas/<id> opens that canvas
  const deepLink = (hostContext as Record<string, { url?: string } | undefined> | undefined)?.['openai/deepLink']?.url;
  useEffect(() => {
    const canvasId = deepLink?.match(DEEP_LINK)?.[1];
    if (app && canvasId && canvasId !== canvas?.canvasId) void show(loadPayload(app, CANVAS_VIEW_TOOL, { canvasId }));
  }, [app, deepLink]);

  // Chats may not let the view open the collaboration WebSocket (sandbox CSP, local network rules...):
  // then it syncs through the MCP server, the same way the model's tools reach the canvas
  const syncViaTools = useMemo<ToolSync | undefined>(
    () =>
      app
        ? async (request) => {
            const result = await app.callServerTool({ name: CANVAS_SYNC_TOOL, arguments: request });
            if (result.isError || !result.structuredContent) throw new Error('Sync failed');
            return result.structuredContent as SyncResponse;
          }
        : undefined,
    [app]
  );

  // The catalog (to drag resources in) is loaded separately, to keep tool results small
  useEffect(() => {
    if (!app || !canvas) return;
    app
      .callServerTool({ name: CANVAS_CATALOG_TOOL, arguments: {} })
      .then((result) => {
        const loaded = result.structuredContent as CanvasCatalog | undefined;
        if (loaded?.resources) setCatalog(loaded);
      })
      .catch(() => {});
  }, [app, canvas?.canvasId]);

  // Model context (replaced on each update): which canvas is open as background context the user doesn't see,
  // and what they've selected as an attachment they can see (and remove), titled with the names
  useEffect(() => {
    if (!app || !payload || !app.getHostCapabilities()?.updateModelContext) return;
    const background = {
      type: 'text' as const,
      text: canvas
        ? `The user has the canvas "${canvas.title ?? 'Untitled'}" open (canvasId ${canvas.canvasId}). Use getCanvas to see what is on it, and the canvas tools to work on it with them.`
        : 'The user is looking at their canvases, to open one or start one.',
      annotations: { audience: ['assistant' as const] },
    };
    const selected = selection.length
      ? [
          {
            type: 'text' as const,
            text: `Selected on the canvas: ${selection
              .map(
                (node) =>
                  `${node.name} (${node.type}${node.catalogResource ? `, catalog ${node.catalogResource}` : ''}, nodeId ${node.id})`
              )
              .join('; ')}`,
            _meta: { 'openai/title': selection.map((node) => node.name).join(', ') },
          },
        ]
      : [];
    app.updateModelContext({ content: [background, ...selected] }).catch(() => {});
  }, [app, payload, selection]);

  if (error || loadError) return <p className="p-4 text-sm">{error ?? loadError}</p>;
  if (!payload) return <p className="p-4 text-sm text-[rgb(var(--ec-page-text-muted))]">Opening the canvas…</p>;

  const fullscreen = hostContext?.displayMode === 'fullscreen';
  const canToggle = hostContext?.availableDisplayModes?.includes(fullscreen ? 'inline' : 'fullscreen');
  const iconButton =
    'flex items-center gap-1 rounded-md px-2 py-1 text-xs text-[rgb(var(--ec-page-text-muted))] hover:bg-[rgb(var(--ec-page-border)/0.5)]';

  // No join form inside a chat: use the name the agent passed, or name them after the chat they're in
  const hostName = app?.getHostVersion()?.name;
  const userName = (view: CanvasView) =>
    view.userName ?? `${hostName ? hostName.replace(/^\w/, (letter) => letter.toUpperCase()) : 'Chat'} user`;

  return (
    <div className="flex flex-col" style={{ height: fullscreen ? '100vh' : INLINE_HEIGHT }}>
      <div className="flex items-center justify-between border-b px-3 py-1.5 border-[rgb(var(--ec-page-border))]">
        <span className="flex min-w-0 items-center gap-1">
          {canvas && (
            <button className={iconButton} title="All canvases" onClick={() => void openCanvas()}>
              <ArrowLeft size={14} />
            </button>
          )}
          <span className="truncate text-sm font-semibold">{canvas ? (canvas.title ?? 'Canvas') : 'Canvases'}</span>
        </span>
        <span className="flex items-center gap-1">
          {canvas && (
            <button className={iconButton} onClick={() => app?.openLink({ url: canvas.canvasUrl })}>
              <ExternalLink size={14} />
              Open in EventCatalog
            </button>
          )}
          {canToggle && (
            <button
              className={iconButton}
              title={fullscreen ? 'Exit full screen' : 'Full screen'}
              onClick={() => app?.requestDisplayMode({ mode: fullscreen ? 'inline' : 'fullscreen' })}
            >
              {fullscreen ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
            </button>
          )}
        </span>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto">
        {canvas ? (
          <StudioDesigner
            key={canvas.canvasId}
            canvasId={canvas.canvasId}
            socketUrl={canvas.socketUrl}
            shareUrl={canvas.canvasUrl}
            mcpUrl={canvas.mcpUrl}
            syncViaTools={syncViaTools}
            defaultName={userName(canvas)}
            resources={catalog.resources}
            relations={catalog.relations}
            onSelectionChange={setSelection}
            followChanges
          />
        ) : (
          <CanvasPicker
            home={payload as CanvasHome}
            onOpen={(canvasId) => void openCanvas(canvasId)}
            onCreate={(title) => app && void show(loadPayload(app, 'openCanvas', { title }))}
          />
        )}
      </div>
    </div>
  );
}

mountView(CanvasApp, [visualiserStyles, styles].join('\n'));
