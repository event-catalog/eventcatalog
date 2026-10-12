/**
 * The canvas's legend, bottom right: every kind of thing on it (containers too), with its icon and how many there
 * are. Clicking a kind hides or shows it. Looks like the visualiser's legend; it lists what the canvas has, which the
 * visualiser's doesn't all know (domains and systems as containers, teams, entities).
 */
import { memo } from 'react';
import { Panel, type Node } from '@xyflow/react';
import { GROUP_TYPES, isWrittenOnCanvas, NODE_ICONS } from '@eventcatalog/visualiser/studio';

/** Kinds that are the same thing drawn two ways (a domain as a container or a card) are one entry */
const SAME_AS: Record<string, string> = {
  'context-domain': GROUP_TYPES.domain,
  system: GROUP_TYPES.system,
  'context-actor': 'actor',
};

/** The legend entry a kind of node is counted in (and hidden with) */
export const legendKeyOf = (type?: string) => SAME_AS[type ?? ''] ?? type ?? '';

/** Each entry's name, in the order they're listed: the big boxes first, then what's in them, then the messages */
const ENTRIES: [key: string, label: string][] = [
  [GROUP_TYPES.domain, 'Domains'],
  [GROUP_TYPES.system, 'Systems'],
  ['team', 'Teams'],
  ['actor', 'Actors'],
  ['externalSystem', 'External systems'],
  ['service', 'Services'],
  ['agent', 'Agents'],
  ['view', 'Views'],
  ['data', 'Data stores'],
  ['entity', 'Entities'],
  ['event', 'Events'],
  ['command', 'Commands'],
  ['query', 'Queries'],
  ['channel', 'Channels'],
];
const ORDER = new Map(ENTRIES.map(([key], index) => [key, index]));
const LABELS = new Map(ENTRIES);

export type CanvasLegend = { key: string; label: string; count: number }[];

/** What's on the canvas, counted by kind (notes and text aren't listed) */
export const getCanvasLegend = (nodes: Node[]): CanvasLegend => {
  const counts = new Map<string, number>();
  for (const node of nodes) {
    if (!node.type || isWrittenOnCanvas(node.type)) continue;
    const key = legendKeyOf(node.type);
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  return [...counts]
    .map(([key, count]) => ({ key, count, label: LABELS.get(key) ?? key }))
    .sort((a, b) => (ORDER.get(a.key) ?? ORDER.size) - (ORDER.get(b.key) ?? ORDER.size));
};

export const Legend = memo(function Legend({
  legend,
  hiddenKeys,
  onToggle,
}: {
  legend: CanvasLegend;
  hiddenKeys: string[];
  onToggle: (key: string) => void;
}) {
  if (!legend.length) return null;
  return (
    <Panel position="bottom-right">
      <ul className="m-0 rounded-md border border-[rgb(var(--ec-page-border))] bg-[rgb(var(--ec-card-bg))] px-4 py-1 text-[12px] font-light shadow-md">
        {legend.map(({ key, label, count }) => {
          const look = NODE_ICONS[key];
          const hidden = hiddenKeys.includes(key);
          return (
            <li
              key={key}
              title={`${hidden ? 'Show' : 'Hide'} ${label.toLowerCase()}`}
              onClick={() => onToggle(key)}
              className={`flex cursor-pointer items-center gap-2 text-[10px] text-[rgb(var(--ec-page-text))] transition-opacity hover:text-[rgb(var(--ec-accent))] hover:underline ${hidden ? 'opacity-40' : ''}`}
            >
              {look ? (
                <look.icon aria-hidden className={`h-3 w-3 shrink-0 ${look.className}`} strokeWidth={2} />
              ) : (
                <span className="block h-2 w-2 bg-[rgb(var(--ec-page-text-muted))]" />
              )}
              <span>
                {label} ({count})
              </span>
            </li>
          );
        })}
      </ul>
    </Panel>
  );
});
