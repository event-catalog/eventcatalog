import { useState, type FormEvent } from 'react';
import { MAX_TITLE_LENGTH } from '../limits';
import Dialog, { PRIMARY_BUTTON, SECONDARY_BUTTON } from './Dialog';
import { STATUS } from './status';

/**
 * Naming the canvas a diagram is opened in (the visualiser's "Open in Studio"), named after the diagram to start
 * with, like a new canvas on the Studio page. Loaded with the visualiser, so it imports nothing that loads a canvas.
 */
export default function OpenInStudioDialog({
  title,
  onOpen,
  onClose,
}: {
  /** The diagram's title */
  title?: string;
  /** Makes the canvas with this name and opens it (rejects with what went wrong) */
  onOpen: (title: string | undefined) => Promise<void>;
  onClose: () => void;
}) {
  const [name, setName] = useState((title ?? '').slice(0, MAX_TITLE_LENGTH));
  const [opening, setOpening] = useState(false);
  const [error, setError] = useState<string>();

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setOpening(true);
    setError(undefined);
    try {
      // Stays open (and busy) while the canvas page loads
      await onOpen(name.trim() || undefined);
    } catch (failure) {
      setError((failure as Error).message);
      setOpening(false);
    }
  };

  return (
    <Dialog labelledBy="open-in-studio-title" busy={opening} onClose={onClose}>
      <form onSubmit={submit}>
        <div className="border-b px-5 py-4 border-[rgb(var(--ec-page-border))]">
          <h2 id="open-in-studio-title" className="text-base font-semibold">
            Open in Studio
          </h2>
          <p className="mt-0.5 text-sm text-[rgb(var(--ec-page-text-muted))]">
            A new canvas starts with this diagram. Name it for what you're designing, so your team can find it.
          </p>
        </div>
        <div className="px-5 py-4">
          <label htmlFor="open-in-studio-name" className="block text-sm font-semibold">
            Name
          </label>
          <input
            id="open-in-studio-name"
            // Ready to type a new name, or keep the diagram's
            autoFocus
            onFocus={(event) => event.target.select()}
            value={name}
            onChange={(event) => setName(event.target.value)}
            maxLength={MAX_TITLE_LENGTH}
            autoComplete="off"
            placeholder="e.g. Payments redesign"
            disabled={opening}
            className="mt-2 w-full rounded-lg border px-3 py-2 text-sm shadow-sm bg-[rgb(var(--ec-input-bg))] border-[rgb(var(--ec-input-border))] text-[rgb(var(--ec-input-text))] placeholder:text-[rgb(var(--ec-page-text-muted))] focus:outline-none focus:border-[rgb(var(--ec-accent))] focus:ring-2 focus:ring-[rgb(var(--ec-accent)/0.25)]"
          />
          {error && <p className={`mt-2 text-sm ${STATUS.danger.text}`}>{error}</p>}
        </div>
        <div className="flex justify-end gap-2 border-t px-5 py-4 border-[rgb(var(--ec-page-border))]">
          <button type="button" onClick={onClose} disabled={opening} className={SECONDARY_BUTTON}>
            Cancel
          </button>
          <button type="submit" disabled={opening} className={PRIMARY_BUTTON}>
            {opening ? 'Opening…' : 'Open in Studio'}
          </button>
        </div>
      </form>
    </Dialog>
  );
}
