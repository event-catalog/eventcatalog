import { memo, useEffect, useRef, useState, type ReactNode } from 'react';
import {
  CircleHelp,
  Download,
  FolderOpen,
  ImageDown,
  Link2,
  MoreVertical,
  Pencil,
  Plug,
  Plus,
  Share2,
  Trash2,
  Users,
} from 'lucide-react';
import {
  DIAGRAM_MENU,
  DIAGRAM_MENU_BUTTON_ICON,
  DIAGRAM_MENU_ITEM,
  DIAGRAM_MENU_ITEM_ICON,
  DIAGRAM_MENU_SEPARATOR,
  DIAGRAM_MENU_TITLE,
} from '@eventcatalog/visualiser';
import { usePeople, type Peer, type PresenceStore } from '../hooks/presence-store';
import { MAX_NAME_LENGTH, PERSON_COLORS } from '../identity';
import type { WebMcpStatus } from '../hooks/use-canvas-webmcp';
import type { Status, Transport } from '../hooks/use-studio-flow';
import { type CanvasStatus, type StatusChange, STATUS, Picture, AgentMark } from '@eventcatalog/visualiser/studio';
import CanvasStatusMenu from './CanvasStatusMenu';

/** The dot showing whether the canvas is connected */
const CONNECTION_DOT: Record<Status, string> = {
  connected: STATUS.success.dot,
  connecting: STATUS.warning.dot,
  disconnected: STATUS.danger.dot,
};

/**
 * The canvas's header, as Studio on the web's top bar: on the left the canvas (its title, its status and a menu), on
 * the right who's here, connecting an agent and sharing, each a small card over the canvas. Its menus look like the
 * visualiser's (`DIAGRAM_MENU_*`).
 */

const barClass =
  'pointer-events-auto flex h-[38px] items-center rounded-[9px] border border-[rgb(var(--ec-page-border))] bg-[rgb(var(--ec-card-bg))] shadow-sm';
// The header lets the pointer through to the canvas around its bars, so its menus take it back
const popoverClass = 'pointer-events-auto absolute top-full mt-2';
const menuClass = `${popoverClass} ${DIAGRAM_MENU}`;
const menuItemClass = `${DIAGRAM_MENU_ITEM} w-full text-left`;
const MAX_AVATARS = 4;
const isMac = typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.platform);
const MOD = isMac ? 'Cmd' : 'Ctrl';
const itemClass =
  'flex h-[34px] w-full cursor-pointer items-center gap-3 rounded-[7px] px-2 text-left text-sm outline-none hover:bg-[rgb(var(--ec-content-hover))]';
const itemIconClass = 'flex flex-none [&_svg]:h-[17px] [&_svg]:w-[17px] [&_svg]:stroke-[1.75]';

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
      {children ?? (peer.agent ? <AgentMark name={peer.name} size={14} /> : peer.name.slice(0, 2).toUpperCase())}
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
  onConnectAgent,
  webMcp,
  agentsHere,
  onDelete,
  onOpenFile,
  onSaveToFile,
  onExportImage,
  onLiveCollaboration,
  onHelp,
  children,
}: {
  /** Opens a .eventcatalog file as a new canvas (not offered when not given, e.g. inside a chat) */
  onOpenFile?: () => void;
  onSaveToFile: () => void;
  onExportImage: () => void;
  onLiveCollaboration: () => void;
  onHelp: () => void;
  title?: string;
  status: Status;
  transport: Transport;
  onRetitle: (title: string) => void;
  shareUrl?: string;
  newCanvasUrl?: string;
  onConnectAgent: () => void;
  webMcp: WebMcpStatus;
  /** An AI agent is on the canvas */
  agentsHere: boolean;
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
  /** A menu item, as Studio on the web's: its icon, what it does, and its shortcut (or something else on the right) */
  const item = (icon: ReactNode, label: string, onSelect: () => void, shortcut?: ReactNode, className = '') => (
    <button
      type="button"
      className={`${itemClass} ${className}`}
      onClick={() => {
        menu.setOpen(false);
        onSelect();
      }}
    >
      <span className={itemIconClass}>{icon}</span>
      <span className="min-w-0 flex-1 truncate">{label}</span>
      {typeof shortcut === 'string' ? (
        <span className="flex-none text-xs font-normal text-[rgb(var(--ec-page-text-muted))]">{shortcut}</span>
      ) : (
        shortcut
      )}
    </button>
  );

  return (
    <div ref={menu.ref} className="relative">
      <div className={`${barClass} gap-1.5 pl-3 pr-1`}>
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
        <div
          className={`${popoverClass} left-0 z-50 w-72 rounded-xl border border-[rgb(var(--ec-page-border))] bg-[rgb(var(--ec-card-bg))] p-1.5 text-[rgb(var(--ec-page-text))] shadow-xl`}
        >
          {/* As Studio on the web's menu: files and images, people and agents, help */}
          {onOpenFile && item(<FolderOpen />, 'Open…', onOpenFile, `${MOD}+O`)}
          {item(<Download />, 'Save to file…', onSaveToFile, `${MOD}+S`)}
          {item(<ImageDown />, 'Export image…', onExportImage, `${MOD}+Shift+E`)}
          {item(<Users />, 'Live collaboration…', onLiveCollaboration)}
          {item(
            <Plug />,
            agentsHere ? 'AI agent connected' : 'Connect your AI agent…',
            onConnectAgent,
            webMcp.state === 'on' || agentsHere ? (
              <span className={`h-1.5 w-1.5 rounded-full ${STATUS.success.dot}`} />
            ) : undefined
          )}
          {item(<CircleHelp />, 'Help', onHelp, '?')}
          <div className="my-1.5 h-px bg-[rgb(var(--ec-page-border))]" />
          {item(<Pencil />, 'Rename canvas', () => {
            titleInput.current?.focus();
            titleInput.current?.select();
          })}
          {item(<Link2 />, 'Copy link', () => void navigator.clipboard.writeText(shareUrl ?? window.location.href))}
          {newCanvasUrl && (
            <a className={itemClass} href={newCanvasUrl}>
              <span className={itemIconClass}>
                <Plus />
              </span>
              <span className="min-w-0 flex-1 truncate">New canvas</span>
            </a>
          )}
          {onDelete && (
            <>
              <div className="my-1.5 h-px bg-[rgb(var(--ec-page-border))]" />
              {item(<Trash2 />, 'Delete canvas', onDelete, undefined, `${STATUS.danger.text} ${STATUS.danger.hover}`)}
            </>
          )}
          <div className="my-1.5 h-px bg-[rgb(var(--ec-page-border))]" />
          <p className="flex items-center gap-2 px-2 py-1.5 text-[11px] text-[rgb(var(--ec-page-text-muted))]">
            <span className={`h-1.5 w-1.5 rounded-full ${statusColor}`} />
            {statusLabel}
          </p>
        </div>
      )}
    </div>
  );
}

