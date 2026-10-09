import { useState } from 'react';
import { usePeople, type PresenceStore } from '../hooks/presence-store';
import Dialog, { SECONDARY_BUTTON } from './Dialog';
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
    <Dialog role="alertdialog" labelledBy="delete-canvas-title" busy={deleting} onClose={onClose}>
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
        <button onClick={onClose} disabled={deleting} className={SECONDARY_BUTTON}>
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
    </Dialog>
  );
}
