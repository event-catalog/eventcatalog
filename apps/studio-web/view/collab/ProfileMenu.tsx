/**
 * Who they are here, top right: their avatar, opening their name and colour to change. They're on their comments,
 * and on their cursor in live sessions. Kept in this browser. Tailwind with EventCatalog's theme, on Headless UI.
 */
import { useEffect, useState } from 'react';
import { Popover, PopoverButton, PopoverPanel } from '@headlessui/react';
import { PERSON_COLORS } from './room';

const initials = (name: string) => {
  const words = name.trim().split(/\s+/).filter(Boolean);
  return (words.length > 1 ? words.map((word) => word[0]).join('') : name.trim()).slice(0, 2).toUpperCase();
};

export function ProfileMenu({ me, onChange, className = '' }: { me: { name: string; color: string }; onChange: (change: { name?: string; color?: string }) => void; className?: string }) {
  const [draft, setDraft] = useState(me.name);
  useEffect(() => setDraft(me.name), [me.name]);
  const save = () => {
    const next = draft.trim();
    if (!next) return setDraft(me.name);
    if (next !== me.name) onChange({ name: next });
  };
  return (
    <Popover className={className}>
      <PopoverButton
        title={`${me.name}: change your name and colour`}
        className="flex h-[38px] w-[38px] items-center justify-center rounded-[9px] border border-[rgb(var(--ec-page-border))] bg-[rgb(var(--ec-card-bg))] shadow-sm outline-none hover:bg-[rgb(var(--ec-content-hover))]! focus-visible:ring-2 focus-visible:ring-[rgb(var(--ec-accent))]"
      >
        <span className="flex h-6 w-6 items-center justify-center rounded-full text-[10px] font-semibold text-white" style={{ background: me.color }}>
          {initials(me.name)}
        </span>
      </PopoverButton>
      <PopoverPanel
        anchor={{ to: 'bottom end', gap: 8 }}
        className="z-[70] w-72 rounded-xl border border-[rgb(var(--ec-page-border))] bg-[rgb(var(--ec-card-bg))] p-4 text-[rgb(var(--ec-page-text))] shadow-xl"
      >
        <div className="flex items-center gap-3">
          <span className="flex h-9 w-9 flex-none items-center justify-center rounded-full text-xs font-semibold text-white" style={{ background: me.color }}>
            {initials(draft || me.name)}
          </span>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold">{draft || me.name}</p>
            <p className="text-xs text-[rgb(var(--ec-page-text-muted))]">On your comments and in live sessions</p>
          </div>
        </div>
        <label className="mt-4 block text-xs font-medium text-[rgb(var(--ec-page-text-muted))]">
          Your name
          <input
            value={draft}
            maxLength={40}
            onChange={(event) => setDraft(event.target.value)}
            onBlur={save}
            onKeyDown={(event) => event.key === 'Enter' && (event.currentTarget as HTMLInputElement).blur()}
            className="mt-1.5 block h-9 w-full rounded-md border border-[rgb(var(--ec-page-border))] bg-[rgb(var(--ec-page-bg))] px-3 text-sm text-[rgb(var(--ec-page-text))] outline-none focus:border-[rgb(var(--ec-accent))]"
          />
        </label>
        <div className="mt-3 text-xs font-medium text-[rgb(var(--ec-page-text-muted))]">
          Your colour
          <div role="radiogroup" aria-label="Your colour" className="mt-2 flex gap-2">
            {PERSON_COLORS.map((color) => (
              <button
                key={color}
                type="button"
                role="radio"
                aria-checked={color === me.color}
                aria-label={color}
                onClick={() => onChange({ color })}
                className={`h-6 w-6 rounded-full transition-transform hover:scale-110 ${color === me.color ? 'ring-2 ring-[rgb(var(--ec-page-text))] ring-offset-2 ring-offset-[rgb(var(--ec-card-bg))]' : ''}`}
                style={{ background: color }}
              />
            ))}
          </div>
        </div>
      </PopoverPanel>
    </Popover>
  );
}
