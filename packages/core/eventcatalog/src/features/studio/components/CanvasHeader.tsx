import { memo, useEffect, useRef, useState, type ReactNode } from 'react';
import { Bot, Link2, MoreVertical, Pencil, Plus, Trash2, UserPlus } from 'lucide-react';
import {
  DIAGRAM_MENU,
  DIAGRAM_MENU_BUTTON_ICON,
  DIAGRAM_MENU_ITEM,
  DIAGRAM_MENU_ITEM_ICON,
  DIAGRAM_MENU_SEPARATOR,
  DIAGRAM_MENU_TITLE,
} from '@eventcatalog/visualiser';
import { usePeople, type Peer, type PresenceStore } from '../hooks/presence-store';
import type { WebMcpStatus } from '../hooks/use-canvas-webmcp';
import type { Status, Transport } from '../hooks/use-studio-flow';
import type { CanvasStatus, StatusChange } from '../canvas-doc';
import CanvasStatusMenu from './CanvasStatusMenu';
import { CONNECTION_DOT, STATUS } from './status';
import Picture from './Picture';

/**
 * The canvas's header: two small bars over the canvas. On the left the canvas (its title, and a menu), on the right
 * who's here, connecting an agent and sharing. They look like the visualiser's menu at the top left of a diagram
 * (its styles, `DIAGRAM_MENU_*`), so a diagram opened in Studio feels the same.
 */

const barClass =
  'pointer-events-auto flex h-[42px] items-center rounded-md border bg-[rgb(var(--ec-card-bg))] border-[rgb(var(--ec-page-border))]';
// The header lets the pointer through to the canvas around its bars, so its menus take it back
const popoverClass = 'pointer-events-auto absolute top-full mt-2';
const menuClass = `${popoverClass} ${DIAGRAM_MENU}`;
const menuItemClass = `${DIAGRAM_MENU_ITEM} w-full text-left`;
const MAX_AVATARS = 4;

/** Closes a popover on outside clicks and Escape */
function usePopover() {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: PointerEvent) => {
      if (!ref.current?.contains(event.target as globalThis.Node)) setOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => event.key === 'Escape' && setOpen(false);
    window.addEventListener('pointerdown', onPointerDown);
    window.addEventListener('keydown', onKeyDown);
    return () => {
      window.removeEventListener('pointerdown', onPointerDown);
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [open]);
  return { open, setOpen, ref };
}

function Avatar({ peer, size = 28, children }: { peer: Peer; size?: number; children?: ReactNode }) {
  return (
    <span
      className="relative flex items-center justify-center rounded-full text-[11px] font-semibold text-white ring-2 ring-[rgb(var(--ec-card-bg))]"
      style={{ backgroundColor: peer.color, width: size, height: size }}
    >
      {children ?? (peer.agent ? <Bot size={14} /> : peer.name.slice(0, 2).toUpperCase())}
      {!children && <Picture src={peer.picture} />}
    </span>
  );
}

