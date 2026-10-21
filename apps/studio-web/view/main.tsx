/**
 * The one view bundle, two entries: inside an MCP host (an iframe that gets the tool result) it's the MCP App;
 * in the browser it's the page, with the canvas kept in this browser and links (`/view#m=...`) opened into it.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import styles from './styles/view.css?inline';
import { fullscreenStyle, mountView, useMcpAppView } from './ported/app-view';
import { architectureDiagramStyles, INLINE_HEIGHT, VISUALISER_BODY_CLASS } from './diagram-styles';
import { Diagram } from './Diagram';
import { parseViewFragment } from '../src/lib/encode';
import { type ArchitecturePayload, type Level } from '@eventcatalog/visualiser/model';
import { BLANK_PAYLOAD, hasContent, loadChatView, loadLocalCanvas, markChatViewShown, saveLocalCanvas } from './local-canvas';
import { ErrorBoundary } from './ErrorBoundary';
import { ConfirmDialog } from './ConfirmDialog';
import { parseRoomFragment } from './collab/room';
import { isReturningVisitor, sizeBucket, track, trackPageView } from './analytics';
import { DraftStage, useDraftDiagram } from './build/DraftStage';
import type { StageState } from './build/choreography';
import type { App } from '@modelcontextprotocol/ext-apps';

const VIEW_META_KEY = 'eventcatalog/architecture';
const VIEW_TOOL = 'get_architecture_view';

const isPayload = (payload?: ArchitecturePayload): payload is ArchitecturePayload =>
  Array.isArray(payload?.model?.resources);

const DRAFT_INLINE = { height: INLINE_HEIGHT };
/** The chat the view is in, by name (e.g. Claude), for the agent's pointer */
const hostName = (app?: App | null) => {
  const host = app?.getHostVersion()?.name?.replace(/[-_].*$/, '');
  return host ? host.replace(/^\w/, (letter) => letter.toUpperCase()) : 'Agent';
};

/** The agent's diagram as its tool result has it: with its id, for edit_diagram and read_diagram to reach it here */
type ChatPayload = ArchitecturePayload & { diagramId?: string };

function McpApp() {
  // The agent's diagram built up as it writes it, before the tool has run (hosts that stream the tool's arguments)
  const draft = useDraftDiagram();
  const { app, payload, error, hostContext, cancelled } = useMcpAppView<ChatPayload>({
    name: 'EventCatalog',
    metaKey: VIEW_META_KEY,
    viewTool: VIEW_TOOL,
    isPayload,
    getViewToolArguments: ({ viewUrl, diagramId }) => ({ viewUrl, ...(diagramId && { diagramId }) }),
    loadErrorMessage: 'The diagram could not be loaded',
    onToolInputPartial: draft.onPartial,
  });
  useEffect(() => track('canvas_opened', { source: 'chat', returning: isReturningVisitor() }), []);
  // Where the draft got to: the diagram's build carries on from there
  const drafted = useRef<StageState>(undefined);
  const onDraftPlaying = useCallback((stage: StageState) => (drafted.current = stage), []);
  useEffect(() => {
    if (!payload && !cancelled) return;
    const steps = draft.stop();
    if (steps) track('draft_played', { steps: sizeBucket(steps), finished: !!payload });
  }, [payload, cancelled]);

  // Shown before (the conversation opened again): as it was left, without the build again
  const diagramId = payload?.diagramId;
  const kept = useMemo(() => (diagramId ? loadChatView(diagramId) : undefined), [diagramId]);
  useEffect(() => {
    if (diagramId) markChatViewShown(diagramId);
  }, [diagramId]);
  const shown = useMemo(() => (payload && kept?.model ? { ...payload, model: kept.model } : payload), [payload, kept]);

  if (error) return <p className="ec-mcp-message">{error}</p>;
  if (!shown) {
    if (cancelled) return <p className="ec-mcp-message">The diagram was stopped before it was finished.</p>;
    const agentName = hostName(app);
    return draft.target ? (
      <div className="ec-diagram" style={hostContext?.displayMode === 'fullscreen' ? fullscreenStyle(hostContext) : DRAFT_INLINE}>
        <div className="ec-mcp-graph">
          <DraftStage target={draft.target} agentName={agentName} onPlaying={onDraftPlaying} />
        </div>
      </div>
    ) : (
      <p className="ec-mcp-message">
        {draft.progress ? `${agentName} is drawing ${draft.progress.title}: ${draft.progress.resources} resources so far…` : 'Waiting for the architecture…'}
      </p>
    );
  }
  // Built up in front of the user (carrying on from the draft), then changed in place as the agent edits it
  return (
    <ErrorBoundary>
      <Diagram app={app} payload={shown} hostContext={hostContext} animate={!kept} diagramId={diagramId} builtBefore={kept ? undefined : drafted.current} />
    </ErrorBoundary>
  );
}

