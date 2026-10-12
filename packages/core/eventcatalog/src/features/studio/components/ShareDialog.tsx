import { useEffect, useState, type ReactNode } from 'react';
import {
  ArrowLeft,
  Bot,
  Check,
  Copy,
  Globe,
  Link2,
  Mail,
  MessageSquareText,
  Pencil,
  Plug,
  UserPlus,
  Users,
  X,
} from 'lucide-react';
import { usePeople, type Peer, type PresenceStore } from '../hooks/presence-store';
import { Picture, AgentMark } from '@eventcatalog/visualiser/studio';

/**
 * Sharing a canvas, as Studio on the web does: first the ways to share, side by side (a link to it, working on it
 * together live, pairing with an AI agent), then, for live collaboration, who's on it now (click someone to go to
 * what they're looking at) and the link to invite people with (copied, emailed or as a ready-made message). A canvas
 * here is always live and kept in the catalog: its link is the invite, so there's no session to start.
 */

const button =
  'inline-flex h-9 flex-none items-center gap-2 rounded-lg px-4 text-sm font-medium transition-colors [&_svg]:h-4 [&_svg]:w-4';
const primary = `${button} bg-[rgb(var(--ec-page-text))] text-[rgb(var(--ec-page-bg))] hover:bg-[rgb(var(--ec-page-text)/0.85)]`;
const secondary = `${button} border border-[rgb(var(--ec-page-border))] text-[rgb(var(--ec-page-text))] hover:bg-[rgb(var(--ec-content-hover))]`;
const sectionLabel = 'text-[11px] font-semibold uppercase tracking-wide text-[rgb(var(--ec-page-text-muted))]';

/** e.g. catalog.example.com/studio/9b1d… */
function shortened(url: string) {
  try {
    const { host, pathname } = new URL(url);
    return `${host}${pathname}`;
  } catch {
    return url;
  }
}

const copyText = async (text: string) => {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
};

/** One of the ways to share, as a card: what it is, what it gives them, and what to do */
function Choice({
  icon,
  title,
  description,
  points,
  children,
}: {
  icon: ReactNode;
  title: string;
  description: string;
  points: string[];
  children: ReactNode;
}) {
  return (
    <section className="flex flex-col rounded-xl border border-[rgb(var(--ec-page-border))] p-5 text-left transition-colors hover:border-[color-mix(in_srgb,rgb(var(--ec-accent))_45%,rgb(var(--ec-page-border)))]">
      <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-[color-mix(in_srgb,rgb(var(--ec-accent))_12%,transparent)] text-[rgb(var(--ec-accent))] [&_svg]:h-[18px] [&_svg]:w-[18px]">
        {icon}
      </span>
      <h3 className="mt-4 text-sm font-semibold text-[rgb(var(--ec-page-text))]">{title}</h3>
      <p className="mt-1 text-[13px] leading-relaxed text-[rgb(var(--ec-page-text-muted))]">{description}</p>
      <ul className="mt-4 space-y-2">
        {points.map((point) => (
          <li key={point} className="flex items-start gap-2 text-xs leading-snug text-[rgb(var(--ec-page-text-muted))]">
            <Check aria-hidden className="mt-px h-3.5 w-3.5 flex-none text-emerald-500" />
            {point}
          </li>
        ))}
      </ul>
      <div className="mt-auto pt-6">{children}</div>
    </section>
  );
}