function CanvasMenu({
  title,
  status,
  transport,
  onRetitle,
  shareUrl,
  newCanvasUrl,
  onDelete,
  children,
}: {
  title?: string;
  status: Status;
  transport: Transport;
  onRetitle: (title: string) => void;
  shareUrl?: string;
  newCanvasUrl?: string;
  /** Asks to delete the canvas (not offered when not given, e.g. inside a chat) */
  onDelete?: () => void;
  /** Shown after the title (the canvas's status) */
  children?: ReactNode;
}) {
  const menu = usePopover();
  const titleInput = useRef<HTMLInputElement>(null);
  const [draft, setDraft] = useState<string | null>(null);
  const statusLabel = {
    connected: transport === 'tools' ? 'Connected through the chat' : 'Connected',
    connecting: 'Connecting…',
    disconnected: 'Offline, reconnecting…',
  }[status];
  const statusColor = CONNECTION_DOT[status];

  return (
    <div ref={menu.ref} className="relative">
      <div className={`${barClass} gap-1.5 pl-4 pr-1.5`}>
        <span title={statusLabel} className={`h-2 w-2 shrink-0 rounded-full ${statusColor}`} />
        <input
          ref={titleInput}
          aria-label="Canvas title"
          value={draft ?? title ?? ''}
          placeholder="Untitled canvas"
          onChange={(e) => setDraft(e.target.value)}
          onBlur={() => {
            if (draft !== null && draft.trim() !== (title ?? '')) onRetitle(draft.trim());
            setDraft(null);
          }}
          onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.blur()}
          size={Math.max(12, (draft ?? title ?? 'Untitled canvas').length)}
          className={`${DIAGRAM_MENU_TITLE} max-w-64 truncate rounded-md bg-transparent px-1.5 py-1 placeholder:text-[rgb(var(--ec-page-text-muted))] hover:bg-[rgb(var(--ec-page-border)/0.4)] focus:bg-[rgb(var(--ec-input-bg))] focus:outline-none`}
        />
        {children}
        <button
          aria-label="Canvas menu"
          onClick={() => menu.setOpen((open) => !open)}
          className="group rounded-md p-1 hover:bg-[rgb(var(--ec-accent-subtle))]"
        >
          <MoreVertical className={DIAGRAM_MENU_BUTTON_ICON} />
        </button>
      </div>
      {menu.open && (
        <div className={`${menuClass} left-0`}>
          <button
            className={menuItemClass}
            onClick={() => {
              menu.setOpen(false);
              titleInput.current?.focus();
              titleInput.current?.select();
            }}
          >
            <Pencil className={DIAGRAM_MENU_ITEM_ICON} /> Rename canvas
          </button>
          <button
            className={menuItemClass}
            onClick={() => {
              void navigator.clipboard.writeText(shareUrl ?? window.location.href);
              menu.setOpen(false);
            }}
          >
            <Link2 className={DIAGRAM_MENU_ITEM_ICON} /> Copy link
          </button>
          {newCanvasUrl && (
            <a className={menuItemClass} href={newCanvasUrl}>
              <Plus className={DIAGRAM_MENU_ITEM_ICON} /> New canvas
            </a>
          )}
          {onDelete && (
            <>
              <div className={DIAGRAM_MENU_SEPARATOR} />
              <button
                // Laid out like the other items, in the theme's danger colour
                className={`flex w-full cursor-pointer items-center gap-2 px-3 py-2 text-left text-xs transition-colors ${STATUS.danger.text} ${STATUS.danger.hover}`}
                onClick={() => {
                  menu.setOpen(false);
                  onDelete();
                }}
              >
                <Trash2 className="h-3.5 w-3.5 shrink-0" /> Delete canvas
              </button>
            </>
          )}
          <div className={DIAGRAM_MENU_SEPARATOR} />
          <p className="flex items-center gap-2 px-3 py-1.5 text-[11px] text-[rgb(var(--ec-page-text-muted))]">
            <span className={`h-1.5 w-1.5 rounded-full ${statusColor}`} />
            {statusLabel}
          </p>
        </div>
      )}
    </div>
  );
}

/** You: change the name others see you by (unless you're signed in, when it's the name you signed in with) */
function YouAvatar({ peer, onRename }: { peer: Peer; onRename?: (name: string) => void }) {
  const popover = usePopover();
  const [draft, setDraft] = useState(peer.name);
  const commit = () => {
    const trimmed = draft.trim();
    if (trimmed && trimmed !== peer.name) onRename?.(trimmed);
    popover.setOpen(false);
  };

  // Signed in: you're shown in the app's header already
  if (!onRename) return null;
  return (
    <div ref={popover.ref} className="relative">
      <button
        title={`${peer.name} (you)`}
        onClick={() => {
          setDraft(peer.name);
          popover.setOpen((open) => !open);
        }}
        className="block rounded-full transition-transform hover:scale-110"
      >
        <Avatar peer={peer} />
      </button>
      {popover.open && (
        <div
          className={`${popoverClass} right-0 z-50 w-60 space-y-2 rounded-lg border p-3 shadow-xl bg-[rgb(var(--ec-page-bg))] border-[rgb(var(--ec-page-border))]`}
        >
          <label className="block space-y-1.5 text-[11px] font-medium text-[rgb(var(--ec-page-text-muted))]">
            Your name on this canvas
            <input
              autoFocus
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && commit()}
              className="w-full rounded-md border px-2 py-1.5 text-xs bg-[rgb(var(--ec-input-bg))] border-[rgb(var(--ec-input-border))] text-[rgb(var(--ec-input-text))]"
            />
          </label>
          <button
            onClick={commit}
            className="w-full rounded-md px-2 py-1.5 text-xs font-medium bg-[rgb(var(--ec-button-bg))] text-[rgb(var(--ec-button-text))]"
          >
            Save
          </button>
        </div>
      )}
    </div>
  );
}

