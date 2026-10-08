import { useEffect, useState } from 'react';
import { usePeople, type PresenceStore } from '../hooks/presence-store';
import { STATUS } from './status';

/** Asks before deleting a canvas: it's deleted for everyone, for good */
export default function DeleteCanvasDialog({
  title,
  presence,
  clientId,
  onDelete,
  onClose,
}: {
  title?: string;
  /** Who has it open (to say it closes for them) */
  presence: PresenceStore | null;
  clientId: number | null;
  /** Deletes it (rejects with what went wrong) */
  onDelete: () => Promise<void>;
  onClose: () => void;
}) {
  const othersHere = usePeople(presence).filter((peer) => peer.clientId !== clientId).length;
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string>();

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => event.key === 'Escape' && !deleting && onClose();
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [onClose, deleting]);

  const confirm = async () => {
    setDeleting(true);
    setError(undefined);
    try {
      await onDelete();
    } catch (failure) {
      setError((failure as Error).message);
      setDeleting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={() => !deleting && onClose()}>
      <div
        role="alertdialog"
        aria-labelledby="delete-canvas-title"
        onClick={(event) => event.stopPropagation()}
        className="w-full max-w-md rounded-xl border shadow-2xl bg-[rgb(var(--ec-card-bg))] border-[rgb(var(--ec-page-border))] text-[rgb(var(--ec-page-text))]"
      >
        <div className="space-y-2 px-5 py-4">
          <h2 id="delete-canvas-title" className="text-base font-semibold">
            Delete {title ? `"${title}"` : 'this canvas'}?
          </h2>
          <p className="text-sm text-[rgb(var(--ec-page-text-muted))]">
            It's deleted for everyone, with its comments, and can't be brought back.
            {othersHere > 0 &&
              ` ${othersHere === 1 ? 'Someone else has' : `${othersHere} others have`} it open: it closes for them too.`}
          </p>
          {error && <p className={`text-sm ${STATUS.danger.text}`}>{error}</p>}
        </div>
        <div className="flex justify-end gap-2 border-t px-5 py-4 border-[rgb(var(--ec-page-border))]">
          <button
            onClick={onClose}
            disabled={deleting}
            className="rounded-lg border px-4 py-2 text-sm font-medium border-[rgb(var(--ec-page-border))] hover:bg-[rgb(var(--ec-page-border)/0.4)] disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            autoFocus
            onClick={confirm}
            disabled={deleting}
            className={`rounded-lg px-4 py-2 text-sm font-medium disabled:opacity-60 ${STATUS.danger.button}`}
          >
            {deleting ? 'Deleting…' : 'Delete canvas'}
          </button>
        </div>
      </div>
    </div>
  );
}
