/**
 * Hotspots: what an architect (or the agent) flags on the architecture so people find what matters: risks, single
 * points of failure, known problems, the key parts to understand. Each is critical, a warning or info.
 *
 * On a node, a marker (its severity's icon: its title's in its tooltip, and its panel when it's opened) sits on its
 * top right corner (and the node glows in its colour, see studio.css); at a place, the marker's there. On L1 and L2 a node shows the hotspots inside it, to go and see them.
 * In the canvas's own coordinates (React Flow's viewport portal), counter-scaled to stay the same size on screen.
 */
import {
  memo,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type FormEvent,
  type KeyboardEvent,
  type PointerEvent,
  type ReactNode,
  type RefObject,
} from "react";
import {
  useInternalNode,
  useReactFlow,
  useStoreApi,
  type XYPosition,
} from "@xyflow/react";
import { CanvasPortal } from "../../utils/flow-portals";
import {
  Info,
  LocateFixed,
  OctagonAlert,
  Pencil,
  Trash2,
  TriangleAlert,
  X,
  type LucideIcon,
} from "lucide-react";
import type { Hotspot, HotspotSeverity } from "../canvas-doc";
import { isWrittenOnCanvas } from "../node-types";
import { AgentMark } from "./ClientLogos";
import { timeAgo } from "./Comments";
import { sendMove, useRemoteMoves, type LiveMoves } from "../live-moves";

export const SEVERITIES: Record<
  HotspotSeverity,
  { label: string; color: string; icon: LucideIcon; rank: number }
> = {
  critical: {
    label: "Critical",
    color: "#dc2626",
    icon: OctagonAlert,
    rank: 0,
  },
  warning: { label: "Warning", color: "#d97706", icon: TriangleAlert, rank: 1 },
  info: { label: "Info", color: "#2563eb", icon: Info, rank: 2 },
};
const SEVERITY_ORDER: HotspotSeverity[] = ["critical", "warning", "info"];

/** Most important first (then oldest first) */
export const bySeverity = (a: Hotspot, b: Hotspot) =>
  SEVERITIES[a.severity].rank - SEVERITIES[b.severity].rank ||
  a.createdAt - b.createdAt;
export const topSeverity = (hotspots: Hotspot[]) =>
  [...hotspots].sort(bySeverity)[0]?.severity;

/** Hotspots shown together: on a node (its own, or on L1 and L2 also the ones inside it), or one at a place */
export type HotspotSpot = {
  key: string;
  nodeId?: string;
  position?: XYPosition;
  hotspots: Hotspot[];
  inside?: boolean;
};
/** A hotspot being added: on a node, or at a place */
export type HotspotDraft = {
  nodeId?: string;
  position: XYPosition;
  level?: 1 | 2;
};
export type HotspotFields = {
  severity: HotspotSeverity;
  title: string;
  description?: string;
};

// Markers keep their size on screen as the canvas zooms in, and shrink with it zoomed out (to half their size at
// most), so they don't cover what they're about
const MARKER_SCALE = "--studio-hotspot-scale";
// What an open marker's panel is scaled by inside it, so it's always its full size on screen (to be read)
const PANEL_SCALE = "--studio-hotspot-panel-scale";
const MIN_SCREEN_SCALE = 0.5;

/** Keeps MARKER_SCALE on the layer as the canvas zooms, outside React, so markers don't re-render */
function useMarkerScale(ref: RefObject<HTMLElement | null>) {
  const store = useStoreApi();
  useLayoutEffect(() => {
    const apply = (zoom: number) => {
      const element = ref.current;
      if (!element) return;
      // In the canvas's coordinates: zoomed in, 1 / zoom (the same size on screen); zoomed out, the canvas's size
      // (1), until that's under MIN_SCREEN_SCALE on screen
      const scale = zoom >= 1 ? 1 / zoom : Math.max(1, MIN_SCREEN_SCALE / zoom);
      element.style.setProperty(MARKER_SCALE, String(scale));
      element.style.setProperty(PANEL_SCALE, String(1 / zoom / scale));
    };
    apply(store.getState().transform[2]);
    return store.subscribe((state, previous) => {
      if (state.transform[2] !== previous.transform[2])
        apply(state.transform[2]);
    });
  }, [store, ref]);
}

