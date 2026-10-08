import {
  createContext,
  memo,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
} from 'react';
import { createPortal } from 'react-dom';
import { useInternalNode, useReactFlow, useStore, ViewportPortal, type Node, type XYPosition } from '@xyflow/react';
import { Bot, Check, Maximize2, ClipboardPaste, Copy, CopyPlus, MessageCircle, Pencil, RotateCcw, Trash2, X } from 'lucide-react';
import { getAbsolutePosition } from '../grouping';
import type { Author, CommentAnchor, Thread } from '../hooks/use-comments';
import { isWrittenOnCanvas } from '../node-types';
import { STATUS } from './status';
import Picture from './Picture';

const initials = (name: string) => name.slice(0, 2).toUpperCase();

export const timeAgo = (timestamp: number) => {
  const seconds = Math.round((Date.now() - timestamp) / 1000);
  if (seconds < 60) return 'just now';
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return new Date(timestamp).toLocaleDateString();
};

/** Where a pin sits on the canvas: on its node (so it moves with it), or where it was dropped */
export const getAnchorPosition = (anchor: CommentAnchor, nodesById: Map<string, Node>): XYPosition => {
  const node = anchor.nodeId ? nodesById.get(anchor.nodeId) : undefined;
  if (!node || !anchor.offset) return anchor.position;
  // Nodes in containers are positioned relative to them
  const position = getAbsolutePosition(node, nodesById);
  return { x: position.x + anchor.offset.x, y: position.y + anchor.offset.y };
};

/** Pinned to a node, a comment keeps its offset from the node so it moves with it */
export const anchorAt = (position: XYPosition, node?: Node, nodesById?: Map<string, Node>): CommentAnchor => {
  if (!node) return { position };
  const nodePosition = getAbsolutePosition(node, nodesById ?? new Map([[node.id, node]]));
  return { position, nodeId: node.id, offset: { x: position.x - nodePosition.x, y: position.y - nodePosition.y } };
};

const DRAG_THRESHOLD_PX = 4;

const panelClass =
  'nowheel nodrag nopan absolute z-40 w-72 rounded-xl border shadow-xl bg-[rgb(var(--ec-card-bg))] border-[rgb(var(--ec-page-border))] text-[rgb(var(--ec-page-text))]';

/** The people in a thread, in the order they joined it (the pin shows the first few, like Figma) */
const participantsOf = (thread: Thread): Author[] => {
  const seen = new Map<string, Author>([[thread.author.name, thread.author]]);
  for (const message of thread.messages) if (!seen.has(message.author.name)) seen.set(message.author.name, message.author);
  return [...seen.values()];
};
const MAX_PIN_AVATARS = 3;
/** How long the pointer rests on a pin before it opens its preview (passing over pins leaves them closed) */
const PREVIEW_DELAY_MS = 500;
const repliesLabel = (count: number) => (count === 1 ? '1 reply' : `${count} replies`);

function Avatar({ author, muted, size = 'h-6 w-6' }: { author: Author; muted?: boolean; size?: string }) {
  return (
    <span
      title={author.name}
      className={`relative flex ${size} shrink-0 items-center justify-center rounded-full text-[10px] font-semibold text-white ring-2 ring-[rgb(var(--ec-card-bg))]`}
      style={{ backgroundColor: muted ? 'rgb(var(--ec-page-text-muted))' : author.color }}
    >
      {author.agent ? <Bot size={13} /> : initials(author.name)}
      <Picture src={author.picture} className={`absolute inset-0 h-full w-full ${muted ? 'opacity-50 grayscale' : ''}`} />
    </span>
  );
}

/**
 * A comment pin, like Figma's: a speech bubble with the people in the thread, that opens into a preview of it
 * (who started it, when, what they said and how many replies) once the pointer rests on it. Click opens the
 * thread, dragging moves it: `onDrag` gets the screen point the pin's tip (its bottom left corner) is over,
 * keeping where on the pin it was grabbed.
 */
