/**
 * Joining a live session from its link: the name and colour they'll be seen by (their cursor, their avatar), picked
 * before they start, as Excalidraw asks. Remembered in this browser for next time.
 * Tailwind with EventCatalog's theme variables, on Headless UI's Dialog.
 */
import { useState } from 'react';
import { Dialog, DialogBackdrop, DialogPanel, DialogTitle } from '@headlessui/react';
import { Users } from 'lucide-react';
import { PERSON_COLORS } from './room';

type JoinDialogProps = {
  open: boolean;
  name: string;
  color: string;
  onJoin: (me: { name: string; color: string }) => void;
};

export function JoinDialog({ open, name, color, onJoin }: JoinDialogProps) {
  return (
    <Dialog open={open} onClose={() => {}} className="relative z-[80]">
      <DialogBackdrop transition className="fixed inset-0 bg-black/40 transition-opacity duration-150 data-closed:opacity-0" />
      <div className="fixed inset-0 flex items-center justify-center p-4">
        <DialogPanel
          transition
          className="w-full max-w-md rounded-xl border border-[rgb(var(--ec-page-border))] bg-[rgb(var(--ec-card-bg))] p-6 text-center text-[rgb(var(--ec-page-text))] shadow-2xl transition duration-150 data-closed:scale-[0.98] data-closed:opacity-0"
        >
          {/* Keyed on open, so it starts from their name each time it's shown */}
          {open && <JoinForm name={name} color={color} onJoin={onJoin} />}
        </DialogPanel>
      </div>
    </Dialog>
  );
}

function JoinForm({ name, color, onJoin }: Omit<JoinDialogProps, 'open'>) {
  const [draft, setDraft] = useState(name);
  const [picked, setPicked] = useState(color);
  const join = () => onJoin({ name: draft.trim() || name, color: picked });
  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        join();
      }}
    >
      <span className="mx-auto flex h-11 w-11 items-center justify-center rounded-full bg-[color-mix(in_srgb,rgb(var(--ec-accent))_12%,transparent)] text-[rgb(var(--ec-accent))]">
        <Users aria-hidden className="h-5 w-5" />
      </span>
      <DialogTitle className="mt-3 text-base font-semibold">Join the live session</DialogTitle>
      <p className="mt-1.5 text-sm leading-relaxed text-[rgb(var(--ec-page-text-muted))]">
        Everyone here sees your cursor and edits with you. End-to-end encrypted: not even our server can see it.
      </p>

      <label className="mt-5 block text-left text-xs font-medium text-[rgb(var(--ec-page-text-muted))]">
        Your name
        <input
          autoFocus
          value={draft}
          maxLength={40}
          onChange={(event) => setDraft(event.target.value)}
          onFocus={(event) => event.currentTarget.select()}
          className="mt-1.5 block h-9 w-full rounded-md border border-[rgb(var(--ec-page-border))] bg-[rgb(var(--ec-page-bg))] px-3 text-sm text-[rgb(var(--ec-page-text))] outline-none focus:border-[rgb(var(--ec-accent))]"
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
              className={`h-6 w-6 rounded-full transition-transform hover:scale-110 ${option === picked ? 'ring-2 ring-[rgb(var(--ec-page-text))] ring-offset-2 ring-offset-[rgb(var(--ec-card-bg))]' : ''}`}
              style={{ background: option }}
            />
          ))}
        </div>
      </div>

      {/* How they'll look to the others */}
      <div className="mt-5 flex items-center justify-center gap-2 text-sm">
        <span className="flex h-7 w-7 items-center justify-center rounded-full text-[11px] font-semibold text-white" style={{ background: picked }}>
          {(draft.trim() || name)
            .split(/\s+/)
            .map((word) => word[0])
            .join('')
            .slice(0, 2)
            .toUpperCase()}
        </span>
        <span className="font-medium">{draft.trim() || name}</span>
      </div>

      <button
        type="submit"
        className="mt-5 inline-flex h-10 w-full items-center justify-center rounded-lg bg-[rgb(var(--ec-primary-bg))] text-sm font-medium text-[rgb(var(--ec-primary-text))] hover:bg-[rgb(var(--ec-primary-bg)/0.85)]!"
      >
        Join session
      </button>
    </form>
  );
}
