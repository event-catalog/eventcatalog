import { useEffect, useState } from 'react';
import { Bot, Check, Copy, Globe, Link2, Mail, Pencil, X } from 'lucide-react';
import { usePeople, type Peer, type PresenceStore } from '../hooks/presence-store';
import Picture from './Picture';

/**
 * Sharing a canvas, like Miro's and Excalidraw's share dialogs: the link to invite people with (copied, emailed
 * or as a ready-made message), who can join, who's on it now (jump to what they're looking at), your own name,
 * and bringing an AI agent in.
 */
export default function ShareDialog({
  url,
  title,
  keptInMemory = false,
  presence,
  clientId,
  onRename,
  onJumpTo,
  onConnectAgent,
  onClose,
}: {
  url: string;
  title?: string;
  /** Canvases are lost when the server restarts */
  keptInMemory?: boolean;
  presence: PresenceStore | null;
  clientId: number | null;
  /** Not given when you're signed in */
  onRename?: (name: string) => void;
  onJumpTo: (peer: Peer) => void;
  onConnectAgent: () => void;
  onClose: () => void;
}) {
  const people = usePeople(presence);
  const you = people.find((peer) => peer.clientId === clientId);
  const others = people.filter((peer) => peer.clientId !== clientId);
  const name = title || 'this canvas';
  const invite = `I'm designing ${title ? `"${title}"` : 'an architecture'} in EventCatalog Studio. Join me, we can work on it together live: ${url}`;
  const email = `mailto:?subject=${encodeURIComponent(`Join me on ${name} in EventCatalog Studio`)}&body=${encodeURIComponent(invite)}`;

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => event.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div
        role="dialog"
        aria-label="Share canvas"
        onClick={(event) => event.stopPropagation()}
        className="w-full max-w-md rounded-xl border shadow-2xl bg-[rgb(var(--ec-card-bg))] border-[rgb(var(--ec-page-border))] text-[rgb(var(--ec-page-text))]"
      >
        <header className="flex items-start justify-between gap-3 border-b px-5 py-4 border-[rgb(var(--ec-page-border))]">
          <div className="min-w-0">
            <h2 className="truncate text-base font-semibold">Share {title ? `"${title}"` : 'this canvas'}</h2>
            <p className="mt-0.5 text-xs text-[rgb(var(--ec-page-text-muted))]">
              Invite your team to design with you. Everyone with the link joins live: you'll see each other's pointers and changes
              as they happen.
            </p>
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            className="shrink-0 rounded-md p-1 text-[rgb(var(--ec-icon-color))] hover:bg-[rgb(var(--ec-page-border)/0.5)] hover:text-[rgb(var(--ec-icon-hover))]"
          >
            <X size={16} />
          </button>
        </header>

        <div className="space-y-5 px-5 py-4">
          <section className="space-y-2">
            <h3 className="text-xs font-semibold">Invite link</h3>
            <div className="flex items-center gap-2">
              <div className="flex min-w-0 flex-1 items-center gap-2 rounded-lg border px-2.5 py-1.5 bg-[rgb(var(--ec-input-bg))] border-[rgb(var(--ec-input-border))]">
                <Link2 size={14} className="shrink-0 text-[rgb(var(--ec-icon-color))]" />
                <input
                  readOnly
                  value={url}
                  onFocus={(event) => event.currentTarget.select()}
                  aria-label="Canvas link"
                  className="min-w-0 flex-1 bg-transparent text-xs text-[rgb(var(--ec-input-text))] focus:outline-none"
                />
              </div>
              <CopyButton text={url} label="Copy link" primary />
            </div>
            <div className="flex flex-wrap gap-2">
              <a
                href={email}
                className="flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-medium border-[rgb(var(--ec-page-border))] hover:bg-[rgb(var(--ec-page-border)/0.4)]"
              >
                <Mail size={14} />
                Email an invite
              </a>
              <CopyButton text={invite} label="Copy invite message" />
            </div>
            <p className="flex items-start gap-1.5 pt-1 text-[11px] text-[rgb(var(--ec-page-text-muted))]">
              <Globe size={13} className="mt-px shrink-0" />
              Anyone with the link can view and edit.
              {keptInMemory && " Canvases are kept in this EventCatalog's memory, so they're lost when it restarts."}
            </p>
          </section>

          <section className="space-y-2">
            <h3 className="text-xs font-semibold">On this canvas now ({people.length})</h3>
            <ul className="max-h-48 space-y-1 overflow-y-auto">
              {you && <YouRow peer={you} onRename={onRename} />}
              {others.map((peer) => (
                <li key={peer.clientId} className="flex items-center gap-2.5 rounded-lg px-1.5 py-1">
                  <Avatar peer={peer} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs font-medium">
                      {peer.name}
                      {peer.agent && (
                        <span className="ml-1.5 rounded px-1 py-px text-[10px] font-medium bg-[rgb(var(--ec-accent-subtle))] text-[rgb(var(--ec-accent))]">
                          AI agent
                        </span>
                      )}
                    </p>
                    {peer.activity && (
                      <p className="truncate text-[11px] text-[rgb(var(--ec-page-text-muted))]">{peer.activity}</p>
                    )}
                  </div>
                  {peer.viewport && (
                    <button
                      onClick={() => {
                        onJumpTo(peer);
                        onClose();
                      }}
                      className="shrink-0 rounded-md px-2 py-1 text-[11px] font-medium text-[rgb(var(--ec-accent))] hover:bg-[rgb(var(--ec-accent-subtle))]"
                    >
                      Go to
                    </button>
                  )}
                </li>
              ))}
              {others.length === 0 && (
                <li className="px-1.5 py-1 text-xs text-[rgb(var(--ec-page-text-muted))]">
                  Just you so far. Send the link to bring people in.
                </li>
              )}
            </ul>
          </section>

          <section className="flex items-center gap-3 rounded-lg border p-3 border-[rgb(var(--ec-page-border))]">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[rgb(var(--ec-accent-subtle))] text-[rgb(var(--ec-accent))]">
              <Bot size={16} />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-semibold">Bring in an AI agent</p>
              <p className="text-[11px] text-[rgb(var(--ec-page-text-muted))]">
                Claude, ChatGPT or another agent can join and design with you, with its own pointer.
              </p>
            </div>
            <button
              onClick={() => {
                onClose();
                onConnectAgent();
              }}
              className="shrink-0 rounded-lg border px-2.5 py-1.5 text-xs font-medium border-[rgb(var(--ec-page-border))] hover:bg-[rgb(var(--ec-page-border)/0.4)]"
            >
              Connect agent
            </button>
          </section>
        </div>
      </div>
    </div>
  );
}

