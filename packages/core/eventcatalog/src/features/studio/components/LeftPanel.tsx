import { memo, useMemo, useState, type DragEvent } from 'react';
import { Check, Plus, Search } from 'lucide-react';
import type { CatalogResource } from '../catalog-resources';
import { NODE_CATEGORIES, nodeDefinitions } from '../node-types';
import type { Thread } from '../hooks/use-comments';
import { CommentList } from './Comments';
import { CATALOG_GROUPS, NODE_ICONS } from './icons';
import { STATUS } from './status';

/** What's dragged from the left panel onto the canvas: a component's type, or a catalog resource's key */
export const COMPONENT_DRAG_TYPE = 'application/eventcatalog-studio';
export const CATALOG_DRAG_TYPE = 'application/eventcatalog-studio-resource';

/** A catalog group shows this many resources until it's expanded, so big catalogs stay quick */
const GROUP_PREVIEW_SIZE = 50;

const itemClass =
  'group flex cursor-grab items-center justify-between gap-2 rounded-md border px-2.5 py-2 bg-[rgb(var(--ec-page-bg))] border-[rgb(var(--ec-page-border))] hover:border-[rgb(var(--ec-accent))]';
const addButtonClass =
  'shrink-0 rounded p-0.5 opacity-0 group-hover:opacity-100 text-[rgb(var(--ec-icon-color))] hover:text-[rgb(var(--ec-accent))]';
const headingClass = 'px-1 text-[11px] font-semibold uppercase tracking-wide text-[rgb(var(--ec-page-text-muted))]';

const startDrag = (type: string, value: string) => (event: DragEvent) => {
  event.dataTransfer.setData(type, value);
  event.dataTransfer.effectAllowed = 'move';
};

type Tab = 'components' | 'catalog' | 'comments';

/** Components and catalog resources to drag onto the canvas, and the comments on it */
export default memo(function LeftPanel({
  resources,
  keysOnCanvas,
  onAddComponent,
  onAddResource,
  threads,
  showResolved,
  onToggleResolved,
  onOpenThread,
}: {
  resources: CatalogResource[];
  /** The catalog resources on the canvas */
  keysOnCanvas: Set<string>;
  onAddComponent: (type: string) => void;
  onAddResource: (key: string) => void;
  threads: Thread[];
  showResolved: boolean;
  onToggleResolved: () => void;
  onOpenThread: (thread: Thread) => void;
}) {
  const [tab, setTab] = useState<Tab>('components');
  const openThreads = threads.filter((thread) => !thread.resolved).length;
  const tabClass = (active: boolean) =>
    `flex flex-1 items-center justify-center gap-1 whitespace-nowrap rounded-md px-1.5 py-1 text-xs font-medium ${
      active ? 'bg-[rgb(var(--ec-page-bg))] shadow-sm' : 'text-[rgb(var(--ec-page-text-muted))]'
    }`;

  return (
    <aside className="flex w-72 shrink-0 flex-col border-r bg-[rgb(var(--ec-card-bg))] border-[rgb(var(--ec-page-border))]">
      <div className="m-3 flex gap-1 rounded-lg p-1 bg-[rgb(var(--ec-page-border)/0.5)]">
        <button className={tabClass(tab === 'components')} onClick={() => setTab('components')}>
          Components
        </button>
        <button className={tabClass(tab === 'catalog')} onClick={() => setTab('catalog')}>
          Catalog
        </button>
        <button className={tabClass(tab === 'comments')} onClick={() => setTab('comments')}>
          Comments
          {openThreads > 0 && (
            <span className="rounded-full px-1.5 text-[10px] leading-4 bg-[rgb(var(--ec-button-bg))] text-[rgb(var(--ec-button-text))]">
              {openThreads}
            </span>
          )}
        </button>
      </div>
      {tab === 'components' && <ComponentList onAdd={onAddComponent} />}
      {tab === 'catalog' && <CatalogList resources={resources} keysOnCanvas={keysOnCanvas} onAdd={onAddResource} />}
      {tab === 'comments' && (
        <CommentList threads={threads} showResolved={showResolved} onToggleResolved={onToggleResolved} onOpen={onOpenThread} />
      )}
    </aside>
  );
});

