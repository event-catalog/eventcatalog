import { memo, useEffect, useRef, useState, type ReactNode } from 'react';
import { Bot, ChevronDown, Link2, Pencil, Plus, UserPlus } from 'lucide-react';
import { usePeople, type Peer, type PresenceStore } from '../hooks/presence-store';
import type { WebMcpStatus } from '../hooks/use-canvas-webmcp';
import type { Status, Transport } from '../hooks/use-studio-flow';
import type { CanvasStatus, StatusChange } from '../canvas-doc';
import CanvasStatusMenu from './CanvasStatusMenu';
import { CONNECTION_DOT, STATUS } from './status';
import Picture from './Picture';

/**
 * The canvas's header, like Figma or Miro: two small floating bars. On the left the canvas (its title, and a
 * menu), on the right who's here, connecting an agent and sharing.
 */

const barClass =
  'pointer-events-auto flex h-10 items-center rounded-xl border shadow-md bg-[rgb(var(--ec-card-bg))] border-[rgb(var(--ec-page-border))]';
// The header lets the pointer through to the canvas around its bars, so its menus take it back
const menuClass =
  'pointer-events-auto absolute top-full z-50 mt-2 min-w-52 rounded-xl border p-1 shadow-xl bg-[rgb(var(--ec-card-bg))] border-[rgb(var(--ec-page-border))] text-[rgb(var(--ec-page-text))]';
const menuItemClass =
  'flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-left text-xs hover:bg-[rgb(var(--ec-page-border)/0.5)]';
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
  children,
}: {
  title?: string;
  status: Status;
  transport: Transport;
  onRetitle: (title: string) => void;
  shareUrl?: string;
  newCanvasUrl?: string;
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
      <div className={`${barClass} gap-1 pl-3 pr-1`}>
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
          className="max-w-64 truncate rounded-md bg-transparent px-1.5 py-1 text-sm font-semibold placeholder:font-semibold placeholder:text-[rgb(var(--ec-page-text-muted))] hover:bg-[rgb(var(--ec-page-border)/0.4)] focus:bg-[rgb(var(--ec-input-bg))] focus:outline-none"
        />
        {children}
        <button
          aria-label="Canvas menu"
          onClick={() => menu.setOpen((open) => !open)}
          className="rounded-md p-1.5 text-[rgb(var(--ec-icon-color))] hover:bg-[rgb(var(--ec-page-border)/0.5)]"
        >
          <ChevronDown size={14} />
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
            <Pencil size={14} /> Rename canvas
          </button>
          <button
            className={menuItemClass}
            onClick={() => {
              void navigator.clipboard.writeText(shareUrl ?? window.location.href);
              menu.setOpen(false);
            }}
          >
            <Link2 size={14} /> Copy link
          </button>
          {newCanvasUrl && (
            <a className={menuItemClass} href={newCanvasUrl}>
              <Plus size={14} /> New canvas
            </a>
          )}
          <div className="my-1 h-px bg-[rgb(var(--ec-page-border))]" />
          <p className="flex items-center gap-2 px-2.5 py-1.5 text-[11px] text-[rgb(var(--ec-page-text-muted))]">
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
        <div className={`${menuClass} right-0 w-60 space-y-2 p-3`}>
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
}) {
  const peers = usePeople(presence);
  const agentsHere = peers.some((peer) => peer.agent);

  return (
    <div className="pointer-events-none absolute left-3 right-3 top-3 z-10 flex items-start justify-between gap-3">
      <CanvasMenu
        title={title}
        status={status}
        transport={transport}
        onRetitle={onRetitle}
        shareUrl={shareUrl}
        newCanvasUrl={newCanvasUrl}
      >
        <CanvasStatusMenu status={canvasStatus} history={statusHistory} onChange={onStatusChange} />
      </CanvasMenu>

      <div className={`${barClass} gap-2 px-1.5`}>
        <div className="pl-1">
          <People peers={peers} clientId={clientId} onJumpTo={onJumpTo} onRename={onRename} />
        </div>
        <div className="h-5 w-px bg-[rgb(var(--ec-page-border))]" />
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
