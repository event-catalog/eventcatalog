/**
 * What to put on the canvas, as a drawing tool's palette: a card on the left, under the top left controls, each
 * component a tile to drag onto the canvas (or click, to add it in the middle of what's on screen). Only what the
 * level shows is listed, so what's added stays on it. An app can add tabs beside the components (e.g. EventCatalog's
 * catalog resources and comments), drawn with the same tiles.
 */
import {
  memo,
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  useSyncExternalStore,
  type DragEvent,
  type ReactNode,
} from "react";
import { ChevronDown, GripVertical, type LucideIcon } from "lucide-react";
import {
  componentKey,
  GROUP_TYPES,
  isShownOnLevel,
  NODE_CATEGORIES,
  nodeDefinitions,
} from "../node-types";
import type { Level } from "../levels";
import { useDragGhost, type StartDrag } from "./DragGhost";
import { NODE_ICONS } from "./icons";

/** What's dragged from the palette onto the canvas: a component's key (its type, or its kind of data store) */
export const COMPONENT_DRAG_TYPE = "application/eventcatalog-studio";

const listedDefinitions = NODE_CATEGORIES.map((category) => ({
  ...category,
  definitions: nodeDefinitions.filter(
    (definition) => definition.category === category.id && !definition.unlisted,
  ),
}));

// Each component's data, made once, for the node shown while it's dragged. Domains and systems are dragged as the
// node they'd be as a card (whether they're a card or a container is asked when they're dropped)
const cardPreview = (kind: "domain" | "system") => ({
  type: kind === "domain" ? "context-domain" : "system",
  data: {
    mode: "full",
    navigable: false,
    [kind]: {
      name: kind === "domain" ? "New Domain" : "New System",
      version: "0.0.1",
    },
  },
});
const componentPreviews = new Map(
  nodeDefinitions.map((definition) => [
    componentKey(definition),
    definition.type === GROUP_TYPES.domain
      ? cardPreview("domain")
      : definition.type === GROUP_TYPES.system
        ? cardPreview("system")
        : { type: definition.type, data: definition.createData() },
  ]),
);

const COLLAPSED_KEY = "eventcatalog-studio-palette-collapsed";
const readCollapsed = () => {
  try {
    return localStorage.getItem(COLLAPSED_KEY) === "true";
  } catch {
    return false;
  }
};

// Whether the palette's folded away, for what points at it (the empty canvas's hint): it's shown at the top then
let shownCollapsed = false;
const collapsedListeners = new Set<() => void>();
const showCollapsed = (collapsed: boolean) => {
  if (collapsed === shownCollapsed) return;
  shownCollapsed = collapsed;
  collapsedListeners.forEach((listener) => listener());
};
/** Whether the palette is folded away (false when there's none) */
export const usePaletteCollapsed = () =>
  useSyncExternalStore(
    (listener) => {
      collapsedListeners.add(listener);
      return () => collapsedListeners.delete(listener);
    },
    () => shownCollapsed,
    () => false,
  );

/**
 * A tile in the palette: its icon, its name and what it is, picked up and dragged onto the canvas (or clicked, to
 * add it). Greyed out (`usable` false) where it can't be added, still saying why.
 */
export function PaletteItem({
  icon: Icon,
  iconClassName,
  label,
  description,
  usable = true,
  onDragStart,
  onClick,
  title,
  trailing,
}: {
  icon: LucideIcon;
  iconClassName?: string;
  label: string;
  description?: ReactNode;
  usable?: boolean;
  onDragStart?: (event: DragEvent) => void;
  onClick?: () => void;
  title?: string;
  /** At the end instead of the drag handle (e.g. "on the canvas") */
  trailing?: ReactNode;
}) {
  return (
    <button
      type="button"
      draggable={usable && !!onDragStart}
      // (not disabled: it still says why it can't be added)
      aria-disabled={!usable}
      onDragStart={usable ? onDragStart : undefined}
      onClick={usable ? onClick : undefined}
      aria-label={label}
      title={title}
      className={`group flex w-full items-center gap-2.5 rounded-lg border border-[rgb(var(--ec-page-border))] bg-[rgb(var(--ec-card-bg))] py-1 pl-1 pr-2 text-left text-[rgb(var(--ec-page-text))] shadow-[0_1px_2px_rgb(0_0_0/0.05)] transition-[transform,box-shadow,border-color] duration-150 ${
        usable
          ? "cursor-grab hover:-translate-y-px hover:border-[color-mix(in_srgb,rgb(var(--ec-accent))_45%,transparent)]! hover:shadow-[0_4px_12px_rgb(0_0_0/0.08)] active:translate-y-0 active:cursor-grabbing"
          : "cursor-not-allowed opacity-40 grayscale"
      }`}
    >
      <span className="flex h-8 w-8 flex-none items-center justify-center rounded-md bg-[rgb(var(--ec-content-hover))]">
        <Icon size={16} className={iconClassName} />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[13px] font-medium leading-tight">
          {label}
        </span>
        {description && (
          <span className="block truncate text-[11px] leading-snug text-[rgb(var(--ec-page-text-muted))]">
            {description}
          </span>
        )}
      </span>
      {trailing ??
        (usable && onDragStart && (
          // It's picked up and dragged on (a click adds it in the middle): a small handle says so
          <GripVertical
            aria-hidden
            size={14}
            className="flex-none text-[rgb(var(--ec-page-text-muted))] opacity-40 transition-opacity group-hover:opacity-80"
          />
        ))}
    </button>
  );
}

