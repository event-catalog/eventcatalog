import { useState } from 'react';
import { Users } from 'lucide-react';
import { MAX_NAME_LENGTH, PERSON_COLORS } from '../identity';

const initials = (name: string) =>
  name
    .trim()
    .split(/\s+/)
    .map((word) => word[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

/**
 * Joining a canvas the first time (without signing in), as Studio on the web joins a live session: the name and colour
 * you'll be seen by (your pointer, your avatar, your comments), picked before you start, with how you'll look to the
 * others. Remembered in this browser for next time.
 */
export default function JoinForm({
  color,
  onJoin,
}: {
  /** The colour picked to start with (the one kept in this browser, if there is one) */
  color?: string | null;
  onJoin: (me: { name: string; color: string }) => void;
}) {
  const [draft, setDraft] = useState('');
  const [picked, setPicked] = useState(() => color ?? PERSON_COLORS[Math.floor(Math.random() * PERSON_COLORS.length)]);
  const name = draft.trim();

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/40 p-4">
      <form
        role="dialog"
        aria-modal="true"
        aria-labelledby="join-canvas-title"
        onSubmit={(event) => {
          event.preventDefault();
          if (name) onJoin({ name, color: picked });
        }}
        className="w-full max-w-md rounded-xl border border-[rgb(var(--ec-page-border))] bg-[rgb(var(--ec-card-bg))] p-6 text-center text-[rgb(var(--ec-page-text))] shadow-2xl"
      >
        <span className="mx-auto flex h-11 w-11 items-center justify-center rounded-full bg-[color-mix(in_srgb,rgb(var(--ec-accent))_12%,transparent)] text-[rgb(var(--ec-accent))]">
          <Users aria-hidden className="h-5 w-5" />
        </span>
        <h1 id="join-canvas-title" className="mt-3 text-base font-semibold">
          Join this canvas
        </h1>
        <p className="mt-1.5 text-sm leading-relaxed text-[rgb(var(--ec-page-text-muted))]">
          Everyone here sees your pointer and edits with you, live.
        </p>

        <label className="mt-5 block text-left text-xs font-medium text-[rgb(var(--ec-page-text-muted))]">
          Your name
          <input
            autoFocus
            value={draft}
            maxLength={MAX_NAME_LENGTH}
            placeholder="What should others call you?"
            onChange={(event) => setDraft(event.target.value)}
            className="mt-1.5 block h-9 w-full rounded-md border border-[rgb(var(--ec-page-border))] bg-[rgb(var(--ec-page-bg))] px-3 text-sm text-[rgb(var(--ec-page-text))] outline-none placeholder:text-[rgb(var(--ec-page-text-muted))] focus:border-[rgb(var(--ec-accent))]"
          />
        </label>
        <div className="mt-4 text-left text-xs font-medium text-[rgb(var(--ec-page-text-muted))]">
          Your colour
          <div role="radiogroup" aria-label="Your colour" className="mt-2 flex gap-2">
            {PERSON_COLORS.map((option) => (
              <button
                key={option}
                type="button"
                role="radio"
                aria-checked={option === picked}
                aria-label={option}
                onClick={() => setPicked(option)}
                className={`h-6 w-6 rounded-full transition-transform hover:scale-110 ${
                  option === picked
                    ? 'ring-2 ring-[rgb(var(--ec-page-text))] ring-offset-2 ring-offset-[rgb(var(--ec-card-bg))]'
                    : ''
                }`}
                style={{ background: option }}
              />
            ))}
          </div>
        </div>

        {/* How you'll look to the others */}
        {name && (
          <div className="mt-5 flex items-center justify-center gap-2 text-sm">
            <span
              className="flex h-7 w-7 items-center justify-center rounded-full text-[11px] font-semibold text-white"
              style={{ background: picked }}
            >
              {initials(name)}
            </span>
            <span className="font-medium">{name}</span>
          </div>
        )}

        <button
          type="submit"
          disabled={!name}
          className="mt-5 inline-flex h-10 w-full items-center justify-center rounded-lg bg-[rgb(var(--ec-page-text))] text-sm font-medium text-[rgb(var(--ec-page-bg))] hover:bg-[rgb(var(--ec-page-text)/0.85)] disabled:opacity-40"
        >
          Join canvas
        </button>
      </form>
    </div>
  );
}