function Pin({
  author,
  thread,
  active,
  selected,
  resolved,
  onClick,
  onDrag,
}: {
  author: Author;
  /** The thread it's for (a new comment being written has none yet) */
  thread?: Thread;
  active?: boolean;
  /** Part of what's selected on the canvas (e.g. after selecting everything) */
  selected?: boolean;
  resolved?: boolean;
  onClick?: () => void;
  onDrag?: (tip: XYPosition, phase: 'move' | 'end') => void;
}) {
  const drag = useRef<{ start: XYPosition; grab: XYPosition; moved: boolean } | null>(null);
  const [hovered, setHovered] = useState(false);
  const hoverTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
  useEffect(() => () => clearTimeout(hoverTimer.current), []);
  const [pressed, setPressed] = useState(false);
  const tipOf = (event: { clientX: number; clientY: number }) => ({
    x: event.clientX - drag.current!.grab.x,
    y: event.clientY - drag.current!.grab.y,
  });
  const people = thread ? participantsOf(thread) : [author];
  const [first, ...rest] = thread?.messages ?? [];
  // The preview shows while the pointer is over the pin, not while the thread is open or the pin is dragged
  const expanded = !!thread && !!first && hovered && !active && !pressed;

  return (
    <button
      onPointerEnter={() => {
        clearTimeout(hoverTimer.current);
        hoverTimer.current = setTimeout(() => setHovered(true), PREVIEW_DELAY_MS);
      }}
      onPointerLeave={() => {
        clearTimeout(hoverTimer.current);
        setHovered(false);
      }}
      onPointerDown={(event) => {
        if (event.button !== 0) return;
        // Keeps pointer events coming while the pointer is outside the pin (throws if the pointer has gone)
        try {
          event.currentTarget.setPointerCapture(event.pointerId);
        } catch {}
        setPressed(true);
        const rect = event.currentTarget.getBoundingClientRect();
        drag.current = {
          start: { x: event.clientX, y: event.clientY },
          grab: { x: event.clientX - rect.left, y: event.clientY - rect.bottom },
          moved: false,
        };
      }}
      onPointerMove={(event) => {
        const current = drag.current;
        if (!current || !onDrag) return;
        const distance = Math.hypot(event.clientX - current.start.x, event.clientY - current.start.y);
        if (!current.moved && distance < DRAG_THRESHOLD_PX) return;
        current.moved = true;
        onDrag(tipOf(event), 'move');
      }}
      onPointerUp={(event) => {
        const current = drag.current;
        setPressed(false);
        if (!current) return;
        if (current.moved) onDrag?.(tipOf(event), 'end');
        else onClick?.();
        drag.current = null;
      }}
      onPointerCancel={() => {
        drag.current = null;
        setPressed(false);
      }}
      // Keyboard activation (pointer clicks are handled on pointer up)
      onClick={(event) => event.detail === 0 && onClick?.()}
      aria-label={
        thread ? `Comment by ${thread.author.name}${rest.length ? `, ${repliesLabel(rest.length)}` : ''}` : 'New comment'
      }
      className={`block cursor-grab rounded-[18px] rounded-bl-none border p-1 text-left shadow-lg transition-[box-shadow,transform] active:cursor-grabbing bg-[rgb(var(--ec-card-bg))] border-[rgb(var(--ec-page-border))] text-[rgb(var(--ec-page-text))] ${
        active ? 'ring-2 ring-[rgb(var(--ec-accent))]' : ''
      } ${expanded ? 'w-64' : ''}`}
      // Selected: a ring in the theme's button colour (strong in light and dark themes)
      style={selected ? { boxShadow: '0 0 0 2px rgb(var(--ec-card-bg)), 0 0 0 4px rgb(var(--ec-button-bg))' } : undefined}
    >
      {expanded ? (
        <span className="block space-y-1 px-1.5 py-1">
          <span className="flex items-center gap-2">
            <span className="flex -space-x-0.5">
              {people.slice(0, MAX_PIN_AVATARS).map((person) => (
                <Avatar key={person.name} author={person} muted={resolved} size="h-5 w-5" />
              ))}
            </span>
            <span className="min-w-0 truncate text-xs font-semibold">{thread.author.name}</span>
            <span className="shrink-0 text-[11px] text-[rgb(var(--ec-page-text-muted))]">{timeAgo(first.createdAt)}</span>
          </span>
          <span className="line-clamp-3 block whitespace-pre-wrap break-words text-xs">{first.text}</span>
          {(rest.length > 0 || resolved) && (
            <span className="flex items-center gap-2 text-[11px] font-medium text-[rgb(var(--ec-page-text-muted))]">
              {rest.length > 0 && <span>{repliesLabel(rest.length)}</span>}
              {resolved && (
                <span className={`flex items-center gap-0.5 ${STATUS.success.text}`}>
                  <Check size={11} /> Resolved
                </span>
              )}
            </span>
          )}
        </span>
      ) : (
        <span className="flex -space-x-1">
          {people.slice(0, MAX_PIN_AVATARS).map((person) => (
            <Avatar key={person.name} author={person} muted={resolved} />
          ))}
          {people.length > MAX_PIN_AVATARS && (
            <span className="flex h-6 w-6 items-center justify-center rounded-full text-[10px] font-semibold ring-2 ring-[rgb(var(--ec-card-bg))] bg-[rgb(var(--ec-page-border))]">
              +{people.length - MAX_PIN_AVATARS}
            </span>
          )}
        </span>
      )}
    </button>
  );
}

