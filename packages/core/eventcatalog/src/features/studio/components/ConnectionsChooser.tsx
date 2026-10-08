import { useEffect, useState, type ReactElement } from 'react';
import { X } from 'lucide-react';
import type { ConnectionGroup, ConnectionGroupId } from '../canvas-actions';
import type { CatalogResource } from '../catalog-resources';
import { getNodeLabel } from '../node-types';
import { CardPreview } from './ContainerChooser';

/**
 * Asked when a catalog service or message is dropped on the canvas (and connects to things that aren't on it yet):
 * just it, or it with its connections (a service's messages and data stores, the services that send and receive a
 * message), picked by group. Styled like the domain and system chooser.
 */

export type ConnectionsChoice = { as: 'card' } | { as: 'connected'; include: CatalogResource[] };

// It in the middle, what comes in before it and what goes out after it
const ConnectedPreview = () => (
  <svg viewBox="0 0 64 36" className="h-9 w-16" aria-hidden>
    <rect x="1" y="7" width="10" height="8" rx="1.5" fill="currentColor" fillOpacity="0.4" />
    <rect x="1" y="21" width="10" height="8" rx="1.5" fill="currentColor" fillOpacity="0.4" />
    <path d="M11 11h8M11 25h8" stroke="currentColor" strokeOpacity="0.5" strokeWidth="1.5" />
    <rect
      x="19"
      y="8"
      width="26"
      height="20"
      rx="4"
      fill="currentColor"
      fillOpacity="0.1"
      stroke="currentColor"
      strokeOpacity="0.5"
      strokeWidth="1.5"
    />
    <rect x="23" y="13" width="13" height="3" rx="1.5" fill="currentColor" fillOpacity="0.6" />
    <rect x="23" y="19" width="17" height="2" rx="1" fill="currentColor" fillOpacity="0.35" />
    <path d="M45 18h8" stroke="currentColor" strokeOpacity="0.5" strokeWidth="1.5" />
    <rect x="53" y="14" width="10" height="8" rx="1.5" fill="currentColor" fillOpacity="0.4" />
  </svg>
);

/** What "with its connections" brings, by what's dropped */
const CONNECTED_HINTS: Record<string, string> = {
  services: 'What it sends, receives and stores, around it',
};
const MESSAGE_HINT = 'The services that send and receive it, around it';

export default function ConnectionsChooser({
  resource,
  groups,
  position,
  onChoose,
  onCancel,
}: {
  resource: CatalogResource;
  /** What it connects to that isn't on the canvas yet */
  groups: ConnectionGroup[];
  /** Where to show it (screen coordinates) */
  position: { x: number; y: number };
  onChoose: (choice: ConnectionsChoice) => void;
  onCancel: () => void;
}) {
  const noun = getNodeLabel(resource.node.type).toLowerCase();
  const [included, setIncluded] = useState<Set<ConnectionGroupId>>(() => new Set(groups.map((group) => group.id)));
  const toggle = (id: ConnectionGroupId) =>
    setIncluded((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  const include = groups.flatMap((group) => (included.has(group.id) ? group.resources : []));
  const options: { as: ConnectionsChoice['as']; label: string; hint: string; Preview: () => ReactElement }[] = [
    { as: 'card', label: `Just the ${noun}`, hint: 'Connected to what is already on the canvas', Preview: CardPreview },
    {
      as: 'connected',
      label: 'With its connections',
      hint: CONNECTED_HINTS[resource.collection] ?? MESSAGE_HINT,
      Preview: ConnectedPreview,
    },
  ];

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => event.key === 'Escape' && onCancel();
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [onCancel]);

  // Kept on screen, next to where it was dropped
  const left = Math.min(Math.max(position.x - 160, 12), window.innerWidth - 332);
  const top = Math.min(Math.max(position.y - 20, 12), window.innerHeight - 300);

  return (
    <div className="fixed inset-0 z-50" onPointerDown={onCancel}>
      <div
        role="dialog"
        aria-label={`Add ${resource.name}`}
        onPointerDown={(event) => event.stopPropagation()}
        className="absolute w-80 rounded-lg border p-1.5 shadow-xl bg-[rgb(var(--ec-card-bg))] border-[rgb(var(--ec-page-border))] text-[rgb(var(--ec-page-text))]"
        style={{ left, top }}
      >
        <div className="flex items-start justify-between gap-2 px-2 pb-1.5 pt-1">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-wider text-[rgb(var(--ec-page-text-muted))]">
              Add this {noun}
            </p>
            <p className="truncate text-xs font-semibold">{resource.name}</p>
          </div>
          <button
            onClick={onCancel}
            aria-label="Cancel"
            className="rounded p-0.5 text-[rgb(var(--ec-icon-color))] hover:bg-[rgb(var(--ec-page-border)/0.5)]"
          >
            <X size={14} />
          </button>
        </div>

        <div className="grid grid-cols-2 gap-1.5 px-0.5 pb-0.5">
          {options.map(({ as, label, hint, Preview }) => (
            <button
              key={as}
              autoFocus={as === 'connected'}
              disabled={as === 'connected' && include.length === 0}
              onClick={() => onChoose(as === 'card' ? { as } : { as, include })}
              className="flex flex-col items-center gap-1 rounded-md border px-2 pb-1.5 pt-2 text-xs outline-none transition-colors border-[rgb(var(--ec-page-border))] text-[rgb(var(--ec-page-text-muted))] hover:border-[rgb(var(--ec-accent))] hover:bg-[rgb(var(--ec-accent)/0.08)] hover:text-[rgb(var(--ec-accent))] focus-visible:border-[rgb(var(--ec-accent))] focus-visible:text-[rgb(var(--ec-accent))] disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Preview />
              <span className="font-semibold">{label}</span>
              <span className="text-center text-[10px] leading-tight text-[rgb(var(--ec-page-text-muted))]">{hint}</span>
            </button>
          ))}
        </div>

        <div className="mt-1 space-y-0.5 px-2 pb-1">
          {groups.map((group) => (
            <label key={group.id} className="flex items-center gap-2 py-0.5 text-[11px] text-[rgb(var(--ec-page-text-muted))]">
              <input type="checkbox" checked={included.has(group.id)} onChange={() => toggle(group.id)} />
              {group.label} ({group.resources.length})
            </label>
          ))}
        </div>
      </div>
    </div>
  );
}
