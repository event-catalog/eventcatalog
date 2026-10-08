import { Fragment, memo, useEffect, useLayoutEffect, useRef, useSyncExternalStore, type MutableRefObject } from 'react';
import { useInternalNode, useStore, useStoreApi, ViewportPortal, type XYPosition } from '@xyflow/react';
import { Bot, Eye, EyeOff } from 'lucide-react';
import { sizeOf } from '../grouping';
import { usePeople, type Peer, type PresenceStore } from '../hooks/presence-store';
import { useFollowCamera } from '../hooks/use-follow-camera';
import Picture from './Picture';

/**
 * Other people on the canvas: their pointers, selections and the connections they're dragging. Drawn in the
 * canvas's own coordinates (React Flow's viewport portal), so panning and zooming move them without
 * re-rendering, and counter-scaled so they stay the same size on screen. Each person's pointer and marks follow
 * them on their own, so one pointer moving doesn't re-render anyone else's.
 */
export const RemotePresence = memo(function RemotePresence({
  store,
  clientId,
}: {
  store: PresenceStore | null;
  clientId: number | null;
}) {
  const people = usePeople(store);
  const zoom = useStore((state) => state.transform[2]);
  const scale = 1 / zoom;
  const others = store ? people.filter((peer) => peer.clientId !== clientId) : [];

  return (
    <ViewportPortal>
      {/* Above nodes (selected ones are raised to 1000) */}
      <div className="pointer-events-none absolute left-0 top-0" style={{ zIndex: 2000 }}>
        {others.map((peer) => (
          <Fragment key={peer.clientId}>
            <PeerMarks store={store!} clientId={peer.clientId} scale={scale} />
            {peer.pointer && <PeerPointer store={store!} peer={peer} scale={scale} />}
          </Fragment>
        ))}
      </div>
    </ViewportPortal>
  );
});

const findPeer = (store: PresenceStore, clientId: number) => store.getPeers().find((peer) => peer.clientId === clientId);

/** What a peer's marks show: re-rendered only when it changes */
const marksKey = (peer: Peer | undefined) =>
  peer
    ? [
        peer.selection.join(','),
        peer.connecting && peer.pointer ? [peer.connecting.x, peer.connecting.y, peer.pointer.x, peer.pointer.y].join(',') : '',
      ].join('|')
    : '';

/** Someone's selection, and the connection they're dragging (a dashed line from where it starts to their pointer) */
const PeerMarks = memo(function PeerMarks({ store, clientId, scale }: { store: PresenceStore; clientId: number; scale: number }) {
  useSyncExternalStore(store.subscribe, () => marksKey(findPeer(store, clientId)));
  const peer = findPeer(store, clientId);
  if (!peer) return null;
  return (
    <>
      {peer.selection.map((id) => (
        <SelectionOutline key={id} nodeId={id} name={peer.name} color={peer.color} scale={scale} />
      ))}
      {peer.pointer && peer.connecting && (
        <svg className="absolute left-0 top-0 overflow-visible" width={1} height={1}>
          <line
            x1={peer.connecting.x}
            y1={peer.connecting.y}
            x2={peer.pointer.x}
            y2={peer.pointer.y}
            stroke={peer.color}
            strokeWidth={2 * scale}
            strokeDasharray={`${6 * scale} ${4 * scale}`}
          />
          <circle cx={peer.connecting.x} cy={peer.connecting.y} r={4 * scale} fill={peer.color} />
        </svg>
      )}
    </>
  );
});

/** Longest a pointer takes to glide to where it was last seen (updates come about every 33 ms) */
const MAX_GLIDE_MS = 120;

/**
 * Someone's pointer, gliding from where it was to each new position over the time since the last one (so a
 * steady stream of updates looks like steady movement). Moved with a transform outside React: no re-renders.
 */
const PeerPointer = memo(function PeerPointer({ store, peer, scale }: { store: PresenceStore; peer: Peer; scale: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const shown = useRef<XYPosition | null>(null);
  const scaleRef = useRef(scale);
  scaleRef.current = scale;

  const draw = () => {
    if (ref.current && shown.current)
      ref.current.style.transform = `translate(${shown.current.x}px, ${shown.current.y}px) scale(${scaleRef.current})`;
  };

  useLayoutEffect(draw, [scale]);

  useLayoutEffect(() => {
    let target: XYPosition | null = null;
    let from: XYPosition = { x: 0, y: 0 };
    let start = 0;
    let duration = 0;
    let lastSeen = 0;
    let frame = 0;

    const step = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      if (target) shown.current = { x: from.x + (target.x - from.x) * t, y: from.y + (target.y - from.y) * t };
      draw();
      frame = t < 1 ? requestAnimationFrame(step) : 0;
    };

    const follow = () => {
      const pointer = findPeer(store, peer.clientId)?.pointer;
      if (!pointer || (target && pointer.x === target.x && pointer.y === target.y)) return;
      const now = performance.now();
      target = pointer;
      if (!shown.current) {
        shown.current = pointer;
        lastSeen = now;
        return draw();
      }
      from = shown.current;
      start = now;
      duration = Math.min(MAX_GLIDE_MS, Math.max(16, now - lastSeen));
      lastSeen = now;
      if (!frame) frame = requestAnimationFrame(step);
    };

    follow();
    const unsubscribe = store.subscribe(follow);
    return () => {
      unsubscribe();
      cancelAnimationFrame(frame);
    };
  }, [store, peer.clientId]);

  return (
    <div ref={ref} className="absolute left-0 top-0 will-change-transform" style={{ transformOrigin: '0 0' }}>
      {/* The pointer's outline is a light border on any background */}
      <svg width="18" height="18" viewBox="0 0 24 24" fill={peer.color} stroke="white" strokeWidth="1.5">
        <path d="M4 2l16 9-7 2-3 7z" />
      </svg>
      <span
        className="absolute left-4 top-4 flex items-center gap-1 whitespace-nowrap rounded px-1.5 py-0.5 text-[11px] font-medium text-white"
        style={{ backgroundColor: peer.color }}
      >
        {peer.agent && <Bot size={12} />}
        <Picture src={peer.picture} className="-ml-0.5 h-4 w-4 shrink-0" />
        {peer.name}
        {peer.activity && <span className="font-normal opacity-90">· {peer.activity}</span>}
      </span>
    </div>
  );
});