function Composer({
  placeholder,
  onSubmit,
  onCancel,
}: {
  placeholder: string;
  onSubmit: (text: string) => void;
  onCancel?: () => void;
}) {
  const [text, setText] = useState('');
  const submit = () => {
    if (!text.trim()) return;
    onSubmit(text.trim());
    setText('');
  };

  return (
    <div className="flex items-end gap-2 p-2">
      <textarea
        autoFocus
        rows={1}
        value={text}
        placeholder={placeholder}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            submit();
          }
          if (e.key === 'Escape') onCancel?.();
        }}
        className="max-h-32 min-h-[34px] flex-1 resize-none rounded-md border px-2 py-1.5 text-sm bg-[rgb(var(--ec-input-bg))] border-[rgb(var(--ec-input-border))] text-[rgb(var(--ec-input-text))]"
      />
      <button
        onClick={submit}
        disabled={!text.trim()}
        className="rounded-md px-2.5 py-1.5 text-xs font-medium disabled:opacity-40 bg-[rgb(var(--ec-button-bg))] text-[rgb(var(--ec-button-text))]"
      >
        Post
      </button>
    </div>
  );
}

function IconButton({ title, onClick, children }: { title: string; onClick: () => void; children: ReactNode }) {
  return (
    <button
      title={title}
      onClick={onClick}
      className="rounded p-1 text-[rgb(var(--ec-icon-color))] hover:bg-[rgb(var(--ec-page-border)/0.5)] hover:text-[rgb(var(--ec-icon-hover))]"
    >
      {children}
    </button>
  );
}

/** Room kept between a thread's box and the edges of the canvas */
const PANEL_MARGIN_PX = 12;
/** A thread's box is at most this tall: longer threads scroll (or open bigger, in a dialog) */
const PANEL_MAX_HEIGHT_PX = 360;
/** What drags a thread's box around (its header) */
const DragPanelContext = createContext<((event: ReactPointerEvent<HTMLElement>) => void) | null>(null);

/**
 * The box a thread (or a new comment) opens in, beside its pin. It opens moved up as far as needed to be fully
 * on the canvas, and can be dragged around by its header to see more of the canvas or of a long thread. Where it's
 * been moved is only here, and goes when it closes.
 */
