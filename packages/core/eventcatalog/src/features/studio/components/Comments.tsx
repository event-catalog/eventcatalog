import { memo, useEffect, useRef, useState, type ReactNode } from 'react';
import { useInternalNode, useReactFlow, useStore, ViewportPortal, type Node, type XYPosition } from '@xyflow/react';
import { Check, MessageCircle, RotateCcw, Trash2, X } from 'lucide-react';
import { getAbsolutePosition } from '../grouping';
import type { Author, CommentAnchor, Thread } from '../hooks/use-comments';
import { STATUS } from './status';

const initials = (name: string) => name.slice(0, 2).toUpperCase();

const timeAgo = (timestamp: number) => {
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

/**
 * A comment pin. Click opens it, dragging moves it: `onDrag` gets the screen point the pin's tip
 * (its bottom left corner) is over, keeping where on the pin it was grabbed.
 */
function Pin({
  author,
  active,
  resolved,
  onClick,
  onDrag,
}: {
  author: Author;
  active?: boolean;
  resolved?: boolean;
  onClick?: () => void;
  onDrag?: (tip: XYPosition, phase: 'move' | 'end') => void;
}) {
  const drag = useRef<{ start: XYPosition; grab: XYPosition; moved: boolean } | null>(null);
  const tipOf = (event: { clientX: number; clientY: number }) => ({
    x: event.clientX - drag.current!.grab.x,
    y: event.clientY - drag.current!.grab.y,
  });

  return (
    <button
      onPointerDown={(event) => {
        if (event.button !== 0) return;
        // Keeps pointer events coming while the pointer is outside the pin (throws if the pointer has gone)
        try {
          event.currentTarget.setPointerCapture(event.pointerId);
        } catch {}
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
        if (!current) return;
        if (current.moved) onDrag?.(tipOf(event), 'end');
        else onClick?.();
        drag.current = null;
      }}
      onPointerCancel={() => (drag.current = null)}
      // Keyboard activation (pointer clicks are handled on pointer up)
      onClick={(event) => event.detail === 0 && onClick?.()}
      className={`flex h-8 w-8 cursor-grab items-center justify-center rounded-full rounded-bl-none border-2 border-[rgb(var(--ec-card-bg))] text-[11px] font-semibold text-white shadow-md transition-transform hover:scale-110 active:cursor-grabbing ${
        active ? 'scale-110 ring-2 ring-[rgb(var(--ec-accent))]' : ''
      }`}
      // Resolved threads are greyed out, in the theme's muted colour
      style={{ backgroundColor: resolved ? 'rgb(var(--ec-page-text-muted))' : author.color }}
    >
      {initials(author.name)}
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

function ThreadPopover({
  thread,
  onReply,
  onResolve,
  onDelete,
  onClose,
}: {
  thread: Thread;
  onReply: (text: string) => void;
  onResolve: (resolved: boolean) => void;
  onDelete: () => void;
  onClose: () => void;
}) {
  const listRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight });
  }, [thread.messages.length]);

  return (
    <>
      <div className="flex items-center justify-between border-b px-3 py-2 border-[rgb(var(--ec-page-border))]">
        <span className="text-xs font-semibold">{thread.resolved ? 'Resolved thread' : 'Thread'}</span>
        <span className="flex items-center gap-0.5">
          <IconButton title={thread.resolved ? 'Reopen' : 'Resolve'} onClick={() => onResolve(!thread.resolved)}>
            {thread.resolved ? <RotateCcw size={14} /> : <Check size={14} />}
          </IconButton>
          <IconButton title="Delete thread" onClick={onDelete}>
            <Trash2 size={14} />
          </IconButton>
          <IconButton title="Close" onClick={onClose}>
            <X size={14} />
          </IconButton>
        </span>
      </div>
      <div ref={listRef} className="max-h-72 space-y-3 overflow-y-auto px-3 py-3">
        {thread.messages.map((message) => (
          <div key={message.id} className="flex gap-2">
            <span
              className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[10px] font-semibold text-white"
              style={{ backgroundColor: message.author.color }}
            >
              {initials(message.author.name)}
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
      <div className="border-t border-[rgb(var(--ec-page-border))]">
        <Composer placeholder="Reply" onSubmit={onReply} onCancel={onClose} />
      </div>
    </>
  );
}

/** Where a pin goes on the canvas, following only the node it's on (if it's on one), counter-scaled */
function PinAt({ anchor, zoom, zIndex, children }: { anchor: CommentAnchor; zoom: number; zIndex: number; children: ReactNode }) {
  const node = useInternalNode(anchor.nodeId ?? '');
  const origin = anchor.nodeId && anchor.offset ? node?.internals.positionAbsolute : undefined;
  const { x, y } = origin && anchor.offset ? { x: origin.x + anchor.offset.x, y: origin.y + anchor.offset.y } : anchor.position;
  return (
    <div className="absolute" style={{ left: x, top: y, transform: `scale(${1 / zoom})`, transformOrigin: '0 0', zIndex }}>
      {/* The pin's tip (bottom left corner) sits on the anchor point */}
      <div className="nopan nodrag nowheel pointer-events-auto absolute left-0 -top-8">{children}</div>
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
}: {
  threads: Thread[];
  author: Author;
  openThreadId: string | null;
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
              anchor={moving?.threadId === thread.id ? moving.anchor : thread}
              zoom={zoom}
              zIndex={isOpen ? 2 : 1}
            >
              <Pin
                author={thread.author}
                active={isOpen}
                resolved={thread.resolved}
                onClick={() => onOpen(isOpen ? null : thread.id)}
                onDrag={(tip, phase) => {
                  if (phase === 'move') return setMoving({ threadId: thread.id, anchor: anchorFor(tip, phase) });
                  onMove(thread.id, anchorFor(tip, phase));
                  setMoving(null);
                }}
              />
              {isOpen && (
                <div className={panelClass} style={{ left: 40, top: 0 }}>
                  <ThreadPopover
                    thread={thread}
                    onReply={(text) => onReply(thread.id, text)}
                    onResolve={(resolved) => onResolve(thread.id, resolved)}
                    onDelete={() => onDelete(thread.id)}
                    onClose={() => onOpen(null)}
                  />
                </div>
              )}
            </PinAt>
          );
        })}

        {draft && (
          <PinAt anchor={draft} zoom={zoom} zIndex={3}>
            <Pin author={author} active onDrag={(tip, phase) => onMoveDraft(anchorFor(tip, phase))} />
            <div className={panelClass} style={{ left: 40, top: 0 }}>
              <Composer placeholder="Add a comment" onSubmit={onCreate} onCancel={onCancelDraft} />
            </div>
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
  onDeleteNode,
  onClose,
}: {
  menu: ContextMenuState;
  onAddComment: () => void;
  onDeleteNode: (id: string) => void;
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
        <span className="ml-auto text-[rgb(var(--ec-page-text-muted))]">C</span>
      </button>
      {menu.node && (
        <button className={`${itemClass} ${STATUS.danger.text}`} onClick={() => onDeleteNode(menu.node!.id)}>
          <Trash2 size={14} />
          Delete
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