const listedDefinitions = NODE_CATEGORIES.map((category) => ({
  ...category,
  definitions: nodeDefinitions.filter((definition) => definition.category === category.id && !definition.unlisted),
}));

const ComponentList = memo(function ComponentList({ onAdd }: { onAdd: (type: string) => void }) {
  return (
    <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-3 pb-3">
      {listedDefinitions.map((category) => (
        <section key={category.id} className="space-y-1.5">
          <h3 className={headingClass}>{category.label}</h3>
          {category.definitions.map(({ type, label }) => {
            const { icon: Icon, className } = NODE_ICONS[type];
            return (
              <div key={type} draggable onDragStart={startDrag(COMPONENT_DRAG_TYPE, type)} className={itemClass}>
                <span className="flex items-center gap-2 text-xs font-medium">
                  <Icon size={16} className={className} />
                  {label}
                </span>
                <button onClick={() => onAdd(type)} title={`Add ${label}`} className={addButtonClass}>
                  <Plus size={14} />
                </button>
              </div>
            );
          })}
        </section>
      ))}
    </div>
  );
});

const CatalogList = memo(function CatalogList({
  resources,
  keysOnCanvas,
  onAdd,
}: {
  resources: CatalogResource[];
  keysOnCanvas: Set<string>;
  onAdd: (key: string) => void;
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
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="relative mx-3 mb-2">
        <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[rgb(var(--ec-icon-color))]" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search the catalog"
          className="w-full rounded-md border py-1.5 pl-8 pr-2 text-xs bg-[rgb(var(--ec-input-bg))] border-[rgb(var(--ec-input-border))] text-[rgb(var(--ec-input-text))]"
        />
      </div>
      <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-3 pb-3">
        {groups.length === 0 && (
          <p className="py-6 text-center text-xs text-[rgb(var(--ec-page-text-muted))]">No resources found.</p>
        )}
        {groups.map(({ collection, label, icon, className, items }) => {
          const shown = expanded.has(collection) ? items : items.slice(0, GROUP_PREVIEW_SIZE);
          return (
            <section key={collection} className="space-y-1.5">
              <h3 className={headingClass}>
                {label} <span className="font-normal">({items.length})</span>
              </h3>
              {shown.map((resource) => (
                <CatalogItem
                  key={resource.key}
                  resource={resource}
                  icon={icon}
                  iconClassName={className}
                  onCanvas={keysOnCanvas.has(resource.key)}
                  onAdd={onAdd}
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
            </section>
          );
        })}
      </div>
    </div>
  );
});

const CatalogItem = memo(function CatalogItem({
  resource,
  icon: Icon,
  iconClassName,
  onCanvas,
  onAdd,
}: {
  resource: CatalogResource;
  icon: (typeof CATALOG_GROUPS)[number]['icon'];
  iconClassName: string;
  onCanvas: boolean;
  onAdd: (key: string) => void;
}) {
  return (
    <div draggable onDragStart={startDrag(CATALOG_DRAG_TYPE, resource.key)} title={resource.summary} className={itemClass}>
      <span className="flex min-w-0 items-center gap-2 text-xs font-medium">
        <Icon size={16} className={`shrink-0 ${iconClassName}`} />
        <span className="truncate">{resource.name}</span>
        <span className="shrink-0 text-[10px] text-[rgb(var(--ec-page-text-muted))]">v{resource.version}</span>
      </span>
      <span className="flex shrink-0 items-center gap-1">
        {onCanvas && (
          <span title="On the canvas">
            <Check size={14} className={STATUS.success.text} />
          </span>
        )}
        <button onClick={() => onAdd(resource.key)} title={`Add ${resource.name}`} className={addButtonClass}>
          <Plus size={14} />
        </button>
      </span>
    </div>
  );
});