function FloatingPanel({ children }: { children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const [offset, setOffset] = useState<XYPosition>({ x: 0, y: 0 });
  const offsetRef = useRef(offset);
  offsetRef.current = offset;

  // Opened low on the canvas, or grown past the bottom of it (replies): moved up so its bottom (and the reply box)
  // can be seen
  useEffect(() => {
    const element = ref.current;
    if (!element) return;
    const fit = () => {
      const rect = element.getBoundingClientRect();
      const canvas = element.closest('.react-flow')?.getBoundingClientRect() ?? { top: 0, bottom: window.innerHeight };
      const up = Math.min(rect.bottom - (canvas.bottom - PANEL_MARGIN_PX), rect.top - (canvas.top + PANEL_MARGIN_PX));
      if (up > 0) setOffset((current) => ({ x: current.x, y: current.y - up }));
    };
    const observer = new ResizeObserver(fit);
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  // Pin and box are counter-scaled with the zoom, so the box moves by as much as the pointer does on screen
  const startDrag = useCallback((event: ReactPointerEvent<HTMLElement>) => {
    if (event.button !== 0 || (event.target as Element).closest('button')) return;
    event.preventDefault();
    const element = event.currentTarget;
    element.setPointerCapture(event.pointerId);
    const start = { x: event.clientX, y: event.clientY };
    const from = offsetRef.current;
    const move = (moveEvent: PointerEvent) =>
      setOffset({ x: from.x + moveEvent.clientX - start.x, y: from.y + moveEvent.clientY - start.y });
    const end = () => {
      element.removeEventListener('pointermove', move);
      element.removeEventListener('pointerup', end);
      element.removeEventListener('pointercancel', end);
    };
    element.addEventListener('pointermove', move);
    element.addEventListener('pointerup', end);
    element.addEventListener('pointercancel', end);
  }, []);

  return (
    <div
      ref={ref}
      className={`${panelClass} flex flex-col`}
      style={{
        left: `calc(100% + 8px + ${offset.x}px)`,
        top: offset.y,
        maxHeight: PANEL_MAX_HEIGHT_PX,
      }}
    >
      <DragPanelContext.Provider value={startDrag}>{children}</DragPanelContext.Provider>
    </div>
  );
}

function ThreadPopover({
  thread,
  onReply,
  onResolve,
  onDelete,
  onClose,
  onExpand,
}: {
  thread: Thread;
  onReply: (text: string) => void;
  onResolve: (resolved: boolean) => void;
  onDelete: () => void;
  onClose: () => void;
  /** Open it bigger, in a dialog (not there when it's already in one) */
  onExpand?: () => void;
}) {
  const listRef = useRef<HTMLDivElement>(null);
  const startDrag = useContext(DragPanelContext);
  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight });
  }, [thread.messages.length]);

  return (
    <>
      <div
        onPointerDown={startDrag ?? undefined}
        title={startDrag ? 'Drag to move' : undefined}
        className={`flex shrink-0 select-none items-center justify-between border-b px-3 py-2 border-[rgb(var(--ec-page-border))] ${
          startDrag ? 'cursor-move' : ''
        }`}
      >
        <span className="text-xs font-semibold">{thread.resolved ? 'Resolved thread' : 'Thread'}</span>
        <span className="flex items-center gap-0.5">
          <IconButton title={thread.resolved ? 'Reopen' : 'Resolve'} onClick={() => onResolve(!thread.resolved)}>
            {thread.resolved ? <RotateCcw size={14} /> : <Check size={14} />}
          </IconButton>
          <IconButton title="Delete thread" onClick={onDelete}>
            <Trash2 size={14} />
          </IconButton>
          {onExpand && (
            <IconButton title="Open bigger" onClick={onExpand}>
              <Maximize2 size={14} />
            </IconButton>
          )}
          <IconButton title="Close" onClick={onClose}>
            <X size={14} />
          </IconButton>
        </span>
      </div>
      <div ref={listRef} className="min-h-0 flex-1 space-y-3 overflow-y-auto px-3 py-3">
        {thread.messages.map((message) => (
          <div key={message.id} className="flex gap-2">
            <span
              className="relative flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[10px] font-semibold text-white"
              style={{ backgroundColor: message.author.color }}
            >
              {message.author.agent ? <Bot size={13} /> : initials(message.author.name)}
              <Picture src={message.author.picture} />
            </span>
            <div className="min-w-0">
              <p className="text-xs">
                <span className="font-semibold">{message.author.name}</span>{' '}
                <span className="text-[rgb(var(--ec-page-text-muted))]">{timeAgo(message.createdAt)}</span>
              </p>
              <p className="whitespace-pre-wrap break-words text-sm">{message.text}</p>
            </div>
          </div>
        ))}
      </div>
      <div className="shrink-0 border-t border-[rgb(var(--ec-page-border))]">
        <Composer placeholder="Reply" onSubmit={onReply} onCancel={onClose} />
      </div>
    </>
  );
}