/** On its node's top right corner (following only that node), or at its place */
function SpotAt({
  nodeId,
  position,
  zIndex,
  children,
}: {
  nodeId?: string;
  position?: XYPosition;
  zIndex: number;
  children: ReactNode;
}) {
  const node = useInternalNode(nodeId ?? "");
  let at = position;
  if (nodeId) {
    if (!node) return null;
    const { x, y } = node.internals.positionAbsolute;
    at = { x: x + (node.measured.width ?? node.width ?? 0), y };
  }
  if (!at) return null;
  return (
    <div
      className="absolute"
      style={{
        left: at.x,
        top: at.y,
        transform: `scale(var(${MARKER_SCALE}, 1))`,
        transformOrigin: "0 0",
        zIndex,
      }}
    >
      {/* The marker's icon is centred on the corner */}
      <div className="nopan nodrag nowheel pointer-events-auto absolute left-[-14px] top-[-14px]">
        {children}
      </div>
    </div>
  );
}

function SeverityIcon({
  severity,
  size = 13,
}: {
  severity: HotspotSeverity;
  size?: number;
}) {
  const { icon: Icon } = SEVERITIES[severity];
  return <Icon size={size} strokeWidth={2.5} aria-hidden />;
}

/** Where a hotspot is put: on a node (it moves with it), or at a place */
export type HotspotPlace = { nodeId?: string; position: XYPosition };

// How far the pointer moves before a press on a marker is a drag (not a click)
const DRAG_THRESHOLD_PX = 4;
// The marker's icon (where it's anchored) is this far from its top left corner
const ICON_CENTRE_PX = 14;

/** Where a marker's dragged to: the screen point its icon is over, keeping where on the marker it was grabbed */
type MarkerDrag = (point: XYPosition, phase: "move" | "end") => void;

/** A marker's pointer and keys: a click (or Enter) opens it, and dragging it moves it (when it can be moved) */
function useMarkerDrag(onClick: () => void, onDrag?: MarkerDrag) {
  const drag = useRef<{
    start: XYPosition;
    grab: XYPosition;
    moved: boolean;
  } | null>(null);
  const pointOf = (
    event: { clientX: number; clientY: number },
    grab: XYPosition,
  ) => ({ x: event.clientX - grab.x, y: event.clientY - grab.y });
  return {
    onKeyDown: (event: KeyboardEvent<HTMLElement>) =>
      (event.key === "Enter" || event.key === " ") && onClick(),
    onPointerDown: (event: PointerEvent<HTMLElement>) => {
      if (event.button !== 0) return;
      // Keeps pointer events coming while the pointer is off the marker (throws if the pointer has gone)
      try {
        event.currentTarget.setPointerCapture(event.pointerId);
      } catch {}
      const rect = event.currentTarget.getBoundingClientRect();
      drag.current = {
        start: { x: event.clientX, y: event.clientY },
        grab: {
          x: event.clientX - rect.left - ICON_CENTRE_PX * (rect.height / 28),
          y: event.clientY - rect.top - rect.height / 2,
        },
        moved: false,
      };
    },
    onPointerMove: (event: PointerEvent<HTMLElement>) => {
      const current = drag.current;
      if (!current || !onDrag) return;
      if (
        !current.moved &&
        Math.hypot(
          event.clientX - current.start.x,
          event.clientY - current.start.y,
        ) < DRAG_THRESHOLD_PX
      )
        return;
      current.moved = true;
      onDrag(pointOf(event, current.grab), "move");
    },
    onPointerUp: (event: PointerEvent<HTMLElement>) => {
      const current = drag.current;
      drag.current = null;
      if (!current) return;
      if (current.moved) onDrag?.(pointOf(event, current.grab), "end");
      else onClick();
    },
    onPointerCancel: () => (drag.current = null),
  };
}

/**
 * The marker: its severity's colour and icon (and how many there are). Click opens it; dragging it moves it
 */
