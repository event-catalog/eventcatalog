import { memo, useEffect, useRef, useState } from 'react';
import { Check, ChevronDown } from 'lucide-react';
import { CANVAS_STATUSES, type CanvasStatus, type StatusChange } from '../canvas-doc';
import { timeAgo } from './Comments';
import { CANVAS_STATUS_LOOK } from './status';

/** Status changes shown in the menu, newest first */
const HISTORY_SHOWN = 8;

/**
 * The canvas's status (draft, proposed, accepted, rejected) as a pill beside its title. It opens a menu to change it,
 * with a note on why, and who changed it before.
 */
export default memo(function CanvasStatusMenu({
  status,
  history,
  onChange,
}: {
  status: CanvasStatus;
  history: StatusChange[];
  onChange: (status: CanvasStatus, note?: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [note, setNote] = useState('');
  const ref = useRef<HTMLDivElement>(null);
  const look = CANVAS_STATUS_LOOK[status];

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: PointerEvent) => {
      if (!ref.current?.contains(event.target as globalThis.Node)) setOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => event.key === 'Escape' && setOpen(false);
    window.addEventListener('pointerdown', onPointerDown);
    window.addEventListener('keydown', onKeyDown);
    return () => {
      window.removeEventListener('pointerdown', onPointerDown);
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [open]);

  const choose = (next: CanvasStatus) => {
    if (next !== status) onChange(next, note);
    setNote('');
    setOpen(false);
  };
  const recent = history.slice(-HISTORY_SHOWN).reverse();

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((current) => !current)}
        aria-label={`Status: ${look.label}`}
        aria-expanded={open}
        className={`flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-semibold ${look.pill}`}
      >
        {look.label}
        <ChevronDown size={12} />
      </button>
      {open && (
        <div className="absolute left-0 top-full z-50 mt-2 w-72 rounded-xl border p-1 shadow-xl bg-[rgb(var(--ec-card-bg))] border-[rgb(var(--ec-page-border))] text-[rgb(var(--ec-page-text))]">
          <p className="px-2.5 pb-1 pt-1.5 text-[11px] font-semibold uppercase tracking-wide text-[rgb(var(--ec-page-text-muted))]">
            Status
          </p>
          {CANVAS_STATUSES.map((value) => {
            const option = CANVAS_STATUS_LOOK[value];
            return (
              <button
                key={value}
                onClick={() => choose(value)}
                className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-1.5 text-left hover:bg-[rgb(var(--ec-page-border)/0.5)]"
              >
                <span className={`h-2 w-2 shrink-0 rounded-full ${option.dot}`} />
                <span className="min-w-0 flex-1">
                  <span className="block text-xs font-medium">{option.label}</span>
                  <span className="block text-[11px] text-[rgb(var(--ec-page-text-muted))]">{option.description}</span>
                </span>
                {value === status && <Check size={14} className="shrink-0 text-[rgb(var(--ec-accent))]" />}
              </button>
            );
          })}
          <div className="px-2.5 py-2">
            <input
              value={note}
              onChange={(event) => setNote(event.target.value)}
              placeholder="Add a note (optional), then pick a status"
              aria-label="Note for the status change"
              className="w-full rounded-md border px-2 py-1.5 text-xs bg-[rgb(var(--ec-input-bg))] border-[rgb(var(--ec-input-border))] text-[rgb(var(--ec-input-text))] placeholder:text-[rgb(var(--ec-page-text-muted))] focus:outline-none focus:border-[rgb(var(--ec-accent))]"
            />
          </div>
          {recent.length > 0 && (
            <>
              <div className="my-1 h-px bg-[rgb(var(--ec-page-border))]" />
              <p className="px-2.5 pb-1 pt-1.5 text-[11px] font-semibold uppercase tracking-wide text-[rgb(var(--ec-page-text-muted))]">
                History
              </p>
              <ul className="max-h-48 space-y-1.5 overflow-y-auto px-2.5 pb-2">
                {recent.map((change) => (
                  <li key={`${change.at}-${change.status}`} className="text-[11px]">
                    <span className="flex items-center gap-1.5">
                      <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${CANVAS_STATUS_LOOK[change.status].dot}`} />
                      <span className="font-medium">{CANVAS_STATUS_LOOK[change.status].label}</span>
                      <span className="text-[rgb(var(--ec-page-text-muted))]">
                        by {change.by.name} · {timeAgo(change.at)}
                      </span>
                    </span>
                    {change.note && <span className="block pl-3 text-[rgb(var(--ec-page-text-muted))]">{change.note}</span>}
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>
      )}
    </div>
  );
});