/** A thread opened bigger, in a dialog over the page (for long threads) */
function ThreadDialog({
  thread,
  onReply,
  onResolve,
  onDelete,
  onShrink,
  onClose,
}: {
  thread: Thread;
  onReply: (text: string) => void;
  onResolve: (resolved: boolean) => void;
  onDelete: () => void;
  /** Back to the box beside its pin */
  onShrink: () => void;
  onClose: () => void;
}) {
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => event.key === 'Escape' && onShrink();
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [onShrink]);
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      // It's in the canvas's React tree (a portal), so its events would reach the canvas: they stop here (clicks in
      // the dialog stop at it)
      onClick={(event) => {
        event.stopPropagation();
        onShrink();
      }}
      onPointerDown={(event) => event.stopPropagation()}
      onMouseDown={(event) => event.stopPropagation()}
      onDoubleClick={(event) => event.stopPropagation()}
      onContextMenu={(event) => event.stopPropagation()}
      onWheel={(event) => event.stopPropagation()}
    >
      <div
        role="dialog"
        aria-label="Comment thread"
        onClick={(event) => event.stopPropagation()}
        className="flex max-h-[80vh] w-full max-w-xl flex-col rounded-xl border shadow-2xl bg-[rgb(var(--ec-card-bg))] border-[rgb(var(--ec-page-border))] text-[rgb(var(--ec-page-text))]"
      >
        <ThreadPopover thread={thread} onReply={onReply} onResolve={onResolve} onDelete={onDelete} onClose={onClose} />
      </div>
    </div>
  );
}

/** Where a pin goes on the canvas, following only the node it's on (if it's on one), counter-scaled */
function PinAt({ anchor, zoom, zIndex, children }: { anchor: CommentAnchor; zoom: number; zIndex: number; children: ReactNode }) {
  const node = useInternalNode(anchor.nodeId ?? '');
  const origin = anchor.nodeId && anchor.offset ? node?.internals.positionAbsolute : undefined;
  const { x, y } = origin && anchor.offset ? { x: origin.x + anchor.offset.x, y: origin.y + anchor.offset.y } : anchor.position;
  return (
    <div className="absolute" style={{ left: x, top: y, transform: `scale(${1 / zoom})`, transformOrigin: '0 0', zIndex }}>
      {/* The pin's tip (bottom left corner) sits on the anchor point, and it grows up and right as it opens */}
      <div className="nopan nodrag nowheel pointer-events-auto absolute bottom-0 left-0">{children}</div>
    </div>
  );
}

/**
 * Comment pins (and the open thread) on the canvas, in its own coordinates (React Flow's viewport portal) so
 * they move with it without re-rendering, counter-scaled to stay the same size on screen. Each pin follows
 * only its own node, so other nodes moving don't re-render them.
 */