const initialsOf = (name: string) => {
  const words = name.trim().split(/\s+/).filter(Boolean);
  return (words.length > 1 ? words.map((word) => word[0]).join('') : name.trim()).slice(0, 2).toUpperCase();
};

/**
 * Who you are here, top right (as Studio on the web's): your avatar, opening your name and colour to change. They're
 * on your pointer and comments. Signed in, your name and picture are the ones you signed in with.
 */
function ProfileMenu({
  me,
  onRename,
  onRecolor,
}: {
  me: { name: string; color: string; picture?: string; agent?: boolean };
  /** Not given when you're signed in */
  onRename?: (name: string) => void;
  onRecolor: (color: string) => void;
}) {
  const popover = usePopover();
  const [draft, setDraft] = useState(me.name);
  useEffect(() => setDraft(me.name), [me.name]);
  const save = () => {
    const next = draft.trim();
    if (!next) return setDraft(me.name);
    if (next !== me.name) onRename?.(next);
  };
  const avatar = (size: string, text: string) => (
    <span
      className={`relative flex ${size} flex-none items-center justify-center rounded-full text-[10px] font-semibold text-white`}
      style={{ background: me.color }}
    >
      {initialsOf(text)}
      <Picture src={me.picture} />
    </span>
  );
  // Here as an AI agent (e.g. a chat's view, as the chat's agent): who you are is its logo, not yours to change
  if (me.agent)
    return (
      <span title={`You're here as ${me.name} (AI agent)`} className={`${barClass} pointer-events-auto w-[38px] justify-center`}>
        <span className="flex h-6 w-6 items-center justify-center rounded-full text-white" style={{ background: me.color }}>
          <AgentMark name={me.name} size={14} />
        </span>
      </span>
    );
  return (
    <div ref={popover.ref} className="pointer-events-auto relative">
      <button
        type="button"
        title={onRename ? `${me.name}: change your name and colour` : `${me.name}: change your colour`}
        onClick={() => popover.setOpen((open) => !open)}
        className={`${barClass} w-[38px] justify-center hover:bg-[rgb(var(--ec-content-hover))]`}
      >
        {avatar('h-6 w-6', me.name)}
      </button>
      {popover.open && (
        <div
          className={`${popoverClass} right-0 z-[70] w-72 rounded-xl border border-[rgb(var(--ec-page-border))] bg-[rgb(var(--ec-card-bg))] p-4 text-[rgb(var(--ec-page-text))] shadow-xl`}
        >
          <div className="flex items-center gap-3">
            {avatar('h-9 w-9 text-xs', draft || me.name)}
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold">{draft || me.name}</p>
              <p className="text-xs text-[rgb(var(--ec-page-text-muted))]">On your pointer and comments</p>
            </div>
          </div>
          {onRename && (
            <label className="mt-4 block text-xs font-medium text-[rgb(var(--ec-page-text-muted))]">
              Your name
              <input
                value={draft}
                maxLength={MAX_NAME_LENGTH}
                onChange={(event) => setDraft(event.target.value)}
                onBlur={save}
                onKeyDown={(event) => event.key === 'Enter' && event.currentTarget.blur()}
                className="mt-1.5 block h-9 w-full rounded-md border border-[rgb(var(--ec-page-border))] bg-[rgb(var(--ec-page-bg))] px-3 text-sm text-[rgb(var(--ec-page-text))] outline-none focus:border-[rgb(var(--ec-accent))]"
              />
            </label>
          )}
          <div className="mt-3 text-xs font-medium text-[rgb(var(--ec-page-text-muted))]">
            Your colour
            <div role="radiogroup" aria-label="Your colour" className="mt-2 flex gap-2">
              {PERSON_COLORS.map((color) => (
                <button
                  key={color}
                  type="button"
                  role="radio"
                  aria-checked={color === me.color}
                  aria-label={color}
                  onClick={() => onRecolor(color)}
                  className={`h-6 w-6 rounded-full transition-transform hover:scale-110 ${
                    color === me.color
                      ? 'ring-2 ring-[rgb(var(--ec-page-text))] ring-offset-2 ring-offset-[rgb(var(--ec-card-bg))]'
                      : ''
                  }`}
                  style={{ background: color }}
                />
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/** Who's here: click someone to jump to them; everyone past the first few is in a list */
/**
 * Who else is here. An agent is shown once, however many places it's in (e.g. its MCP tools and its chat's canvas
 * view), and not at all when it's you.
 */
const othersHere = (peers: Peer[], clientId: number | null, me: { name: string; agent?: boolean }) => {
  const agentsSeen = new Set(me.agent ? [me.name] : []);
  return peers.filter((peer) => {
    if (peer.clientId === clientId) return false;
    if (!peer.agent) return true;
    if (agentsSeen.has(peer.name)) return false;
    agentsSeen.add(peer.name);
    return true;
  });
};

function People({
  peers,
  clientId,
  me,
  onJumpTo,
}: {
  peers: Peer[];
  clientId: number | null;
  me: { name: string; agent?: boolean };
  onJumpTo: (peer: Peer) => void;
}) {
  const overflow = usePopover();
  const others = othersHere(peers, clientId, me);
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
  me,
  onRename,
  onRecolor,
  onConnectAgent,
  webMcp,
  shareUrl,
  newCanvasUrl,
  onShare,
  onOpenFile,
  onSaveToFile,
  onExportImage,
  onLiveCollaboration,
  onHelp,
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
  /** You: your name, colour and (signed in) picture */
  me: { name: string; color: string; picture?: string; agent?: boolean };
  /** Not given when you're signed in */
  onRename?: (name: string) => void;
  onRecolor: (color: string) => void;
  onConnectAgent: () => void;
  webMcp: WebMcpStatus;
  shareUrl?: string;
  newCanvasUrl?: string;
  /** Open the share dialog */
  onShare: () => void;
  /** Opens a .eventcatalog file as a new canvas (not given where it can't, e.g. inside a chat) */
  onOpenFile?: () => void;
  onSaveToFile: () => void;
  onExportImage: () => void;
  onLiveCollaboration: () => void;
  onHelp: () => void;
  /** Ask to delete the canvas (not given where it can't be, e.g. inside a chat) */
  onDelete?: () => void;
}) {
  const peers = usePeople(presence);
  const agentsHere = peers.some((peer) => peer.agent);
  // Who else is here (you're your own avatar, next to it)
  const showPeople = othersHere(peers, clientId, me).length > 0;

  return (
    <div className="pointer-events-none absolute left-3 right-3 top-3 z-10 flex items-start justify-between gap-3">
      <CanvasMenu
        title={title}
        status={status}
        transport={transport}
        onRetitle={onRetitle}
        shareUrl={shareUrl}
        newCanvasUrl={newCanvasUrl}
        onConnectAgent={onConnectAgent}
        webMcp={webMcp}
        agentsHere={agentsHere}
        onDelete={onDelete}
        onOpenFile={onOpenFile}
        onSaveToFile={onSaveToFile}
        onExportImage={onExportImage}
        onLiveCollaboration={onLiveCollaboration}
        onHelp={onHelp}
      >
        <CanvasStatusMenu status={canvasStatus} history={statusHistory} onChange={onStatusChange} />
      </CanvasMenu>

      <div className="flex items-center gap-2">
        {showPeople && (
          <div className={`${barClass} px-1.5`}>
            <People peers={peers} clientId={clientId} me={me} onJumpTo={onJumpTo} />
          </div>
        )}
        <ProfileMenu me={me} onRename={onRename} onRecolor={onRecolor} />
        <button
          onClick={onShare}
          className="pointer-events-auto inline-flex h-[38px] items-center gap-2 rounded-[9px] bg-[rgb(var(--ec-page-text))] px-4 text-sm font-semibold text-[rgb(var(--ec-page-bg))] shadow-sm transition-colors hover:bg-[rgb(var(--ec-page-text)/0.85)]"
        >
          <Share2 size={16} aria-hidden />
          Share
        </button>
      </div>
    </div>
  );
});
