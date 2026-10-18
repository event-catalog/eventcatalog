/**
 * A short message in the bottom right of the diagram, for what just happened (copied, saved: green) or what went wrong
 * (a file that couldn't be opened or saved: red). It rises in and goes away on its own. Tailwind with EventCatalog's
 * theme variables (the badge colours, so it follows light, dark and custom themes).
 */
import { CircleAlert, CircleCheck, X } from 'lucide-react';

export type Notice = { text: string; tone: 'success' | 'error' };

// The badge background is see-through in dark themes, so it's laid over the card's colour to stay solid
const TONES = {
  success:
    'border-[rgb(var(--ec-badge-color-green-text)/0.35)] text-[rgb(var(--ec-badge-color-green-text))] bg-[linear-gradient(rgb(var(--ec-badge-color-green-background)),rgb(var(--ec-badge-color-green-background)))]',
  error:
    'border-[rgb(var(--ec-badge-color-red-text)/0.35)] text-[rgb(var(--ec-badge-color-red-text))] bg-[linear-gradient(rgb(var(--ec-badge-color-red-background)),rgb(var(--ec-badge-color-red-background)))]',
} as const;

export function Toast({ notice, onClose }: { notice: Notice; onClose: () => void }) {
  const success = notice.tone === 'success';
  const Icon = success ? CircleCheck : CircleAlert;
  return (
    <div
      role={success ? 'status' : 'alert'}
      className={`ec-toast absolute bottom-6 right-6 z-[90] flex max-w-[min(420px,calc(100%-48px))] items-center gap-2.5 rounded-xl border bg-[rgb(var(--ec-card-bg))] py-2.5 pl-3 pr-2 text-sm font-medium shadow-[0_12px_32px_rgb(0_0_0/0.14),0_2px_6px_rgb(0_0_0/0.06)] ${TONES[notice.tone]}`}
    >
      <Icon aria-hidden className="h-[18px] w-[18px] flex-none" />
      <span className="min-w-0 flex-1">{notice.text}</span>
      <button
        type="button"
        aria-label="Dismiss"
        onClick={onClose}
        className="flex-none rounded-md p-1 opacity-70 hover:bg-[rgb(var(--ec-page-text)/0.08)]! hover:opacity-100"
      >
        <X aria-hidden className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}