const initials = (name: string) =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]!.toUpperCase())
    .join('');

function Avatar({ peer }: { peer: Peer }) {
  return (
    <span
      className="relative flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[11px] font-semibold text-white"
      style={{ backgroundColor: peer.color }}
    >
      {peer.agent ? <Bot size={14} /> : initials(peer.name)}
      <Picture src={peer.picture} />
    </span>
  );
}

/** You, with your name (the name others see you by, which you can change unless you're signed in) */
function YouRow({ peer, onRename }: { peer: Peer; onRename?: (name: string) => void }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(peer.name);
  const save = () => {
    const trimmed = draft.trim();
    if (trimmed && trimmed !== peer.name) onRename?.(trimmed);
    setEditing(false);
  };
  return (
    <li className="flex items-center gap-2.5 rounded-lg px-1.5 py-1">
      <Avatar peer={peer} />
      {editing ? (
        <input
          autoFocus
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          onBlur={save}
          onKeyDown={(event) => {
            if (event.key === 'Enter') save();
            if (event.key === 'Escape') {
              event.stopPropagation();
              setEditing(false);
            }
          }}
          aria-label="Your name"
          className="min-w-0 flex-1 rounded-md border px-2 py-1 text-xs bg-[rgb(var(--ec-input-bg))] border-[rgb(var(--ec-input-border))] text-[rgb(var(--ec-input-text))]"
        />
      ) : (
        <p className="min-w-0 flex-1 truncate text-xs font-medium">
          {peer.name} <span className="font-normal text-[rgb(var(--ec-page-text-muted))]">(you)</span>
        </p>
      )}
      {!editing && onRename && (
        <button
          onClick={() => {
            setDraft(peer.name);
            setEditing(true);
          }}
          className="flex shrink-0 items-center gap-1 rounded-md px-2 py-1 text-[11px] font-medium text-[rgb(var(--ec-page-text-muted))] hover:bg-[rgb(var(--ec-page-border)/0.5)]"
        >
          <Pencil size={11} />
          Rename
        </button>
      )}
    </li>
  );
}

function CopyButton({ text, label, primary = false }: { text: string; label: string; primary?: boolean }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      onClick={async () => {
        await navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
      }}
      className={`flex shrink-0 items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium ${
        primary
          ? 'bg-[rgb(var(--ec-button-bg))] text-[rgb(var(--ec-button-text))] hover:bg-[rgb(var(--ec-button-bg-hover))]'
          : 'border border-[rgb(var(--ec-page-border))] hover:bg-[rgb(var(--ec-page-border)/0.4)]'
      }`}
    >
      {copied ? <Check size={14} /> : <Copy size={14} />}
      {copied ? 'Copied' : label}
    </button>
  );
}