export const CommentLayer = memo(function CommentLayer({
  threads,
  author,
  openThreadId,
  draft,
  showResolved,
  onOpen,
  onCreate,
  onCancelDraft,
  onReply,
  onResolve,
  onDelete,
  onMove,
  onMoveDraft,
  selectedIds,
  selectionOffset,
}: {
  threads: Thread[];
  author: Author;
  openThreadId: string | null;
  /** Threads that are part of what's selected */
  selectedIds: ReadonlySet<string>;
  /** How far what's selected has been dragged: selected pins not on a node move with it */
  selectionOffset: XYPosition | null;
  draft: CommentAnchor | null;
  showResolved: boolean;
  onOpen: (threadId: string | null) => void;
  onCreate: (text: string) => void;
  onCancelDraft: () => void;
  onReply: (threadId: string, text: string) => void;
  onResolve: (threadId: string, resolved: boolean) => void;
  onDelete: (threadId: string) => void;
  onMove: (threadId: string, anchor: CommentAnchor) => void;
  onMoveDraft: (anchor: CommentAnchor) => void;
}) {
  const zoom = useStore((state) => state.transform[2]);
  const { screenToFlowPosition, getInternalNode } = useReactFlow();
  // A pin being dragged stays here until it's dropped, then moves for everyone
  const [moving, setMoving] = useState<{ threadId: string; anchor: CommentAnchor } | null>(null);
  // The open thread, shown bigger in a dialog
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const expanded = expandedId && expandedId === openThreadId ? threads.find((thread) => thread.id === expandedId) : undefined;

  // While dragging, a pin follows the pointer. Dropped on a node it attaches to it (and moves with it),
  // anywhere else it stays on the canvas.
  const nodeUnder = (point: XYPosition) => {
    const element = document.elementsFromPoint(point.x, point.y).find((el) => el.closest('.react-flow__node'));
    const id = element?.closest('.react-flow__node')?.getAttribute('data-id');
    return id ? getInternalNode(id) : undefined;
  };
  const anchorFor = (tip: XYPosition, phase: 'move' | 'end'): CommentAnchor => {
    const position = screenToFlowPosition(tip);
    const node = phase === 'end' ? nodeUnder(tip) : undefined;
    if (!node) return { position };
    const origin = node.internals.positionAbsolute;
    return { position, nodeId: node.id, offset: { x: position.x - origin.x, y: position.y - origin.y } };
  };

  const visible = threads.filter((thread) => showResolved || !thread.resolved || thread.id === openThreadId);

  return (
    <ViewportPortal>
      {/* Above nodes (selected ones are raised to 1000) and other people's pointers */}
      <div className="absolute left-0 top-0" style={{ zIndex: 2001 }}>
        {visible.map((thread) => {
          const isOpen = thread.id === openThreadId;
          return (
            <PinAt
              key={thread.id}
              anchor={
                moving?.threadId === thread.id
                  ? moving.anchor
                  : selectionOffset && !thread.nodeId && selectedIds.has(thread.id)
                    ? { position: { x: thread.position.x + selectionOffset.x, y: thread.position.y + selectionOffset.y } }
                    : thread
              }
              zoom={zoom}
              zIndex={isOpen ? 2 : 1}
            >
              <Pin
                author={thread.author}
                thread={thread}
                active={isOpen}
                selected={selectedIds.has(thread.id)}
                resolved={thread.resolved}
                onClick={() => onOpen(isOpen ? null : thread.id)}
                onDrag={(tip, phase) => {
                  if (phase === 'move') return setMoving({ threadId: thread.id, anchor: anchorFor(tip, phase) });
                  onMove(thread.id, anchorFor(tip, phase));
                  setMoving(null);
                }}
              />
              {/* (not while it's open bigger, in the dialog) */}
              {isOpen && expanded?.id !== thread.id && (
                <FloatingPanel>
                  <ThreadPopover
                    thread={thread}
                    onReply={(text) => onReply(thread.id, text)}
                    onResolve={(resolved) => onResolve(thread.id, resolved)}
                    onDelete={() => onDelete(thread.id)}
                    onClose={() => onOpen(null)}
                    onExpand={() => setExpandedId(thread.id)}
                  />
                </FloatingPanel>
              )}
            </PinAt>
          );
        })}

        {expanded &&
          createPortal(
            <ThreadDialog
              thread={expanded}
              onReply={(text) => onReply(expanded.id, text)}
              onResolve={(resolved) => onResolve(expanded.id, resolved)}
              onDelete={() => {
                setExpandedId(null);
                onDelete(expanded.id);
              }}
              onShrink={() => setExpandedId(null)}
              onClose={() => {
                setExpandedId(null);
                onOpen(null);
              }}
            />,
            document.body
          )}

        {draft && (
          <PinAt anchor={draft} zoom={zoom} zIndex={3}>
            <Pin author={author} active onDrag={(tip, phase) => onMoveDraft(anchorFor(tip, phase))} />
            <FloatingPanel>
              <Composer placeholder="Add a comment" onSubmit={onCreate} onCancel={onCancelDraft} />
            </FloatingPanel>
          </PinAt>
        )}
      </div>
    </ViewportPortal>
  );
});

export type ContextMenuState = { x: number; y: number; flowPosition: XYPosition; node?: Node } | null;