function Marker({
  spot,
  open,
  selected,
  onClick,
  onDrag,
}: {
  spot: HotspotSpot;
  open: boolean;
  /** Part of what's selected on the canvas (after selecting everything) */
  selected?: boolean;
  onClick: () => void;
  onDrag?: MarkerDrag;
}) {
  const handlers = useMarkerDrag(onClick, onDrag);
  const sorted = [...spot.hotspots].sort(bySeverity);
  const severity = sorted[0].severity;
  const count = sorted.length;
  // Just its icon (with how many, when there's more than one): the titles are in its tooltip, and opening it
  const label =
    count > 1 || spot.inside
      ? `${count} hotspot${count === 1 ? "" : "s"}`
      : sorted[0].title;
  return (
    <button
      type="button"
      aria-expanded={open}
      aria-label={label}
      title={sorted
        .map(
          (hotspot) =>
            `${SEVERITIES[hotspot.severity].label}: ${hotspot.title}`,
        )
        .join("\n")}
      {...handlers}
      className={`studio-hotspot-marker relative flex h-7 w-7 items-center justify-center rounded-full text-white ${onDrag ? "cursor-grab active:cursor-grabbing" : ""}`}
      style={{
        background: SEVERITIES[severity].color,
        touchAction: "none",
        ...(selected && {
          boxShadow:
            "0 0 0 2px rgb(var(--ec-card-bg)), 0 0 0 4px rgb(var(--ec-button-bg))",
        }),
      }}
    >
      <span className="flex h-5 w-5 flex-none items-center justify-center rounded-full bg-white/20">
        <SeverityIcon severity={severity} />
      </span>
      {count > 1 && (
        <span
          aria-hidden
          className="absolute -right-1.5 -top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-[rgb(var(--ec-card-bg))] px-1 text-[10px] font-bold leading-none shadow-sm"
          style={{ color: SEVERITIES[severity].color }}
        >
          {count}
        </span>
      )}
    </button>
  );
}

// Beside the marker, to its right (12px from its 28px icon, with room for the arrow), its arrow level with the icon's
// middle. studio.css scales it from the marker's right edge, so that stays the same on screen as the canvas zooms
const panelClass =
  "studio-hotspot-panel absolute left-[40px] top-[-8px] w-80 rounded-xl border border-[rgb(var(--ec-page-border))] bg-[rgb(var(--ec-card-bg))] text-[rgb(var(--ec-page-text))] shadow-xl";

/** The panel's arrow, pointing back at its marker (tinted as the header it's beside, when that is) */
const PanelArrow = ({ tint }: { tint?: string }) => (
  <span
    aria-hidden
    className="absolute left-[-6.5px] top-[16px] h-3 w-3 rotate-45 rounded-bl-[2px] border-b border-l border-[rgb(var(--ec-page-border))] bg-[rgb(var(--ec-card-bg))]"
    style={
      tint
        ? {
            background: `linear-gradient(${tint}14, ${tint}14), rgb(var(--ec-card-bg))`,
          }
        : undefined
    }
  />
);
const inputClass =
  "block w-full rounded-md border border-[rgb(var(--ec-input-border))] bg-[rgb(var(--ec-input-bg))] px-2.5 py-1.5 text-sm text-[rgb(var(--ec-input-text))] outline-none focus:border-[rgb(var(--ec-accent))]";

