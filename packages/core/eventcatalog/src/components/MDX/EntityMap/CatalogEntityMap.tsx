/**
 * The entity map of the whole catalog: every entity and the references between them, beside a list of
 * the domains they belong to, to show or hide each one. Only references that cross domains can be
 * shown too. What's hidden is kept in the URL (`?hide=`), so a view can be shared.
 *
 * Grouping (by domain, system or team) is the visualiser's own "Group by" picker, kept in the URL too,
 * so it carries over when the graph is drawn again with other domains hidden. The page's starting
 * grouping only applies to the first graph: after that the URL says, so grouping by nothing sticks.
 */
import { useEffect, useMemo, useRef, useState, type ComponentProps } from 'react';
import { createPortal } from 'react-dom';
import type { Edge, Node } from '@xyflow/react';
import { Boxes, Eye, EyeOff, PanelLeftClose, PanelLeftOpen, Search, Shuffle } from 'lucide-react';
import AstroNodeGraph from '@components/MDX/NodeGraph/AstroNodeGraph';
import { getCrossDomainEdges, getDomainSummaries, getShownGraph } from '@utils/node-graphs/catalog-entity-map-view';

type Props = ComponentProps<typeof AstroNodeGraph> & { sharedLaneId: string };

const HIDE_PARAM = 'hide';
const CROSS_DOMAIN_PARAM = 'crossDomain';
// Whether the filters are collapsed, remembered in this browser (storage can be unavailable)
const COLLAPSED_KEY = 'eventcatalog:entity-map:filters-collapsed';
const PANEL_WIDTH = 288;
const RAIL_WIDTH = 44;

const readCollapsed = () => {
  try {
    return window.localStorage.getItem(COLLAPSED_KEY) === 'true';
  } catch {
    return false;
  }
};
const writeCollapsed = (collapsed: boolean) => {
  try {
    window.localStorage.setItem(COLLAPSED_KEY, String(collapsed));
  } catch {
    // Not remembered, then
  }
};
const isTyping = (target: EventTarget | null) =>
  target instanceof HTMLElement && (target.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName));

const readUrl = () => {
  const params = new URLSearchParams(window.location.search);
  return {
    hidden: new Set((params.get(HIDE_PARAM) || '').split(',').filter(Boolean)),
    crossDomainOnly: params.get(CROSS_DOMAIN_PARAM) === 'true',
  };
};

const writeUrl = (hidden: Set<string>, crossDomainOnly: boolean) => {
  const url = new URL(window.location.href);
  if (hidden.size > 0) url.searchParams.set(HIDE_PARAM, [...hidden].join(','));
  else url.searchParams.delete(HIDE_PARAM);
  if (crossDomainOnly) url.searchParams.set(CROSS_DOMAIN_PARAM, 'true');
  else url.searchParams.delete(CROSS_DOMAIN_PARAM);
  window.history.replaceState(window.history.state, '', url);
};

