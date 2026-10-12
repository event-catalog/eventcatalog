import { memo, useMemo, useState } from 'react';
import { Check, Search } from 'lucide-react';
import type { CatalogResource } from '../catalog-resources';
import { catalogNodeData } from '../catalog';
import {
  isShownOnLevel,
  type Level,
  type StartDrag,
  CATALOG_GROUPS,
  STATUS,
  Palette,
  PaletteItem,
  PaletteSection,
  type PaletteTab,
} from '@eventcatalog/visualiser/studio';

/** What's dragged from the left panel onto the canvas: a component's key, or a catalog resource's key */
export { COMPONENT_DRAG_TYPE } from '@eventcatalog/visualiser/studio';
export const CATALOG_DRAG_TYPE = 'application/eventcatalog-studio-resource';

/** A catalog group shows this many resources until it's expanded, so big catalogs stay quick */
const GROUP_PREVIEW_SIZE = 50;

export type LeftPanelTab = 'components' | 'catalog';

/**
 * Studio's palette (as Studio on the web's): components to drag onto the canvas, and here also the catalog's
 * resources, as a tab in the same card (the comments are listed from the bottom left controls)
 */
export default memo(function LeftPanel({
  level,
  onShowAll,
  resources,
  keysOnCanvas,
  onAddComponent,
  onAddResource,
  tab,
  onTabChange,
  startCollapsed,
}: {
  /** The level shown: only what it shows is listed, so what's added stays on it */
  level: Level;
  /** Goes to L3, which shows everything */
  onShowAll: () => void;
  resources: CatalogResource[];
  /** The catalog resources on the canvas */
  keysOnCanvas: Set<string>;
  onAddComponent: (type: string) => void;
  onAddResource: (key: string) => void;
  /** The tab shown, when the canvas chooses it */
  tab?: LeftPanelTab;
  onTabChange?: (tab: LeftPanelTab) => void;
  /** Starts folded away (e.g. in a chat, where there's little room) */
  startCollapsed?: boolean;
}) {
  const shownResources = useMemo(
    () => (level === 3 ? resources : resources.filter((resource) => isShownOnLevel(resource.node.type, level))),
    [resources, level]
  );
  const tabs = useMemo(
    (): PaletteTab[] => [
      {
        id: 'catalog',
        label: 'Catalog Resources',
        render: (startDrag) => (
          <>
            {level !== 3 && <LevelHint level={level} onShowAll={onShowAll} />}
            <CatalogList resources={shownResources} keysOnCanvas={keysOnCanvas} onAdd={onAddResource} startDrag={startDrag} />
          </>
        ),
      },
    ],
    [level, onShowAll, shownResources, keysOnCanvas, onAddResource]
  );

  return (
    <Palette
      level={level}
      onAddComponent={onAddComponent}
      tabs={tabs}
      tab={tab}
      onTabChange={onTabChange as ((tab: string) => void) | undefined}
      startCollapsed={startCollapsed}
    />
  );
});

/** On L1 and L2: only what the level shows is listed (added there, it stays there), the rest is on L3 */
function LevelHint({ level, onShowAll }: { level: Level; onShowAll: () => void }) {
  return (
    <p className="text-[11px] leading-snug text-[rgb(var(--ec-page-text-muted))]">
      Showing what L{level} shows.{' '}
      <button onClick={onShowAll} className="font-medium text-[rgb(var(--ec-accent))] hover:underline">
        Go to L3 for everything
      </button>
    </p>
  );
}

function CatalogList({
  resources,
  keysOnCanvas,
  onAdd,
  startDrag,
}: {
  resources: CatalogResource[];
  keysOnCanvas: Set<string>;
  onAdd: (key: string) => void;
  startDrag: StartDrag;
}) {
  const [search, setSearch] = useState('');
  const [expanded, setExpanded] = useState<Set<string>>(() => new Set());
  const groups = useMemo(() => {
    const term = search.trim().toLowerCase();
    const matches = term
      ? resources.filter((resource) => resource.name.toLowerCase().includes(term) || resource.id.toLowerCase().includes(term))
      : resources;
    return CATALOG_GROUPS.map((group) => ({
      ...group,
      items: matches.filter((resource) => resource.collection === group.collection),
    })).filter((group) => group.items.length > 0);
  }, [resources, search]);

  return (
    <>
      <div className="relative">
        <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[rgb(var(--ec-icon-color))]" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search the catalog"
          className="w-full rounded-lg border py-1.5 pl-8 pr-2 text-xs bg-[rgb(var(--ec-input-bg))] border-[rgb(var(--ec-input-border))] text-[rgb(var(--ec-input-text))]"
        />
      </div>
      {groups.length === 0 && (
        <p className="py-6 text-center text-xs text-[rgb(var(--ec-page-text-muted))]">No resources found.</p>
      )}
      {groups.map(({ collection, label, icon, className, items }) => {
        const shown = expanded.has(collection) ? items : items.slice(0, GROUP_PREVIEW_SIZE);
        return (
          <PaletteSection key={collection} title={`${label} (${items.length})`}>
            {shown.map((resource) => (
              <CatalogItem
                key={resource.key}
                resource={resource}
                icon={icon}
                iconClassName={className}
                onCanvas={keysOnCanvas.has(resource.key)}
                onAdd={onAdd}
                startDrag={startDrag}
              />
            ))}
            {shown.length < items.length && (
              <button
                onClick={() => setExpanded((current) => new Set(current).add(collection))}
                className="w-full rounded-md px-2 py-1.5 text-xs font-medium text-[rgb(var(--ec-accent))] hover:bg-[rgb(var(--ec-accent-subtle))]"
              >
                Show all {items.length} {label.toLowerCase()}
              </button>
            )}
          </PaletteSection>
        );
      })}
    </>
  );
}

const CatalogItem = memo(function CatalogItem({
  resource,
  icon,
  iconClassName,
  onCanvas,
  onAdd,
  startDrag,
}: {
  resource: CatalogResource;
  icon: (typeof CATALOG_GROUPS)[number]['icon'];
  iconClassName: string;
  onCanvas: boolean;
  onAdd: (key: string) => void;
  startDrag: StartDrag;
}) {
  // Drawn like the card it becomes (domains and systems can become containers too, but start as cards)
  const preview = useMemo(() => ({ type: resource.node.type, data: catalogNodeData(resource) }), [resource]);
  return (
    <PaletteItem
      icon={icon}
      iconClassName={iconClassName}
      label={resource.name}
      description={resource.summary ? `v${resource.version} · ${resource.summary}` : `v${resource.version}`}
      onDragStart={startDrag(CATALOG_DRAG_TYPE, resource.key, preview)}
      onClick={() => onAdd(resource.key)}
      title={`${resource.name}: drag onto the canvas, or click to add`}
      trailing={
        onCanvas ? (
          <span title="On the canvas" className="flex-none">
            <Check size={14} className={STATUS.success.text} />
          </span>
        ) : undefined
      }
    />
  );
});