/** Adding or changing one: how important, what it is, and why */
function HotspotForm({
  initial,
  submitLabel,
  onSubmit,
  onCancel,
  onSeverityChange,
}: {
  initial?: HotspotFields;
  submitLabel: string;
  onSubmit: (fields: HotspotFields) => void;
  onCancel: () => void;
  /** As it's picked, so its marker (or panel) shows it straight away */
  onSeverityChange?: (severity: HotspotSeverity) => void;
}) {
  const [severity, setSeverity] = useState<HotspotSeverity>(
    initial?.severity ?? "warning",
  );
  const [title, setTitle] = useState(initial?.title ?? "");
  const [description, setDescription] = useState(initial?.description ?? "");
  const submit = (event?: FormEvent) => {
    event?.preventDefault();
    if (!title.trim()) return;
    onSubmit({
      severity,
      title: title.trim(),
      ...(description.trim() && { description: description.trim() }),
    });
  };
  return (
    <form
      onSubmit={submit}
      onKeyDown={(event) => {
        if (event.key === "Escape") {
          event.stopPropagation();
          onCancel();
        }
      }}
      className="space-y-2.5 p-3"
    >
      <div role="radiogroup" aria-label="How important" className="flex gap-1">
        {SEVERITY_ORDER.map((value) => {
          const picked = value === severity;
          return (
            <button
              key={value}
              type="button"
              role="radio"
              aria-checked={picked}
              onClick={() => {
                setSeverity(value);
                onSeverityChange?.(value);
              }}
              className="flex flex-1 items-center justify-center gap-1 rounded-md border px-2 py-1.5 text-xs font-semibold transition-colors"
              style={
                picked
                  ? {
                      background: SEVERITIES[value].color,
                      borderColor: SEVERITIES[value].color,
                      color: "#fff",
                    }
                  : {
                      borderColor: "rgb(var(--ec-page-border))",
                      color: SEVERITIES[value].color,
                    }
              }
            >
              <SeverityIcon severity={value} size={12} />
              {SEVERITIES[value].label}
            </button>
          );
        })}
      </div>
      <input
        autoFocus
        value={title}
        maxLength={120}
        onChange={(event) => setTitle(event.target.value)}
        placeholder="What should people know? e.g. Single point of failure"
        className={inputClass}
      />
      <textarea
        value={description}
        maxLength={1000}
        rows={5}
        onChange={(event) => setDescription(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === "Enter" && (event.metaKey || event.ctrlKey))
            submit();
        }}
        placeholder="Why it matters, and what to do about it (optional)"
        // Dragged taller (from its corner) to read or write more
        className={`${inputClass} min-h-20 max-h-[60vh] resize-y`}
      />
      <div className="flex justify-end gap-2">
        <button
          type="button"
          onClick={onCancel}
          className="rounded-md px-3 py-1.5 text-xs font-medium text-[rgb(var(--ec-page-text-muted))] hover:bg-[rgb(var(--ec-content-hover))]!"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={!title.trim()}
          className="rounded-md bg-[rgb(var(--ec-button-bg))] px-3 py-1.5 text-xs font-semibold text-[rgb(var(--ec-button-text))] disabled:opacity-40"
        >
          {submitLabel}
        </button>
      </div>
    </form>
  );
}

/** One hotspot as it reads: what, then why */
function HotspotItem({ hotspot }: { hotspot: Hotspot }) {
  return (
    <div>
      <p className="text-[15px] font-semibold leading-snug text-[rgb(var(--ec-page-text))]">
        {hotspot.title}
      </p>
      {hotspot.description && (
        <p className="mt-1.5 whitespace-pre-wrap text-[13px] leading-relaxed text-[rgb(var(--ec-page-text-muted))]">
          {hotspot.description}
        </p>
      )}
    </div>
  );
}

/** Who flagged it, and when */
function Flagged({
  hotspot,
  className = "",
}: {
  hotspot: Hotspot;
  className?: string;
}) {
  return (
    <div
      className={`flex items-center gap-1.5 text-[11px] text-[rgb(var(--ec-page-text-muted))] ${className}`}
    >
      {hotspot.author.agent && (
        <AgentMark name={hotspot.author.name} size={12} />
      )}
      <span className="min-w-0 truncate">
        Flagged by {hotspot.author.name} · {timeAgo(hotspot.createdAt)}
      </span>
    </div>
  );
}

function IconButton({
  label,
  onClick,
  children,
}: {
  label: string;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      onClick={onClick}
      className="rounded p-1 text-[rgb(var(--ec-icon-color))] hover:bg-[rgb(var(--ec-page-border)/0.5)] hover:text-[rgb(var(--ec-icon-hover))]"
    >
      {children}
    </button>
  );
}

/** A hotspot's header: its severity, in its colour (faint behind it), with what can be done to it */
function SeverityHeader({
  severity,
  actions,
  className = "",
}: {
  severity: HotspotSeverity;
  actions?: ReactNode;
  className?: string;
}) {
  const { label, color } = SEVERITIES[severity];
  return (
    <div
      className={`flex items-center gap-2 border-b px-3 py-2.5 ${className}`}
      // (its colour, faint: the colours are hex)
      style={{ background: `${color}14`, borderColor: `${color}33` }}
    >
      <span
        className="flex h-6 w-6 flex-none items-center justify-center rounded-full text-white"
        style={{ background: color }}
      >
        <SeverityIcon severity={severity} size={13} />
      </span>
      <span className="text-xs font-semibold" style={{ color }}>
        {label}
      </span>
      {actions && (
        <span className="ml-auto flex items-center gap-0.5">{actions}</span>
      )}
    </div>
  );
}

