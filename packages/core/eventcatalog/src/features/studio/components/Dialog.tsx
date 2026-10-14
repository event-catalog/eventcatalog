import { useEffect, useRef, type ReactNode } from 'react';

/**
 * Studio's dialogs: a card over the page, closed by Escape or clicking outside it (not while it's busy). Focus stays
 * in it: anything that moves focus outside (e.g. the menu it was opened from, closing) sends it back to its first
 * field or button.
 */

export const SECONDARY_BUTTON =
  'rounded-lg border px-4 py-2 text-sm font-medium border-[rgb(var(--ec-page-border))] hover:bg-[rgb(var(--ec-page-border)/0.4)] disabled:opacity-50';
export const PRIMARY_BUTTON =
  'rounded-lg px-4 py-2 text-sm font-medium bg-[rgb(var(--ec-button-bg))] text-[rgb(var(--ec-button-text))] hover:bg-[rgb(var(--ec-button-bg-hover))] disabled:opacity-60';

export default function Dialog({
  labelledBy,
  role = 'dialog',
  busy = false,
  onClose,
  children,
}: {
  /** The id of its heading */
  labelledBy: string;
  /** `alertdialog` when it asks to confirm something that can't be undone */
  role?: 'dialog' | 'alertdialog';
  /** Doing what was asked: it can't be closed until it's done */
  busy?: boolean;
  onClose: () => void;
  children: ReactNode;
}) {
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => event.key === 'Escape' && !busy && onClose();
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [onClose, busy]);

  const card = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const keepFocus = (event: FocusEvent) => {
      if (!card.current || card.current.contains(event.target as globalThis.Node)) return;
      card.current.querySelector<HTMLElement>('input, button')?.focus();
    };
    document.addEventListener('focusin', keepFocus);
    return () => document.removeEventListener('focusin', keepFocus);
  }, []);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={() => !busy && onClose()}>
      <div
        ref={card}
        role={role}
        aria-modal="true"
        aria-labelledby={labelledBy}
        onClick={(event) => event.stopPropagation()}
        className="w-full max-w-md rounded-xl border shadow-2xl bg-[rgb(var(--ec-card-bg))] border-[rgb(var(--ec-page-border))] text-[rgb(var(--ec-page-text))]"
      >
        {children}
      </div>
    </div>
  );
}