/** A section of tiles, under a small heading */
export function PaletteSection({
  title,
  divided = false,
  children,
}: {
  title: ReactNode;
  /** A line above it (e.g. what this level doesn't show, at the bottom) */
  divided?: boolean;
  children: ReactNode;
}) {
  return (
    <section
      className={
        divided ? "border-t border-[rgb(var(--ec-page-border))] pt-3" : ""
      }
    >
      <h3 className="mb-1.5 text-[11px] font-medium text-[rgb(var(--ec-page-text-muted))]">
        {title}
      </h3>
      <div className="space-y-1.5">{children}</div>
    </section>
  );
}

/** A tab an app adds beside the components: what it lists, given how to start dragging something onto the canvas */
export type PaletteTab = {
  id: string;
  label: string;
  /** A count beside its name (e.g. open comments) */
  badge?: number;
  render: (startDrag: StartDrag) => ReactNode;
};

const COMPONENTS_TAB = "components";

export const Palette = memo(function Palette({
  level,
  onAddComponent,
  footer,
  tabs,
  tab,
  onTabChange,
  startCollapsed,
}: {
  /** The level shown: only what it shows is listed */
  level: Level;
  onAddComponent: (key: string) => void;
  /** At the bottom, under the list (e.g. taking the diagram to EventCatalog) */
  footer?: ReactNode;
  /** More tabs beside the components (the components are the first) */
  tabs?: PaletteTab[];
  /** The tab shown, when the app chooses it (it opens the palette if it's folded away) */
  tab?: string;
  onTabChange?: (tab: string) => void;
  /** Starts folded away, whatever this browser remembers (and doesn't remember it), e.g. in a chat's small view */
  startCollapsed?: boolean;
}) {
  // What's being dragged onto the canvas, drawn as the node it becomes (see DragGhost)
  const { startDrag, ghost } = useDragGhost();
  // Folded away to see more of the canvas (remembered in this browser)
  const [collapsed, setCollapsed] = useState(
    () => startCollapsed ?? readCollapsed(),
  );
  const remember = (next: boolean) => {
    if (startCollapsed !== undefined) return;
    try {
      localStorage.setItem(COLLAPSED_KEY, String(next));
    } catch {}
  };
  // Before it's painted, so what points at it doesn't show in the wrong place first
  useLayoutEffect(() => showCollapsed(collapsed), [collapsed]);
  useLayoutEffect(() => () => showCollapsed(false), []);
  const toggle = useCallback(() => {
    setCollapsed((current) => {
      remember(!current);
      return !current;
    });
  }, []);
  const [ownTab, setOwnTab] = useState(COMPONENTS_TAB);
  const shown =
    tab ??
    (tabs?.some((candidate) => candidate.id === ownTab)
      ? ownTab
      : COMPONENTS_TAB);
  const choose = (next: string) => {
    setOwnTab(next);
    onTabChange?.(next);
    if (collapsed) {
      setCollapsed(false);
      remember(false);
    }
  };
  // Chosen by the app (e.g. the comments from the bottom left controls): shown, opened if it was folded away
  const chosen = useRef(tab);
  useEffect(() => {
    if (tab === chosen.current) return;
    chosen.current = tab;
    if (tab === undefined || !collapsed) return;
    setCollapsed(false);
    remember(false);
  }, [tab]);

  // Listed in their categories' order, so the greyed ones keep the same order as the rest
  const unavailable = listedDefinitions.flatMap((category) =>
    category.definitions.filter(
      (definition) => !isShownOnLevel(definition.type, level),
    ),
  );

  const tile = (
    definition: (typeof nodeDefinitions)[number],
    usable = true,
  ) => {
    const { label, summary, firstLevel } = definition;
    const key = componentKey(definition);
    const { icon, className } = NODE_ICONS[key] ?? NODE_ICONS[definition.type];
    return (
      <PaletteItem
        key={key}
        icon={icon}
        iconClassName={className}
        label={usable ? label : `${label}: shown from Level ${firstLevel}`}
        description={usable ? summary : `Shown from Level ${firstLevel}`}
        usable={usable}
        onDragStart={startDrag(
          COMPONENT_DRAG_TYPE,
          key,
          componentPreviews.get(key)!,
        )}
        onClick={() => onAddComponent(key)}
        title={
          usable ? `${label}: drag onto the canvas, or click to add` : undefined
        }
      />
    );
  };

  const components = (
    <>
      {listedDefinitions.map((category) => {
        const definitions = category.definitions.filter((definition) =>
          isShownOnLevel(definition.type, level),
        );
        if (!definitions.length) return null;
        return (
          <PaletteSection key={category.id} title={category.label}>
            {definitions.map((definition) => tile(definition))}
          </PaletteSection>
        );
      })}
      {/* What this level doesn't show, greyed out at the bottom: they're added on the levels that show them */}
      {unavailable.length > 0 && (
        <PaletteSection title={`Not on Level ${level}`} divided>
          {unavailable.map((definition) => tile(definition, false))}
        </PaletteSection>
      )}
    </>
  );
  const extra = tabs?.find((candidate) => candidate.id === shown);
  const tabButton = (id: string, label: string, badge?: number) => (
    <button
      key={id}
      type="button"
      role="tab"
      aria-selected={shown === id}
      onClick={() => choose(id)}
      className={`flex flex-1 items-center justify-center gap-1 whitespace-nowrap rounded-md px-1.5 py-1 text-xs font-medium ${
        shown === id && !collapsed
          ? "bg-[rgb(var(--ec-card-bg))] text-[rgb(var(--ec-page-text))] shadow-sm"
          : "text-[rgb(var(--ec-page-text-muted))] hover:text-[rgb(var(--ec-page-text))]"
      }`}
    >
      {label}
      {!!badge && (
        <span className="rounded-full bg-[rgb(var(--ec-accent))] px-1.5 text-[10px] leading-4 text-white">
          {badge}
        </span>
      )}
    </button>
  );

  return (
    <div
      // Down to just above the zoom and undo controls (only its header, folded away)
      className={`absolute left-3 top-[62px] z-10 flex w-[264px] flex-col ${collapsed ? "" : "bottom-[68px]"} rounded-xl border border-[rgb(var(--ec-page-border))] bg-[rgb(var(--ec-card-bg))] text-[rgb(var(--ec-page-text))] shadow-[0_8px_24px_rgb(0_0_0/0.08),0_1px_3px_rgb(0_0_0/0.05)]`}
    >
      {tabs?.length ? (
        <div className="flex flex-none items-center gap-1 p-2">
          <div
            role="tablist"
            className="flex flex-1 gap-0.5 rounded-lg bg-[rgb(var(--ec-page-border)/0.5)] p-0.5"
          >
            {tabButton(COMPONENTS_TAB, "Components")}
            {tabs.map(({ id, label, badge }) => tabButton(id, label, badge))}
          </div>
          <button
            type="button"
            onClick={toggle}
            aria-expanded={!collapsed}
            aria-label={
              collapsed ? "Show the palette" : "Fold the palette away"
            }
            className="flex-none rounded-md p-1 text-[rgb(var(--ec-page-text-muted))] hover:bg-[rgb(var(--ec-page-border)/0.5)]"
          >
            <ChevronDown
              aria-hidden
              className={`h-4 w-4 transition-transform ${collapsed ? "-rotate-90" : ""}`}
            />
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={toggle}
          aria-expanded={!collapsed}
          className="flex flex-none items-center justify-between rounded-xl px-3.5 py-2.5 text-left text-[13px] font-semibold hover:bg-[rgb(var(--ec-content-hover))]!"
        >
          {/* What can be added depends on the level shown (what it doesn't show is greyed out below) */}
          <span>Resources</span>
          <ChevronDown
            aria-hidden
            className={`h-4 w-4 text-[rgb(var(--ec-page-text-muted))] transition-transform ${collapsed ? "-rotate-90" : ""}`}
          />
        </button>
      )}
      {!collapsed && (
        <div className="min-h-0 flex-1 space-y-3 overflow-y-auto px-3 pb-3">
          {extra ? extra.render(startDrag) : components}
        </div>
      )}
      {!collapsed && footer && (
        <div className="flex-none border-t border-[rgb(var(--ec-page-border))] px-3 py-2.5">
          {footer}
        </div>
      )}
      {ghost}
    </div>
  );
});