/** Copies some text, saying it did (or that it couldn't) */
function CopyButton({ text, label, icon, className }: { text: string; label: string; icon: ReactNode; className: string }) {
  const [copied, setCopied] = useState<boolean | null>(null);
  useEffect(() => {
    if (copied === null) return;
    const timer = setTimeout(() => setCopied(null), 1500);
    return () => clearTimeout(timer);
  }, [copied]);
  return (
    <button type="button" onClick={async () => setCopied(await copyText(text))} className={className}>
      {copied ? <Check aria-hidden /> : icon}
      {copied ? 'Copied' : copied === false ? "Couldn't copy" : label}
    </button>
  );
}

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
  initialView = 'choose',
}: {
  /** Straight to live collaboration (who's here, and the invite), e.g. from the menu */
  initialView?: 'choose' | 'invite';
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
  // The ways to share first; live collaboration opens who's here and the invite
  const [view, setView] = useState<'choose' | 'invite'>(initialView);
  const choosing = view === 'choose';
  const wide = 'w-full justify-center';

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => event.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="share-canvas-title"
        onClick={(event) => event.stopPropagation()}
        className={`w-full ${choosing ? 'max-w-4xl' : 'max-w-lg'} rounded-xl border border-[rgb(var(--ec-page-border))] bg-[rgb(var(--ec-card-bg))] text-[rgb(var(--ec-page-text))] shadow-2xl`}
      >
        <div className="flex items-start justify-between gap-3 px-6 pt-5">
          <div className="flex min-w-0 items-start gap-2">
            {!choosing && (
              <button
                type="button"
                aria-label="Back to the ways to share"
                onClick={() => setView('choose')}
                className="-ml-1.5 mt-0.5 rounded-md p-1 text-[rgb(var(--ec-page-text-muted))] hover:bg-[rgb(var(--ec-content-hover))] hover:text-[rgb(var(--ec-page-text))]"
              >
                <ArrowLeft aria-hidden className="h-4 w-4" />
              </button>
            )}
            <div className="min-w-0">
              <h2 id="share-canvas-title" className="truncate text-base font-semibold">
                {choosing ? 'Share' : 'Live collaboration'}
              </h2>
              <p className="mt-1 text-sm text-[rgb(var(--ec-page-text-muted))]">
                {choosing
                  ? `Choose how to work on ${title ? `"${title}"` : 'this canvas'} with others.`
                  : "Everyone with the link joins live: you see each other's pointers and changes as they happen."}
              </p>
            </div>
          </div>
          <button
            type="button"
            aria-label="Close"
            onClick={onClose}
            className="-mr-1 rounded-md p-1.5 text-[rgb(var(--ec-page-text-muted))] hover:bg-[rgb(var(--ec-content-hover))] hover:text-[rgb(var(--ec-page-text))]"
          >
            <X aria-hidden className="h-4 w-4" />
          </button>
        </div>

        {choosing ? (
          <div className="grid gap-4 px-6 pb-6 pt-5 md:grid-cols-3">
            <Choice
              icon={<Link2 aria-hidden />}
              title="Share a link"
              description="A link to this canvas, in your catalog."
              points={[
                'Teammates open it in EventCatalog',
                'Paste it to your AI agent to build on',
                keptInMemory ? "Kept in this EventCatalog's memory, until it restarts" : 'Kept in your catalog',
              ]}
            >
              <CopyButton text={url} label="Copy link" icon={<Link2 aria-hidden />} className={`${secondary} ${wide}`} />
            </Choice>

            <Choice
              icon={<Users aria-hidden />}
              title="Live collaboration"
              description="Work on this canvas together, in real time."
              points={[
                "See each other's pointers and edits",
                'Comment and talk it through',
                `${people.length} ${people.length === 1 ? 'person' : 'people'} here now`,
              ]}
            >
              <button type="button" onClick={() => setView('invite')} className={`${primary} ${wide}`}>
                <UserPlus aria-hidden /> Invite people
              </button>
            </Choice>

            <Choice
              icon={<Bot aria-hidden />}
              title="Pair with your AI agent"
              description="Sketch ideas with your agent, or have it explain how something works."
              points={['Draws and edits the canvas with you', 'Claude, ChatGPT, Cursor and more']}
            >
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onConnectAgent();
                }}
                className={`${secondary} ${wide}`}
              >
                <Plug aria-hidden /> Connect agent
              </button>
            </Choice>
          </div>
        ) : (
          <>
            <div className="space-y-5 px-6 pb-5 pt-4">
              {/* Who's here */}
              <section>
                <div className="flex items-center justify-between">
                  <h3 className={sectionLabel}>On this canvas</h3>
                  <span className="inline-flex items-center gap-1.5 text-xs text-[rgb(var(--ec-page-text-muted))]">
                    <span className="h-2 w-2 rounded-full bg-emerald-500" /> {people.length}{' '}
                    {people.length === 1 ? 'person' : 'people'} here
                  </span>
                </div>
                <ul className="mt-2 flex max-h-40 flex-wrap gap-2 overflow-y-auto">
                  {you && <YouChip peer={you} onRename={onRename} />}
                  {others.map((peer) => (
                    <li key={peer.clientId}>
                      <button
                        type="button"
                        title={`Go to what ${peer.name} is looking at${peer.activity ? ` (${peer.activity})` : ''}`}
                        onClick={() => {
                          onJumpTo(peer);
                          onClose();
                        }}
                        className="inline-flex items-center gap-2 rounded-full border border-[rgb(var(--ec-page-border))] py-1 pl-1 pr-3 text-sm hover:border-[rgb(var(--ec-accent))]"
                      >
                        <Avatar peer={peer} />
                        {peer.name}
                        {peer.agent && (
                          <span className="rounded px-1 py-px text-[10px] font-medium bg-[rgb(var(--ec-accent-subtle))] text-[rgb(var(--ec-accent))]">
                            AI agent
                          </span>
                        )}
                      </button>
                    </li>
                  ))}
                </ul>
                {others.length === 0 && (
                  <p className="mt-2 text-xs text-[rgb(var(--ec-page-text-muted))]">
                    Just you so far. Send the link to bring people in.
                  </p>
                )}
              </section>

              {/* Inviting people */}
              <section>
                <h3 className={sectionLabel}>Invite people</h3>
                <p className="mt-1 text-sm text-[rgb(var(--ec-page-text-muted))]">
                  Anyone with this link joins and edits this canvas with you.
                </p>
                <div className="mt-2 flex w-full items-center gap-2">
                  <div
                    title={url}
                    className="flex h-9 min-w-0 flex-1 items-center gap-2 rounded-lg border border-[rgb(var(--ec-page-border))] bg-[rgb(var(--ec-content-hover))] px-3 text-sm text-[rgb(var(--ec-page-text-muted))]"
                  >
                    <Link2 aria-hidden className="h-4 w-4 flex-none" />
                    <span className="truncate font-mono text-xs">{shortened(url)}</span>
                  </div>
                  <CopyButton text={url} label="Copy invite" icon={<Copy aria-hidden />} className={primary} />
                </div>
                <div className="mt-2 flex flex-wrap gap-2">
                  <a href={email} className={`${secondary} h-8 px-3 text-xs`}>
                    <Mail aria-hidden /> Email an invite
                  </a>
                  <CopyButton
                    text={invite}
                    label="Copy invite message"
                    icon={<MessageSquareText aria-hidden />}
                    className={`${secondary} h-8 px-3 text-xs`}
                  />
                </div>
              </section>
            </div>

            <div className="flex items-center justify-between gap-3 border-t border-[rgb(var(--ec-page-border))] px-6 py-3">
              <p className="flex items-start gap-1.5 text-[11px] text-[rgb(var(--ec-page-text-muted))]">
                <Globe aria-hidden className="mt-px h-3 w-3 flex-none" />
                <span>
                  Anyone with the link can view and edit.
                  {keptInMemory && " Canvases are kept in this EventCatalog's memory, so they're lost when it restarts."}
                </span>
              </p>
              <button type="button" onClick={onClose} className={secondary}>
                Done
              </button>
            </div>
          </>
        )}
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
      className="relative flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[10px] font-semibold text-white"
      style={{ backgroundColor: peer.color }}
    >
      {peer.agent ? <AgentMark name={peer.name} size={12} /> : initials(peer.name)}
      <Picture src={peer.picture} />
    </span>
  );
}