/** Someone's selection around a node: follows that node only, so other nodes moving don't re-render it */
const SelectionOutline = memo(function SelectionOutline({
  nodeId,
  name,
  color,
  scale,
}: {
  nodeId: string;
  name: string;
  color: string;
  scale: number;
}) {
  const node = useInternalNode(nodeId);
  if (!node) return null;
  const { width, height } = sizeOf(node);
  const { x, y } = node.internals.positionAbsolute;
  return (
    <div
      className="absolute"
      style={{
        left: x - 4 * scale,
        top: y - 4 * scale,
        width: width + 8 * scale,
        height: height + 8 * scale,
        border: `${2 * scale}px solid ${color}`,
        borderRadius: 8 * scale,
      }}
    >
      <span
        className="absolute right-0 top-0 whitespace-nowrap rounded px-1.5 text-[10px] leading-4 text-white"
        style={{ backgroundColor: color, transform: `translateY(-100%) scale(${scale})`, transformOrigin: 'bottom right' }}
      >
        {name}
      </span>
    </div>
  );
});

/**
 * Shares what we're looking at, so others can jump to it: the canvas position in the middle of the screen,
 * and the zoom. Follows React Flow's store (people's moves and code's, e.g. fit view) without rendering.
 */
export const ViewportSharer = memo(function ViewportSharer({
  onChange,
}: {
  onChange: (viewport: { x: number; y: number; zoom: number }) => void;
}) {
  const store = useStoreApi();
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    const share = () => {
      const {
        transform: [x, y, zoom],
        width,
        height,
      } = store.getState();
      onChange({ x: (width / 2 - x) / zoom, y: (height / 2 - y) / zoom, zoom });
    };
    const unsubscribe = store.subscribe((state, previous) => {
      if (state.transform === previous.transform && state.width === previous.width && state.height === previous.height) return;
      clearTimeout(timer);
      timer = setTimeout(share, 150);
    });
    share();
    return () => {
      unsubscribe();
      clearTimeout(timer);
    };
  }, [store, onChange]);
  return null;
});

/**
 * Agents at work: who's working (with a button to follow them or stop), and the camera following them while
 * they work (on by default inside a chat). `pause` is set for whoever moves the camera themselves.
 */
export const AgentActivity = memo(function AgentActivity({
  store,
  clientId,
  enabled,
  following,
  onToggleFollowing,
  pauseRef,
}: {
  store: PresenceStore | null;
  clientId: number | null;
  /** Off in the read only levels */
  enabled: boolean;
  following: boolean;
  onToggleFollowing: () => void;
  pauseRef: MutableRefObject<() => void>;
}) {
  const people = usePeople(store);
  const working = people.filter((peer) => peer.clientId !== clientId && peer.agent && peer.pointer);
  const camera = useFollowCamera({
    enabled: following && enabled,
    agentsWorking: working.length > 0,
    getAgents: () => (store?.getPeers() ?? []).filter((peer: Peer) => peer.clientId !== clientId && peer.agent && peer.pointer),
  });
  pauseRef.current = camera.pause;

  if (!enabled || working.length === 0) return null;
  return (
    <div className="absolute left-1/2 top-16 z-10 flex -translate-x-1/2 items-center gap-2 rounded-full border px-3 py-1 text-xs shadow-sm bg-[rgb(var(--ec-card-bg))] border-[rgb(var(--ec-page-border))]">
      <span className="flex -space-x-1">
        {working.map((agent) => (
          <span
            key={agent.clientId}
            className="h-2.5 w-2.5 rounded-full ring-2 ring-[rgb(var(--ec-card-bg))]"
            style={{ backgroundColor: agent.color }}
          />
        ))}
      </span>
      <span>
        {following ? 'Following' : ''} <span className="font-semibold">{working.map((agent) => agent.name).join(', ')}</span>
        {following ? '' : ` ${working.length === 1 ? 'is' : 'are'} working`}
      </span>
      <button
        onClick={onToggleFollowing}
        className="flex items-center gap-1 rounded-full px-2 py-0.5 font-medium text-[rgb(var(--ec-accent))] hover:bg-[rgb(var(--ec-accent-subtle))]"
      >
        {following ? <EyeOff size={12} /> : <Eye size={12} />}
        {following ? 'Stop' : 'Follow'}
      </button>
    </div>
  );
});
