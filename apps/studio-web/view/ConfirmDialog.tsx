/**
 * Asks before something replaces the canvas (opening a shared link over one that has work on it, starting a new
 * canvas), as Excalidraw asks. Tailwind with EventCatalog's theme variables, on Headless UI's Dialog.
 */
import type { ReactNode } from 'react';
import { Dialog, DialogBackdrop, DialogPanel, DialogTitle } from '@headlessui/react';

type ConfirmDialogProps = {
  open: boolean;
  title: string;
  children: ReactNode;
  confirmLabel: string;
  cancelLabel?: string;
  /** Destructive (it replaces or deletes something): the confirm button is red */
  danger?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
};

const button = 'inline-flex h-9 flex-none items-center gap-2 rounded-lg px-4 text-sm font-medium transition-colors';
const secondary = `${button} border border-[rgb(var(--ec-page-border))] text-[rgb(var(--ec-page-text))] hover:bg-[rgb(var(--ec-content-hover))]!`;

export function ConfirmDialog({ open, title, children, confirmLabel, cancelLabel = 'Cancel', danger, onConfirm, onCancel }: ConfirmDialogProps) {
  const primary = danger
    ? `${button} bg-red-600 text-white hover:bg-red-700!`
    : `${button} bg-[rgb(var(--ec-primary-bg))] text-[rgb(var(--ec-primary-text))] hover:bg-[rgb(var(--ec-primary-bg)/0.85)]!`;
  return (
    <Dialog open={open} onClose={onCancel} className="relative z-[80]">
      <DialogBackdrop transition className="fixed inset-0 bg-black/40 transition-opacity duration-150 data-closed:opacity-0" />
      <div className="fixed inset-0 flex items-center justify-center p-4">
        <DialogPanel
          transition
          className="w-full max-w-md rounded-xl border border-[rgb(var(--ec-page-border))] bg-[rgb(var(--ec-card-bg))] p-5 text-[rgb(var(--ec-page-text))] shadow-2xl transition duration-150 data-closed:scale-[0.98] data-closed:opacity-0"
        >
          <DialogTitle className="text-base font-semibold">{title}</DialogTitle>
          <div className="mt-2 text-sm leading-relaxed text-[rgb(var(--ec-page-text-muted))]">{children}</div>
          <div className="mt-5 flex justify-end gap-2">
            <button type="button" className={secondary} onClick={onCancel}>
              {cancelLabel}
            </button>
            <button type="button" className={primary} onClick={onConfirm} data-autofocus>
              {confirmLabel}
            </button>
          </div>
        </DialogPanel>
      </div>
    </Dialog>
  );
}