/**
 * The hotspots at a marker, opened: read, changed or removed (or, inside a node on L1 and L2, gone to). Each is
 * headed by its severity, in its colour, with its actions, then what and why, and who flagged it; several are
 * stacked under how many there are
 */
function SpotPanel({
  spot,
  locked,
  onClose,
  onUpdate,
  onDelete,
  onGo,
}: {
  spot: HotspotSpot;
  locked: boolean;
  onClose: () => void;
  onUpdate: (id: string, fields: HotspotFields) => void;
  onDelete: (id: string) => void;
  onGo: (hotspot: Hotspot) => void;
}) {
  const [editing, setEditingId] = useState<string | null>(null);
  // The severity picked in the form while one's being changed (its header shows it, before it's saved)
  const [picked, setPicked] = useState<HotspotSeverity | null>(null);
  const setEditing = (id: string | null) => {
    setEditingId(id);
    setPicked(null);
  };
  const sorted = [...spot.hotspots].sort(bySeverity);
  const single = sorted.length === 1 && !spot.inside;
  const close = (
    <IconButton label="Close" onClick={onClose}>
      <X size={14} />
    </IconButton>
  );
  const severityOf = (hotspot: Hotspot) =>
    (editing === hotspot.id && picked) || hotspot.severity;

  /** One hotspot: its header (with the panel's close, when it's the only one), then it, or the form changing it */
  const section = (hotspot: Hotspot, first: boolean) => {
    const changing = editing === hotspot.id;
    const actions = (
      <>
        {!locked && !spot.inside && !changing && (
          <>
            <IconButton label="Edit" onClick={() => setEditing(hotspot.id)}>
              <Pencil size={13} />
            </IconButton>
            <IconButton label="Remove" onClick={() => onDelete(hotspot.id)}>
              <Trash2 size={13} />
            </IconButton>
          </>
        )}
        {single && close}
      </>
    );
    const body = changing ? (
      <HotspotForm
        initial={hotspot}
        submitLabel="Save"
        onSeverityChange={setPicked}
        onCancel={() => setEditing(null)}
        onSubmit={(fields) => {
          onUpdate(hotspot.id, fields);
          setEditing(null);
        }}
      />
    ) : (
      <>
        <div className="px-4 pb-3.5 pt-3">
          <HotspotItem hotspot={hotspot} />
        </div>
        <Flagged
          hotspot={hotspot}
          className="border-t border-[rgb(var(--ec-page-border))] bg-[rgb(var(--ec-page-text)/0.02)] px-4 py-2.5"
        />
      </>
    );
    return (
      <HotspotSection
        key={hotspot.id}
        header={
          <SeverityHeader
            severity={severityOf(hotspot)}
            actions={actions}
            className={single && first ? "rounded-t-[11px]" : ""}
          />
        }
        // Inside a node on L1 or L2: goes to it on L3, where it is
        onGo={spot.inside ? () => onGo(hotspot) : undefined}
      >
        {body}
      </HotspotSection>
    );
  };

  return (
    <div className={panelClass}>
      <PanelArrow
        tint={single ? SEVERITIES[severityOf(sorted[0])].color : undefined}
      />
      {!single && (
        <div className="flex items-center justify-between border-b border-[rgb(var(--ec-page-border))] px-3 py-2.5">
          <span className="text-xs font-semibold">
            {sorted.length} hotspot{sorted.length === 1 ? "" : "s"}
          </span>
          {close}
        </div>
      )}
      <div
        className={`max-h-[min(70vh,640px)] divide-y divide-[rgb(var(--ec-page-border))] overflow-y-auto ${spot.inside ? "" : "rounded-b-[11px]"} ${single ? "rounded-t-[11px]" : ""}`}
      >
        {sorted.map((hotspot, index) => section(hotspot, index === 0))}
      </div>
      {spot.inside && (
        <p className="rounded-b-[11px] border-t border-[rgb(var(--ec-page-border))] px-4 py-2 text-[11px] text-[rgb(var(--ec-page-text-muted))]">
          Inside this: click one to go to it.
        </p>
      )}
    </div>
  );
}