/** You, with your name (the name others see you by, which you can change unless you're signed in) */
function YouChip({ peer, onRename }: { peer: Peer; onRename?: (name: string) => void }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(peer.name);
  const save = () => {
    const trimmed = draft.trim();
    if (trimmed && trimmed !== peer.name) onRename?.(trimmed);
    setEditing(false);
  };
  return (
    <li className="inline-flex items-center gap-2 rounded-full border border-[rgb(var(--ec-page-border))] py-1 pl-1 pr-2 text-sm">
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
          className="w-36 rounded-md border px-2 py-0.5 text-xs bg-[rgb(var(--ec-input-bg))] border-[rgb(var(--ec-input-border))] text-[rgb(var(--ec-input-text))]"
        />
      ) : (
        <>
          {peer.name} <span className="text-xs text-[rgb(var(--ec-page-text-muted))]">(you)</span>
        </>
      )}
      {!editing && onRename && (
        <button
          type="button"
          aria-label="Change your name"
          title="Change the name others see you by"
          onClick={() => {
            setDraft(peer.name);
            setEditing(true);
          }}
          className="rounded-full p-1 text-[rgb(var(--ec-page-text-muted))] hover:bg-[rgb(var(--ec-content-hover))] hover:text-[rgb(var(--ec-page-text))]"
        >
          <Pencil aria-hidden className="h-3 w-3" />
        </button>
      )}
    </li>
  );
}