export default function CatalogEntityMap({ nodes, edges, sharedLaneId, ...graphProps }: Props) {
  const [{ hidden, crossDomainOnly }, setView] = useState(readUrl);
  const [query, setQuery] = useState('');
  const [collapsed, setCollapsed] = useState(readCollapsed);
  // The graph laid out again for a filtered view, with the view it's for (`key`), so a layout is never
  // shown for another view while that one's is being made
  const [laidOut, setLaidOut] = useState<{ key: string; nodes: Node[]; edges: Edge[] } | null>(null);

  const crossDomainEdges = useMemo(() => getCrossDomainEdges(nodes, edges, sharedLaneId), [nodes, edges, sharedLaneId]);
  const domains = useMemo(
    () => getDomainSummaries(nodes, crossDomainEdges, sharedLaneId),
    [nodes, crossDomainEdges, sharedLaneId]
  );
  const shown = useMemo(
    () => getShownGraph({ nodes, edges, crossDomainEdges, hidden, crossDomainOnly }),
    [nodes, edges, crossDomainEdges, hidden, crossDomainOnly]
  );
  // A new graph each time what's shown changes: the visualiser takes its nodes when it mounts
  const graphKey = [...hidden].sort().join(',') + (crossDomainOnly ? '|cross' : '');
  // The page's starting grouping is for the view the page opened with only. Once the filters change, the
  // graphs drawn follow the URL, which "Group by" keeps up to date, so grouping by nothing isn't undone.
  // Told by the view rather than by when the first graph rendered: the visualiser loads lazily and reads
  // its starting grouping once its nodes are ready, which can be after other re-renders of this page
  const firstGraphKey = useRef(graphKey);
  const filtersChanged = useRef(false);
  if (graphKey !== firstGraphKey.current) filtersChanged.current = true;

  // Entities hidden leave gaps in the layout the catalog gave the whole map, so what's shown is laid out
  // again (when grouped, the visualiser lays the groups out itself anyway)
  useEffect(() => {
    writeUrl(hidden, crossDomainOnly);
    if (shown.isEverything) return;
    let cancelled = false;
    // The same force layout the catalog gave the whole map. Should it fail, the entities keep their
    // places in the whole map's layout rather than nothing being drawn
    import('@utils/node-graphs/entity-layout')
      .then(({ layoutEntityNodes }) => layoutEntityNodes(shown.nodes, shown.edges))
      .catch(() => shown.nodes)
      .then((laidOutNodes) => {
        if (!cancelled) setLaidOut({ key: graphKey, nodes: laidOutNodes, edges: shown.edges });
      });
    return () => {
      cancelled = true;
    };
  }, [shown, graphKey, hidden, crossDomainOnly]);

  const toggle = (id: string) =>
    setView((view) => {
      const next = new Set(view.hidden);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return { ...view, hidden: next };
    });
  // Shows only this domain (or everything, when it's the only one shown)
  const solo = (id: string) =>
    setView((view) => {
      const others = domains.filter((domain) => domain.lane.id !== id).map((domain) => domain.lane.id);
      const isSolo = !view.hidden.has(id) && others.every((other) => view.hidden.has(other));
      return { ...view, hidden: isSolo ? new Set() : new Set(others) };
    });
  const setAll = (visible: boolean) =>
    setView((view) => ({ ...view, hidden: visible ? new Set() : new Set(domains.map((domain) => domain.lane.id)) }));

  const filteredDomains = domains.filter((domain) => domain.lane.name.toLowerCase().includes(query.toLowerCase()));
  const graph = shown.isEverything ? { nodes, edges } : laidOut?.key === graphKey ? laidOut : null;
  // Shown on the collapsed rail, so filters left on aren't forgotten
  const activeFilters = hidden.size + (crossDomainOnly ? 1 : 0);

  useEffect(() => writeCollapsed(collapsed), [collapsed]);
  // [ collapses and opens the filters
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== '[' || event.metaKey || event.ctrlKey || event.altKey || isTyping(event.target)) return;
      event.preventDefault();
      setCollapsed((isCollapsed) => !isCollapsed);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  return (
    <>
      <aside
        style={{ width: collapsed ? RAIL_WIDTH : PANEL_WIDTH }}
        className="relative shrink-0 border border-[rgb(var(--ec-page-border))] bg-[rgb(var(--ec-card-bg))] rounded-md overflow-hidden transition-[width] duration-300 ease-in-out motion-reduce:transition-none"
      >
        {/* Collapsed: a rail to open the filters again */}
        <div
          aria-hidden={!collapsed}
          className={`absolute inset-0 flex flex-col items-center gap-3 py-3 transition-[opacity,visibility] duration-200 ${
            collapsed ? 'opacity-100 visible delay-150' : 'opacity-0 invisible'
          }`}
        >
          <button
            type="button"
            onClick={() => setCollapsed(false)}
            title="Show filters ([)"
            aria-label="Show filters"
            className="p-1.5 rounded-md text-[rgb(var(--ec-icon-color))] hover:text-[rgb(var(--ec-icon-hover))] hover:bg-[rgb(var(--ec-accent-subtle)/0.5)]"
          >
            <PanelLeftOpen className="h-4 w-4" />
          </button>
          {activeFilters > 0 && (
            <span
              title={`${activeFilters} filter${activeFilters === 1 ? '' : 's'} on`}
              className="min-w-[1.25rem] h-5 px-1 flex items-center justify-center rounded-full text-[10px] font-semibold bg-[rgb(var(--ec-accent))] text-[rgb(var(--ec-accent-text))]"
            >
              {activeFilters}
            </span>
          )}
          <button
            type="button"
            onClick={() => setCollapsed(false)}
            className="[writing-mode:vertical-rl] rotate-180 text-xs text-[rgb(var(--ec-page-text-muted))] hover:text-[rgb(var(--ec-page-text))] whitespace-nowrap"
          >
            {shown.nodes.length} of {nodes.length} entities
          </button>
        </div>

        {/* Open: the filters, at their full width so nothing reflows while the panel slides */}
        <div
          aria-hidden={collapsed}
          style={{ width: PANEL_WIDTH - 2 }}
          className={`h-full flex flex-col transition-[opacity,visibility] duration-200 ${
            collapsed ? 'opacity-0 invisible' : 'opacity-100 visible delay-100'
          }`}
        >
          <div className="px-4 pt-4 pb-3 border-b border-[rgb(var(--ec-page-border))]">
            <div className="flex items-start justify-between gap-2">
              <h1 className="text-sm font-semibold text-[rgb(var(--ec-page-text))]">Global Entity Map</h1>
              <button
                type="button"
                onClick={() => setCollapsed(true)}
                title="Hide filters ([)"
                aria-label="Hide filters"
                className="-mt-1 -mr-2 p-1.5 rounded-md text-[rgb(var(--ec-icon-color))] hover:text-[rgb(var(--ec-icon-hover))] hover:bg-[rgb(var(--ec-accent-subtle)/0.5)]"
              >
                <PanelLeftClose className="h-4 w-4" />
              </button>
            </div>
            <p className="mt-1 text-xs text-[rgb(var(--ec-page-text-muted))]">
              {shown.nodes.length} of {nodes.length} entities · {crossDomainEdges.length} references across domains
            </p>
          </div>

          <label className="flex items-center gap-2.5 px-4 py-3 border-b border-[rgb(var(--ec-page-border))] cursor-pointer text-xs text-[rgb(var(--ec-page-text))]">
            <input
              type="checkbox"
              checked={crossDomainOnly}
              onChange={(event) => setView((view) => ({ ...view, crossDomainOnly: event.target.checked }))}
              className="accent-[rgb(var(--ec-accent))]"
            />
            <Shuffle className="h-3.5 w-3.5 text-[rgb(var(--ec-icon-color))]" />
            <span className="flex-1">Only references across domains</span>
          </label>

          <div className="px-4 pt-3 pb-2 flex items-center justify-between">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-[rgb(var(--ec-page-text-muted))]">
              Domains
            </span>
            <span className="flex gap-2 text-[11px]">
              <button type="button" onClick={() => setAll(true)} className="text-[rgb(var(--ec-accent))] hover:underline">
                Show all
              </button>
              <button type="button" onClick={() => setAll(false)} className="text-[rgb(var(--ec-accent))] hover:underline">
                Hide all
              </button>
            </span>
          </div>
          <div className="px-4 pb-2">
            <div className="flex items-center gap-2 px-2 h-8 rounded-md border border-[rgb(var(--ec-input-border))] bg-[rgb(var(--ec-input-bg))]">
              <Search className="h-3.5 w-3.5 text-[rgb(var(--ec-icon-color))]" />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Filter domains"
                className="flex-1 min-w-0 bg-transparent text-xs outline-none text-[rgb(var(--ec-input-text))]"
              />
            </div>
          </div>

          <ul className="flex-1 overflow-y-auto px-2 pb-3">
            {filteredDomains.map(({ lane, count, crossDomain }) => {
              const visible = !hidden.has(lane.id);
              return (
                <li
                  key={lane.id}
                  className="group flex items-center gap-1 rounded-md hover:bg-[rgb(var(--ec-accent-subtle)/0.5)]"
                >
                  <button
                    type="button"
                    onClick={() => toggle(lane.id)}
                    aria-pressed={visible}
                    className={`flex flex-1 min-w-0 items-center gap-2.5 px-2 py-1.5 text-left text-xs ${
                      visible ? 'text-[rgb(var(--ec-page-text))]' : 'text-[rgb(var(--ec-page-text-muted))] opacity-60'
                    }`}
                  >
                    {visible ? (
                      <Eye className="h-3.5 w-3.5 shrink-0 text-[rgb(var(--ec-icon-color))]" />
                    ) : (
                      <EyeOff className="h-3.5 w-3.5 shrink-0" />
                    )}
                    <span className={`flex-1 truncate ${lane.id.startsWith('__') ? 'italic' : 'font-medium'}`}>{lane.name}</span>
                    {crossDomain > 0 && (
                      <span
                        title={`${crossDomain} references across domains`}
                        className="flex items-center gap-0.5 text-[10px] text-[rgb(var(--ec-page-text-muted))]"
                      >
                        <Shuffle className="h-3 w-3" />
                        {crossDomain}
                      </span>
                    )}
                    <span className="tabular-nums text-[11px] text-[rgb(var(--ec-page-text-muted))]">{count}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => solo(lane.id)}
                    title={`Only show ${lane.name}`}
                    className="mr-1 p-1 rounded opacity-0 group-hover:opacity-100 text-[rgb(var(--ec-icon-color))] hover:text-[rgb(var(--ec-icon-hover))]"
                  >
                    <Boxes className="h-3.5 w-3.5" />
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      </aside>

      {graph && graph.nodes.length > 0 && (
        <AstroNodeGraph
          key={graphKey}
          {...graphProps}
          swimlanes={filtersChanged.current ? undefined : graphProps.swimlanes}
          nodes={graph.nodes}
          edges={graph.edges}
        />
      )}
      {graph && graph.nodes.length === 0 && <EmptyState portalId={graphProps.portalId || `${graphProps.id}-portal`} />}
    </>
  );
}

const EmptyState = ({ portalId }: { portalId: string }) => {
  const [container, setContainer] = useState<HTMLElement | null>(null);
  useEffect(() => setContainer(document.getElementById(portalId)), [portalId]);
  if (!container) return null;
  // Drawn in the graph's box, where the graph would be
  return createPortal(
    <div className="flex h-full items-center justify-center text-sm text-[rgb(var(--ec-page-text-muted))]">
      No entities to show. Pick a domain on the left.
    </div>,
    container
  );
};