/** A hotspot in the panel: its header and what's under it (a button that goes to it, when it's inside a node) */
function HotspotSection({
  header,
  onGo,
  children,
}: {
  header: ReactNode;
  onGo?: () => void;
  children: ReactNode;
}) {
  return onGo ? (
    <button
      type="button"
      onClick={onGo}
      className="block w-full text-left transition-colors hover:bg-[rgb(var(--ec-accent)/0.06)]"
    >
      {header}
      {children}
    </button>
  ) : (
    <div>
      {header}
      {children}
    </div>
  );
}

export const HotspotLayer = memo(function HotspotLayer({
  spots,
  openKey,
  draft,
  locked,
  movable,
  selectedIds,
  onMove,
  onDropTarget,
  onOpen,
  onCreate,
  onCancelDraft,
  onUpdate,
  onDelete,
  onGo,
  onMoveDraft,
  live,
}: {
  spots: HotspotSpot[];
  openKey: string | null;
  draft: HotspotDraft | null;
  locked: boolean;
  /** Markers can be dragged to another node, or a place (on the canvas itself, L3) */
  movable: boolean;
  /** Hotspots that are part of what's selected (after selecting everything) */
  selectedIds: ReadonlySet<string> | null;
  /** Moved: the hotspots at a marker, onto a node or to a place */
  onMove: (ids: string[], to: HotspotPlace) => void;
  /** The node a marker being dragged would go on (and its colour), to light it up; none when it's dropped */
  onDropTarget: (
    target: { nodeId: string; severity: HotspotSeverity } | null,
  ) => void;
  onOpen: (key: string | null) => void;
  onCreate: (fields: HotspotFields) => void;
  onCancelDraft: () => void;
  onUpdate: (id: string, fields: HotspotFields) => void;
  onDelete: (id: string) => void;
  onGo: (hotspot: Hotspot) => void;
  /** The hotspot being added, dragged onto a node or to a place (its form stays open, with what's written in it) */
  onMoveDraft?: (to: HotspotPlace) => void;
  /** In a live room: markers the others are dragging move here as they drag, and mine move for them */
  live?: LiveMoves;
}) {
  const layer = useRef<HTMLDivElement>(null);
  useMarkerScale(layer);
  const { screenToFlowPosition } = useReactFlow();
  const store = useStoreApi();
  // A marker being dragged follows the pointer here until it's dropped, then moves for everyone
  const [moving, setMoving] = useState<{
    key: string;
    position: XYPosition;
    over?: string;
  } | null>(null);
  // (a marker's known by its first hotspot: the others may group them differently)
  const remote = useRemoteMoves(live, "hotspot");
  const remoteAt = (spot: HotspotSpot) => {
    for (const hotspot of spot.hotspots)
      if (remote.has(hotspot.id)) return remote.get(hotspot.id);
  };
  // The node under a point on screen it can go on (not notes or text: they're written on the canvas)
  const nodeUnder = (point: XYPosition) => {
    const element = document
      .elementsFromPoint(point.x, point.y)
      .find((el) => el.closest(".react-flow__node"));
    const node = element?.closest(".react-flow__node");
    const type = [...(node?.classList ?? [])]
      .find((name) => name.startsWith("react-flow__node-"))
      ?.slice("react-flow__node-".length);
    return node && !isWrittenOnCanvas(type)
      ? (node.getAttribute("data-id") ?? undefined)
      : undefined;
  };
  const dragHandler = (spot: HotspotSpot) =>
    movable && !locked && !spot.inside
      ? (point: XYPosition, phase: "move" | "end") => {
          const position = screenToFlowPosition(point);
          const over = nodeUnder(point);
          if (phase === "move") {
            if (over !== moving?.over)
              onDropTarget(
                over
                  ? { nodeId: over, severity: topSeverity(spot.hotspots)! }
                  : null,
              );
            sendMove(live, "hotspot", spot.hotspots[0].id, position);
            return setMoving({ key: spot.key, position, over });
          }
          setMoving(null);
          onDropTarget(null);
          onMove(
            spot.hotspots.map((hotspot) => hotspot.id),
            over ? { nodeId: over, position } : { position },
          );
          // (after the drop's in the document, so the others don't see it go back in between)
          sendMove(live, "hotspot", spot.hotspots[0].id, null);
        }
      : undefined;
  // The hotspot being added, dragged: follows the pointer here until it's dropped
  // What the hotspot being added is (as picked in its form): its marker shows it as it's picked
  const [draftSeverity, setDraftSeverity] =
    useState<HotspotSeverity>("warning");
  useEffect(() => {
    if (!draft) setDraftSeverity("warning");
  }, [draft]);
  const [draftMoving, setDraftMoving] = useState<{
    position: XYPosition;
    over?: string;
  } | null>(null);
  const draftDrag: MarkerDrag | undefined =
    onMoveDraft && !locked
      ? (point, phase) => {
          const position = screenToFlowPosition(point);
          const over = nodeUnder(point);
          if (phase === "move") {
            if (over !== draftMoving?.over)
              onDropTarget(
                over ? { nodeId: over, severity: draftSeverity } : null,
              );
            return setDraftMoving({ position, over });
          }
          setDraftMoving(null);
          onDropTarget(null);
          onMoveDraft(over ? { nodeId: over, position } : { position });
        }
      : undefined;

  // Delete or Backspace deletes the open marker's hotspots (not while writing in its form), as it would what's
  // selected: opening a marker selects it instead of what was (below), and once something on the canvas is selected
  // again the key's the canvas's. Before the canvas sees it, so it doesn't also delete something there
  const openSpot = useRef<HotspotSpot | undefined>(undefined);
  openSpot.current = spots.find((spot) => spot.key === openKey);
  const deleteOpen = useRef(onDelete);
  deleteOpen.current = onDelete;
  const closeOpen = useRef(onOpen);
  closeOpen.current = onOpen;
  useEffect(() => {
    if (!openKey || locked) return;
    const onKey = (event: globalThis.KeyboardEvent) => {
      if (event.key !== "Delete" && event.key !== "Backspace") return;
      const target = event.target instanceof Element ? event.target : null;
      if (target?.closest("input, textarea, select, [contenteditable]")) return;
      const spot = openSpot.current;
      if (!spot || spot.inside) return;
      const { nodes, edges } = store.getState();
      if (
        nodes.some((node) => node.selected) ||
        edges.some((edge) => edge.selected)
      )
        return;
      event.preventDefault();
      event.stopPropagation();
      spot.hotspots.forEach((hotspot) => deleteOpen.current(hotspot.id));
      closeOpen.current(null);
    };
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, [openKey, locked, store]);
  return (
    <CanvasPortal>
      {/* Over the nodes (selected ones are raised to 1000), under comments */}
      <div
        ref={layer}
        className="absolute left-0 top-0"
        style={{ zIndex: 2000 }}
      >
        {spots.map((spot) => {
          const open = spot.key === openKey;
          const remotely = remoteAt(spot);
          const dragged =
            moving?.key === spot.key
              ? moving
              : remotely
                ? { position: remotely }
                : undefined;
          return (
            <SpotAt
              key={spot.key}
              nodeId={dragged ? undefined : spot.nodeId}
              position={dragged ? dragged.position : spot.position}
              zIndex={dragged ? 5 : open ? 3 : 1}
            >
              <Marker
                spot={spot}
                open={open}
                selected={
                  !!selectedIds &&
                  spot.hotspots.some((hotspot) => selectedIds.has(hotspot.id))
                }
                onClick={() => {
                  // Opened, it's what's selected (so Delete deletes it, not what was selected on the canvas)
                  if (!open) store.getState().unselectNodesAndEdges();
                  onOpen(open ? null : spot.key);
                }}
                onDrag={dragHandler(spot)}
              />
              {/* (kept open while I drag it, hidden while someone else does) */}
              {open && (!dragged || moving?.key === spot.key) && (
                <SpotPanel
                  spot={spot}
                  locked={locked}
                  onClose={() => onOpen(null)}
                  onUpdate={onUpdate}
                  onDelete={onDelete}
                  onGo={onGo}
                />
              )}
            </SpotAt>
          );
        })}
        {draft && (
          <SpotAt
            nodeId={draftMoving ? undefined : draft.nodeId}
            position={
              draftMoving
                ? draftMoving.position
                : draft.nodeId
                  ? undefined
                  : draft.position
            }
            zIndex={4}
          >
            <DraftMarker severity={draftSeverity} onDrag={draftDrag} />
            <div className={panelClass}>
              <PanelArrow />
              <HotspotForm
                onSeverityChange={setDraftSeverity}
                submitLabel="Add hotspot"
                onSubmit={onCreate}
                onCancel={onCancelDraft}
              />
            </div>
          </SpotAt>
        )}
      </div>
    </CanvasPortal>
  );
});

/** The marker of the hotspot being added: dragged to put it somewhere else, with its form open */
function DraftMarker({
  severity,
  onDrag,
}: {
  severity: HotspotSeverity;
  onDrag?: MarkerDrag;
}) {
  const handlers = useMarkerDrag(() => {}, onDrag);
  return (
    <span
      {...handlers}
      title={onDrag ? "Drag to move it" : undefined}
      className={`studio-hotspot-marker flex h-7 w-7 items-center justify-center rounded-full text-white ${onDrag ? "cursor-grab active:cursor-grabbing" : ""}`}
      style={{ background: SEVERITIES[severity].color, touchAction: "none" }}
    >
      <SeverityIcon severity={severity} />
    </span>
  );
}

/** All of them, most important first, for the panel at the bottom left: clicking one goes to it (and opens it) */
export function HotspotList({
  hotspots,
  nameOf,
  onOpen,
  goOnHover = true,
}: {
  hotspots: Hotspot[];
  nameOf: (nodeId: string) => string | undefined;
  onOpen: (hotspot: Hotspot) => void;
  /** Resting the pointer on one goes to it (off while one's being added: going there would throw it away) */
  goOnHover?: boolean;
}) {
  const sorted = [...hotspots].sort(bySeverity);
  if (!sorted.length)
    return (
      <p className="px-4 py-6 text-center text-xs leading-relaxed text-[rgb(var(--ec-page-text-muted))]">
        No hotspots yet. Press A, or right-click a node, to flag what people
        should know: a risk, a problem, or the key part.
      </p>
    );
  // One row each, as the chat lists the hotspots it flagged: its severity's icon, its title (and what it's on)
  return (
    <ul className="divide-y divide-[rgb(var(--ec-page-border))]">
      {sorted.map((hotspot) => (
        <HotspotRow
          key={hotspot.id}
          hotspot={hotspot}
          on={hotspot.nodeId && nameOf(hotspot.nodeId)}
          onOpen={onOpen}
          goOnHover={goOnHover}
        />
      ))}
    </ul>
  );
}

/** How long the pointer rests on a row before it goes there (so moving across the list doesn't), as the chat's */
const GO_ON_HOVER_MS = 250;

/** A hotspot in the list: clicking it, or resting the pointer on it, goes to it (and opens it) */
function HotspotRow({
  hotspot,
  on,
  onOpen,
  goOnHover,
}: {
  hotspot: Hotspot;
  on?: string | false;
  onOpen: (hotspot: Hotspot) => void;
  goOnHover: boolean;
}) {
  const hover = useRef<ReturnType<typeof setTimeout> | null>(null);
  const cancel = () => {
    if (hover.current !== null) clearTimeout(hover.current);
    hover.current = null;
  };
  useEffect(() => cancel, []);
  const { label, color, icon: Icon } = SEVERITIES[hotspot.severity];
  return (
    <li>
      <button
        type="button"
        onClick={() => {
          cancel();
          onOpen(hotspot);
        }}
        onMouseEnter={() => {
          cancel();
          if (goOnHover)
            hover.current = setTimeout(() => onOpen(hotspot), GO_ON_HOVER_MS);
        }}
        onMouseLeave={cancel}
        title="Show me on the canvas"
        className="flex w-full cursor-pointer items-center gap-2.5 px-3 py-2 text-left text-xs text-[rgb(var(--ec-page-text))] transition-colors hover:bg-[rgb(var(--ec-accent)/0.06)]"
      >
        <Icon
          size={14}
          className="flex-none"
          style={{ color }}
          aria-label={label}
        />
        <span className="min-w-0 flex-1">
          <span className="block">{hotspot.title}</span>
          {on && (
            <span className="mt-0.5 block truncate text-[11px] text-[rgb(var(--ec-page-text-muted))]">
              On {on}
            </span>
          )}
        </span>
        <LocateFixed
          size={12}
          className="flex-none text-[rgb(var(--ec-icon-color))]"
          aria-hidden
        />
      </button>
    </li>
  );
}