/** Who's here: click someone to jump to them; everyone past the first few is in a list */
function People({
  peers,
  clientId,
  onJumpTo,
  onRename,
}: {
  peers: Peer[];
  clientId: number | null;
  onJumpTo: (peer: Peer) => void;
  onRename?: (name: string) => void;
}) {
  const overflow = usePopover();
  const you = peers.find((peer) => peer.clientId === clientId);
  const others = peers.filter((peer) => peer.clientId !== clientId);
  const shown = others.slice(0, MAX_AVATARS);
  const hidden = others.slice(MAX_AVATARS);
  const describe = (peer: Peer) => `${peer.name}${peer.agent ? ` (AI agent)${peer.activity ? `: ${peer.activity}` : ''}` : ''}`;

  return (
    <div className="flex items-center gap-1.5">
      <div className="flex -space-x-1.5">
        {shown.map((peer) => (
          <button
            key={peer.clientId}
            title={`${describe(peer)}. Click to jump to them`}
            onClick={() => onJumpTo(peer)}
            className="block rounded-full transition-transform hover:z-10 hover:scale-110"
          >
            <Avatar peer={peer} />
          </button>
        ))}
        {hidden.length > 0 && (
          <div ref={overflow.ref} className="relative">
            <button
              title={`${hidden.length} more`}
              onClick={() => overflow.setOpen((open) => !open)}
              className="flex h-7 w-7 items-center justify-center rounded-full text-[11px] font-semibold ring-2 ring-[rgb(var(--ec-card-bg))] bg-[rgb(var(--ec-page-border))] text-[rgb(var(--ec-page-text))]"
            >
              +{hidden.length}
            </button>
            {overflow.open && (
              <div className={`${menuClass} right-0`}>
                {hidden.map((peer) => (
                  <button
                    key={peer.clientId}
                    className={menuItemClass}
                    onClick={() => {
                      onJumpTo(peer);
                      overflow.setOpen(false);
                    }}
                  >
                    <Avatar peer={peer} size={20} />
                    {describe(peer)}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
      {you && <YouAvatar peer={you} onRename={onRename} />}
    </div>
  );
}

export default memo(function CanvasHeader({
  title,
  onRetitle,
  status,
  transport,
  presence,
  clientId,
  onJumpTo,
  onRename,
  onConnectAgent,
  webMcp,
  shareUrl,
  newCanvasUrl,
  onShare,
  canvasStatus,
  statusHistory,
  onStatusChange,
  onDelete,
}: {
  title?: string;
  onRetitle: (title: string) => void;
  canvasStatus: CanvasStatus;
  statusHistory: StatusChange[];
  onStatusChange: (status: CanvasStatus, note?: string) => void;
  status: Status;
  transport: Transport;
  presence: PresenceStore | null;
  clientId: number | null;
  onJumpTo: (peer: Peer) => void;
  /** Not given when you're signed in */
  onRename?: (name: string) => void;
  onConnectAgent: () => void;
  webMcp: WebMcpStatus;
  shareUrl?: string;
  newCanvasUrl?: string;
  /** Open the share dialog */
  onShare: () => void;
  /** Ask to delete the canvas (not given where it can't be, e.g. inside a chat) */
  onDelete?: () => void;
}) {
  const peers = usePeople(presence);
  const agentsHere = peers.some((peer) => peer.agent);
  // Nobody else here, and signed in (so not shown as "you" to rename): no list of people
  const showPeople = !!onRename || peers.some((peer) => peer.clientId !== clientId);

  return (
    <div className="pointer-events-none absolute left-4 right-4 top-4 z-10 flex items-start justify-between gap-3">
      <CanvasMenu
        title={title}
        status={status}
        transport={transport}
        onRetitle={onRetitle}
        shareUrl={shareUrl}
        newCanvasUrl={newCanvasUrl}
        onDelete={onDelete}
      >
        <CanvasStatusMenu status={canvasStatus} history={statusHistory} onChange={onStatusChange} />
      </CanvasMenu>

      <div className={`${barClass} gap-2 px-1.5`}>
        {showPeople && (
          <>
            <div className="pl-1">
              <People peers={peers} clientId={clientId} onJumpTo={onJumpTo} onRename={onRename} />
            </div>
            <div className="h-5 w-px bg-[rgb(var(--ec-page-border))]" />
          </>
        )}
        <button
          onClick={onConnectAgent}
          title={
            webMcp.state === 'on'
              ? `Connect an AI agent to this canvas. WebMCP is on in this tab${webMcp.lastCall ? ` (last: ${webMcp.lastCall})` : ''}`
              : 'Connect an AI agent to this canvas'
          }
          // A button of its own next to Share (the two ways to bring someone in): people, or an AI agent
          className="relative flex h-7 items-center gap-1.5 rounded-lg border px-2.5 text-xs font-semibold transition-colors border-[rgb(var(--ec-accent)/0.35)] bg-[rgb(var(--ec-accent-subtle))] text-[rgb(var(--ec-accent))] hover:border-[rgb(var(--ec-accent)/0.7)] hover:bg-[rgb(var(--ec-accent)/0.15)]"
        >
          <Bot size={15} />
          {agentsHere ? 'Agent connected' : 'Connect agent'}
          {(webMcp.state === 'on' || agentsHere) && (
            <span
              className={`absolute -right-1 -top-1 h-2.5 w-2.5 rounded-full ring-2 ring-[rgb(var(--ec-card-bg))] ${STATUS.success.dot}`}
            />
          )}
        </button>
        <button
          onClick={onShare}
          className="flex h-7 items-center gap-1.5 rounded-lg px-3 text-xs font-semibold bg-[rgb(var(--ec-button-bg))] text-[rgb(var(--ec-button-text))] hover:bg-[rgb(var(--ec-button-bg-hover))]"
        >
          <UserPlus size={14} />
          Share
        </button>
      </div>
    </div>
  );
});