function WebPage() {
  // A link (#m=...), opened here or pasted into this tab: what it has is opened into the canvas
  const [hash, setHash] = useState(window.location.hash);
  useEffect(() => {
    const onHashChange = () => setHash(window.location.hash);
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, []);
  const linked = useMemo(() => {
    const { model, focus, level, from } = parseViewFragment(hash);
    return model ? { model, focus, level: level as Level | undefined, from } : undefined;
  }, [hash]);

  // A live room's link (#room=<id>,<key>): it stays in the address bar (it's how the room's reached, and shared)
  const roomLink = useMemo(() => parseRoomFragment(hash), [hash]);
  const roomId = roomLink?.id;
  const roomKey = roomLink?.key;
  const room = useMemo(() => (roomId && roomKey ? { id: roomId, key: roomKey } : undefined), [roomId, roomKey]);

  // What's open: the canvas kept in this browser (as Excalidraw keeps its scene), else a blank one that welcomes
  // them; in a room, this browser's copy of it (the people there send what it's missing)
  const [payload, setPayload] = useState<ArchitecturePayload>(() => loadLocalCanvas(room?.id) ?? BLANK_PAYLOAD);
  // How they got here (analytics): a live room's invite, a diagram link (an agent's, or shared from Studio), the canvas
  // kept in this browser, or a blank one. Once per page load
  useEffect(() => {
    const from = linked ? (linked.from ? `${linked.from}-link` : 'link') : room ? 'room-link' : hasContent(payload.model) ? 'restored' : 'blank';
    trackPageView();
    track('canvas_opened', { source: from, returning: isReturningVisitor() });
  }, []);
  const shownRoom = useRef(room?.id);
  useEffect(() => {
    if (room?.id === shownRoom.current) return;
    shownRoom.current = room?.id;
    setPayload(loadLocalCanvas(room?.id) ?? BLANK_PAYLOAD);
  }, [room?.id]);
  // A link that would replace work on the canvas: asked about first
  const [replacing, setReplacing] = useState<ArchitecturePayload>();
  // A link opened is laid out again straight away (where it had things may not suit what's in it now)
  const [opened, setOpened] = useState<ArchitecturePayload>();
  const open = useCallback((next: ArchitecturePayload) => {
    setPayload(next);
    setOpened(next);
    saveLocalCanvas(next.model, next.level);
  }, []);
  useEffect(() => {
    if (!linked) return;
    // Read: back on the home page with a clean address (the canvas is kept in this browser; links are made when
    // it's shared), whether it was opened at /view or /
    try {
      window.history.replaceState(window.history.state, '', '/' + window.location.search);
    } catch {}
    setHash('');
    const current = loadLocalCanvas();
    const same = current && JSON.stringify(current.model) === JSON.stringify(linked.model);
    if (hasContent(current?.model) && !same) setReplacing(linked);
    else open(linked);
  }, [linked, open]);

  useEffect(() => {
    document.title = hasContent(payload.model) ? `${payload.model.title} · EventCatalog Studio` : 'EventCatalog Studio';
  }, [payload.model]);

  return (
    <>
      <ErrorBoundary>
        <Diagram payload={payload} fullPage reorderWhenOpened={opened} room={room} />
      </ErrorBoundary>
      <ConfirmDialog
        open={!!replacing}
        title="Open this diagram?"
        confirmLabel="Open it"
        cancelLabel="Keep my canvas"
        danger
        onConfirm={() => {
          track('link_replace_answered', { choice: 'open' });
          if (replacing) open(replacing);
          setReplacing(undefined);
        }}
        onCancel={() => {
          track('link_replace_answered', { choice: 'keep' });
          setReplacing(undefined);
        }}
      >
        It replaces what's on your canvas{replacing ? ` with "${replacing.model.title}"` : ''}. Save your canvas to a file first if you want to keep it.
      </ConfirmDialog>
    </>
  );
}

document.body.classList.add(VISUALISER_BODY_CLASS);
// In the browser, the theme picked before (else light) from the start, so it doesn't flash (in chats, the host sets it)
try {
  if (window.parent === window) {
    const picked = localStorage.getItem('ec-mcp-theme');
    const dark = picked === 'dark' || (picked === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
    document.documentElement.setAttribute('data-theme', dark ? 'dark' : 'light');
  }
} catch {}
const isWeb = window.location.hash.includes('m=') || window.parent === window;
mountView(isWeb ? WebPage : McpApp, [styles, architectureDiagramStyles].join('\n'));