export const CanvasContextMenu = memo(function CanvasContextMenu({
  menu,
  onAddComment,
  onEditDetails,
  onCopy,
  onDuplicate,
  onPaste,
  onDeleteNode,
  onClose,
}: {
  menu: ContextMenuState;
  onAddComment: () => void;
  /** Open the node's details in the panel (not for notes, which are edited on the canvas) */
  onEditDetails: () => void;
  /** Copy the node (or the selection it's in) */
  onCopy: () => void;
  onDuplicate: () => void;
  /** Paste what was last copied where the menu was opened, if anything was */
  onPaste?: () => void;
  /** Delete the node (or the selection it's in) */
  onDeleteNode: () => void;
  onClose: () => void;
}) {
  useEffect(() => {
    if (!menu) return;
    const close = (event: Event) => {
      if (event instanceof KeyboardEvent && event.key !== 'Escape') return;
      onClose();
    };
    window.addEventListener('pointerdown', close);
    window.addEventListener('keydown', close);
    window.addEventListener('wheel', close);
    return () => {
      window.removeEventListener('pointerdown', close);
      window.removeEventListener('keydown', close);
      window.removeEventListener('wheel', close);
    };
  }, [menu, onClose]);

  if (!menu) return null;

  const itemClass =
    'flex w-full items-center gap-2 rounded px-2.5 py-1.5 text-left text-xs hover:bg-[rgb(var(--ec-page-border)/0.5)]';
  const shortcutClass = 'ml-auto text-[rgb(var(--ec-page-text-muted))]';

  return (
    <div
      // Keep the window pointerdown listener from closing the menu before a click lands
      onPointerDown={(e) => e.stopPropagation()}
      className="fixed z-50 w-44 rounded-lg border p-1 shadow-xl bg-[rgb(var(--ec-card-bg))] border-[rgb(var(--ec-page-border))] text-[rgb(var(--ec-page-text))]"
      style={{ left: menu.x, top: menu.y }}
    >
      <button className={itemClass} onClick={onAddComment}>
        <MessageCircle size={14} />
        Add comment
        <span className={shortcutClass}>C</span>
      </button>
      {menu.node && (
        <>
          {!isWrittenOnCanvas(menu.node.type) && (
            <button className={itemClass} onClick={onEditDetails}>
              <Pencil size={14} />
              Edit details
            </button>
          )}
          <button className={itemClass} onClick={onCopy}>
            <Copy size={14} />
            Copy
            <span className={shortcutClass}>⌘C</span>
          </button>
          <button className={itemClass} onClick={onDuplicate}>
            <CopyPlus size={14} />
            Duplicate
            <span className={shortcutClass}>⌘D</span>
          </button>
          <div className="my-1 h-px bg-[rgb(var(--ec-page-border))]" />
          <button className={`${itemClass} ${STATUS.danger.text}`} onClick={onDeleteNode}>
            <Trash2 size={14} />
            Delete
            <span className={shortcutClass}>⌫</span>
          </button>
        </>
      )}
      {!menu.node && onPaste && (
        <button className={itemClass} onClick={onPaste}>
          <ClipboardPaste size={14} />
          Paste here
          <span className={shortcutClass}>⌘V</span>
        </button>
      )}
    </div>
  );
});

/** All threads, for the left panel. Clicking one opens it on the canvas. */
export function CommentList({
  threads,
  showResolved,
  onToggleResolved,
  onOpen,
}: {
  threads: Thread[];
  showResolved: boolean;
  onToggleResolved: () => void;
  onOpen: (thread: Thread) => void;
}) {
  const shown = threads.filter((thread) => showResolved || !thread.resolved).reverse();

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <label className="mx-3 mb-2 flex items-center gap-2 text-xs text-[rgb(var(--ec-page-text-muted))]">
        <input type="checkbox" checked={showResolved} onChange={onToggleResolved} />
        Show resolved
      </label>
      <div className="min-h-0 flex-1 space-y-1.5 overflow-y-auto px-3 pb-3">
        {shown.length === 0 && (
          <p className="py-6 text-center text-xs text-[rgb(var(--ec-page-text-muted))]">
            No comments yet. Right click the canvas, or press C, to add one.
          </p>
        )}
        {shown.map((thread) => {
          const [first, ...replies] = thread.messages;
          return (
            <button
              key={thread.id}
              onClick={() => onOpen(thread)}
              className={`w-full space-y-1 rounded-md border px-2.5 py-2 text-left bg-[rgb(var(--ec-page-bg))] border-[rgb(var(--ec-page-border))] hover:border-[rgb(var(--ec-accent))] ${
                thread.resolved ? 'opacity-60' : ''
              }`}
            >
              <p className="flex items-center gap-1.5 text-xs">
                <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: thread.author.color }} />
                <span className="font-semibold">{thread.author.name}</span>
                <span className="text-[rgb(var(--ec-page-text-muted))]">{timeAgo(thread.createdAt)}</span>
                {thread.resolved && <Check size={12} className={`ml-auto ${STATUS.success.text}`} />}
              </p>
              <p className="line-clamp-2 text-xs">{first?.text}</p>
              {replies.length > 0 && (
                <p className="text-[11px] text-[rgb(var(--ec-page-text-muted))]">
                  {replies.length} {replies.length === 1 ? 'reply' : 'replies'}
                </p>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
