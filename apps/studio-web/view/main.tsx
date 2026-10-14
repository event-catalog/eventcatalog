/**
 * The one view bundle, two entries: inside an MCP host (an iframe that gets the tool result) it's the MCP App;
 * in the browser it's the page, with the canvas kept in this browser and links (`/view#m=...`) opened into it.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import styles from './styles/view.css?inline';
import { mountView, useMcpAppView } from './ported/app-view';
import { architectureDiagramStyles, VISUALISER_BODY_CLASS } from './diagram-styles';
import { Diagram } from './Diagram';
import { parseViewFragment } from '../src/lib/encode';
import { type ArchitecturePayload, type Level } from '@eventcatalog/visualiser/model';
import { BLANK_PAYLOAD, hasContent, loadLocalCanvas, saveLocalCanvas } from './local-canvas';
import { ConfirmDialog } from './ConfirmDialog';
import { parseRoomFragment } from './collab/room';
import { isReturningVisitor, track, trackPageView } from './analytics';

const VIEW_META_KEY = 'eventcatalog/architecture';
const VIEW_TOOL = 'get_architecture_view';

const isPayload = (payload?: ArchitecturePayload): payload is ArchitecturePayload =>
  Array.isArray(payload?.model?.resources);

function McpApp() {
  const { app, payload, error, hostContext } = useMcpAppView<ArchitecturePayload>({
    name: 'EventCatalog',
    metaKey: VIEW_META_KEY,
    viewTool: VIEW_TOOL,
    isPayload,
    getViewToolArguments: ({ viewUrl }) => ({ viewUrl }),
    loadErrorMessage: 'The diagram could not be loaded',
  });
  useEffect(() => track('canvas_opened', { source: 'chat', returning: isReturningVisitor() }), []);
  if (error) return <p className="ec-mcp-message">{error}</p>;
  if (!payload) return <p className="ec-mcp-message">Waiting for the architecture…</p>;
  // Results from the agent are built up in front of the user
  return <Diagram app={app} payload={payload} hostContext={hostContext} animate />;
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
    const { model, focus, level, tour, from } = parseViewFragment(hash);
    return model ? { model, focus, level: level as Level | undefined, tour, from } : undefined;
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
      <Diagram payload={payload} fullPage reorderWhenOpened={opened} room={room} />
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
