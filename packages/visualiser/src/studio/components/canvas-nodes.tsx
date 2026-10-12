import {
  createContext,
  memo,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
} from "react";
import {
  Handle,
  NodeResizeControl,
  NodeResizer,
  Position,
  ResizeControlVariant,
  useReactFlow,
  useStoreApi,
  type NodeProps,
  type NodeTypes,
} from "@xyflow/react";
import { ENTITY_SOURCE_HANDLE } from "../entity-handles";
import {
  diagramNodeComponents,
  DomainCardNode,
  EntityNode,
  memoNode,
  SystemGroupNode,
} from "../../index";
import { TeamNode } from "./TeamNode";
import type { Editing } from "../presence";
import { GROUP_PADDING } from "../grouping";
import { getNodeName, getNoteLevel, GROUP_TYPES } from "../node-types";

/** How the canvas draws each kind of node: the visualiser's nodes, notes and text written on the canvas, and resizable containers */

export type UpdateNodeData = (
  id: string,
  updater: (data: Record<string, unknown>) => Record<string, unknown>,
) => void;

// Notes are edited in place, so their callbacks need to reach the shared design
export const UpdateNodeDataContext = createContext<UpdateNodeData>(() => {});

// What's being written on a note or text as it's typed (a live session shows it to the others), and done (null)
/** Tells a live room what's being changed on a note or text as it changes (nothing: done) */
export const EditingContext = createContext<(editing: Editing | null) => void>(
  () => {},
);

// Which container something dragged would drop into, to highlight it
export const DropTargetContext = createContext<string | null>(null);

// Text just put on the canvas with the text tool: written straight away
export const StartWritingContext = createContext<string | null>(null);

// The canvas locked: looked at, not changed (nothing written, scaled, turned or resized)
export const LockedContext = createContext(false);

const SystemGroupComponent: NodeTypes[string] = SystemGroupNode;

/** The handles that set a node's width, on either side (its height follows what's written in it) */
function WidthHandles() {
  return (
    <>
      {/* Horizontal only: otherwise React Flow saves the height too, and it stops growing with what's written */}
      <NodeResizeControl
        position="left"
        variant={ResizeControlVariant.Line}
        resizeDirection="horizontal"
        minWidth={80}
        className="studio-width-handle"
      />
      <NodeResizeControl
        position="right"
        variant={ResizeControlVariant.Line}
        resizeDirection="horizontal"
        minWidth={80}
        className="studio-width-handle"
      />
    </>
  );
}

/**
 * What's written on a note or text, and writing it: Enter starts a new line, Escape or ⌘/Ctrl + Enter (or clicking
 * away) finishes, and it's saved for everyone then
 */
function Writing({
  id,
  text,
  editing,
  onDone,
  placeholder,
  className,
  style,
  growWidth = false,
}: {
  id: string;
  text: string;
  editing: boolean;
  /** Writing it is done, with what's written */
  onDone: (text: string) => void;
  placeholder: string;
  className: string;
  /** e.g. its font size, for text scaled on the canvas */
  style?: CSSProperties;
  /** The box is as wide as what's written, lines only breaking where they're broken (text, as Excalidraw's) */
  growWidth?: boolean;
}) {
  const updateNodeData = useContext(UpdateNodeDataContext);
  const liveEdit = useContext(EditingContext);
  // Focused once it's shown: React Flow keeps a new node hidden until it's measured, and hidden fields can't take focus
  const areaRef = useRef<HTMLTextAreaElement | null>(null);
  useEffect(() => {
    if (!editing) return;
    let frame = 0;
    let tries = 0;
    const focus = () => {
      const area = areaRef.current;
      if (!area || document.activeElement === area) return;
      // Without scrolling: the browser would scroll the canvas to it, moving everything on it
      area.focus({ preventScroll: true });
      if (document.activeElement !== area && ++tries < 30)
        frame = requestAnimationFrame(focus);
    };
    focus();
    return () => cancelAnimationFrame(frame);
  }, [editing]);
  // The box grows with what's written (the node's height follows it)
  const fit = (area: HTMLTextAreaElement) => {
    if (growWidth) {
      area.style.width = "0";
      area.style.width = `${area.scrollWidth + 2}px`;
    }
    area.style.height = "auto";
    area.style.height = `${area.scrollHeight}px`;
  };
  if (!editing)
    return (
      <p className={className} style={style}>
        {text ||
          (placeholder && <span className="opacity-50">{placeholder}</span>)}
      </p>
    );
  return (
    <textarea
      ref={(area) => {
        areaRef.current = area;
        if (area) fit(area);
      }}
      defaultValue={text}
      placeholder={placeholder}
      wrap={growWidth ? "off" : undefined}
      onFocus={(event) => event.currentTarget.select()}
      onInput={(event) => {
        fit(event.currentTarget);
        liveEdit({ id, text: event.currentTarget.value });
      }}
      onBlur={(event) => {
        const value = event.currentTarget.value;
        onDone(value);
        if (value !== text)
          updateNodeData(id, (current) => ({ ...current, text: value }));
        // Done (after what's written is saved, so the others don't see it go back in between)
        liveEdit(null);
      }}
      onKeyDown={(event) => {
        if (
          event.key === "Escape" ||
          (event.key === "Enter" && (event.metaKey || event.ctrlKey))
        )
          event.currentTarget.blur();
      }}
      className={`nodrag nopan nowheel block w-full resize-none overflow-hidden bg-transparent outline-none ${className}`}
      style={style}
    />
  );
}

/** A sticky note's colours: soft paper colours, readable in light and dark themes (the names are the visualiser's) */
const NOTE_COLORS: Record<string, { fill: string; border: string }> = {
  yellow: { fill: "#fef9c3", border: "#fde047" },
  blue: { fill: "#dbeafe", border: "#93c5fd" },
  green: { fill: "#dcfce7", border: "#86efac" },
  pink: { fill: "#fce7f3", border: "#f9a8d4" },
  purple: { fill: "#ede9fe", border: "#c4b5fd" },
  gray: { fill: "#f3f4f6", border: "#d1d5db" },
};

/**
 * A sticky note: a few lines on paper, about as wide as a card and as tall as what's on it. Double click it to
 * write; when it's selected, its colour can be changed and its width set.
 */
const StickyNote = memo(function StickyNote({ id, data, selected }: NodeProps) {
  const updateNodeData = useContext(UpdateNodeDataContext);
  // A note just put on the canvas is written on straight away
  const [editing, setEditing] = useState(
    useContext(StartWritingContext) === id,
  );
  const locked = useContext(LockedContext);
  const colorName =
    typeof data.color === "string" && NOTE_COLORS[data.color]
      ? data.color
      : "yellow";
  const color = NOTE_COLORS[colorName];
  return (
    <div
      className="studio-note"
      style={{ background: color.fill, borderColor: color.border }}
      onDoubleClick={() => !locked && setEditing(true)}
    >
      {selected && !editing && !locked && (
        <>
          <WidthHandles />
          <div
            className="nodrag nopan studio-note-colors"
            role="radiogroup"
            aria-label="Note colour"
          >
            {Object.entries(NOTE_COLORS).map(([name, { fill, border }]) => (
              <button
                key={name}
                role="radio"
                aria-checked={name === colorName}
                title={name.charAt(0).toUpperCase() + name.slice(1)}
                onClick={() =>
                  updateNodeData(id, (current) => ({ ...current, color: name }))
                }
                className="studio-note-color"
                style={{
                  background: fill,
                  borderColor:
                    name === colorName ? "rgb(var(--ec-page-text))" : border,
                }}
              />
            ))}
          </div>
        </>
      )}
      <Writing
        id={id}
        text={String(data.text ?? "")}
        editing={editing}
        onDone={() => setEditing(false)}
        placeholder=""
        className="studio-note-body"
      />
      {/* The level it's on (it's only shown there), and when it was written */}
      <span className="studio-note-level">
        L{getNoteLevel({ type: "note", data })} note
      </span>
      {typeof data.createdAt === "number" && (
        <span className="studio-note-date">
          {new Date(data.createdAt).toLocaleDateString(undefined, {
            day: "numeric",
            month: "short",
          })}
        </span>
      )}
    </div>
  );
});

/**
 * Text written straight on the canvas (titles, labels, notes to self), as Excalidraw's: as big as what's written,
 * in a box with corners to scale it (its font grows with it) and a handle above to turn it. Double click it to write.
 */
/** Text's size when it's first written */
export const TEXT_FONT_SIZE = 22;
const clampFont = (size: number) =>
  Math.round(Math.min(160, Math.max(10, size)));
/** Turned to between -180 and 180 degrees */
const normaliseAngle = (angle: number) =>
  Math.round(((((angle + 180) % 360) + 360) % 360) - 180);
const TEXT_CORNERS = [
  "top-left",
  "top-right",
  "bottom-left",
  "bottom-right",
] as const;

/** Follows the pointer until it's let go (for handles that aren't React Flow's) */
const followPointer = (
  onMove: (event: PointerEvent) => void,
  onEnd: () => void,
) => {
  const end = () => {
    window.removeEventListener("pointermove", onMove);
    window.removeEventListener("pointerup", end);
    window.removeEventListener("pointercancel", end);
    onEnd();
  };
  window.addEventListener("pointermove", onMove);
  window.addEventListener("pointerup", end);
  window.addEventListener("pointercancel", end);
};

const TextNode = memo(function TextNode({ id, data, selected }: NodeProps) {
  const [editing, setEditing] = useState(
    useContext(StartWritingContext) === id,
  );
  const { deleteElements } = useReactFlow();
  const updateNodeData = useContext(UpdateNodeDataContext);
  const liveEdit = useContext(EditingContext);
  const boxRef = useRef<HTMLDivElement>(null);
  // Scaled and turned live while a handle is dragged, saved when it's let go
  const savedFont =
    typeof data.fontSize === "number" ? data.fontSize : TEXT_FONT_SIZE;
  const savedAngle = typeof data.angle === "number" ? data.angle : 0;
  const [scaling, setScaling] = useState<number | null>(null);
  const [turning, setTurning] = useState<number | null>(null);
  const fontSize = scaling ?? savedFont;
  const angle = turning ?? savedAngle;

  // A corner scales it by how far it's dragged from the opposite corner
  const startScaling =
    (corner: (typeof TEXT_CORNERS)[number]) => (event: React.PointerEvent) => {
      event.stopPropagation();
      event.preventDefault();
      const rect = boxRef.current!.getBoundingClientRect();
      const anchor = {
        x: corner.endsWith("left") ? rect.right : rect.left,
        y: corner.startsWith("top") ? rect.bottom : rect.top,
      };
      const from = Math.max(
        Math.hypot(event.clientX - anchor.x, event.clientY - anchor.y),
        1,
      );
      let next = savedFont;
      followPointer(
        (move) => {
          const size = clampFont(
            (savedFont *
              Math.hypot(move.clientX - anchor.x, move.clientY - anchor.y)) /
              from,
          );
          if (size === next) return;
          setScaling((next = size));
          liveEdit({ id, fontSize: size });
        },
        () => {
          setScaling(null);
          if (next !== savedFont)
            updateNodeData(id, (current) => ({ ...current, fontSize: next }));
          // (after it's saved, so the others don't see it go back in between)
          liveEdit(null);
        },
      );
    };
  // The handle above turns it about its middle (in steps of 15° with Shift held)
  const startTurning = (event: React.PointerEvent) => {
    event.stopPropagation();
    event.preventDefault();
    const rect = boxRef.current!.getBoundingClientRect();
    const centre = {
      x: rect.left + rect.width / 2,
      y: rect.top + rect.height / 2,
    };
    let next = savedAngle;
    followPointer(
      (move) => {
        const turned =
          (Math.atan2(move.clientY - centre.y, move.clientX - centre.x) * 180) /
            Math.PI +
          90;
        const to = normaliseAngle(
          move.shiftKey ? Math.round(turned / 15) * 15 : turned,
        );
        if (to === next) return;
        setTurning((next = to));
        liveEdit({ id, angle: to });
      },
      () => {
        setTurning(null);
        if (next !== savedAngle)
          updateNodeData(id, (current) => ({ ...current, angle: next }));
        liveEdit(null);
      },
    );
  };

  // Text left empty goes, as Excalidraw's does
  const done = (text: string) => {
    setEditing(false);
    if (!text.trim()) void deleteElements({ nodes: [{ id }] });
  };
  const locked = useContext(LockedContext);
  const framed =
    (selected || scaling !== null || turning !== null) && !editing && !locked;
  return (
    <div
      ref={boxRef}
      className={`studio-text ${framed ? "is-framed" : ""}`}
      style={angle ? { transform: `rotate(${angle}deg)` } : undefined}
      onDoubleClick={() => !locked && setEditing(true)}
    >
      {framed && (
        <>
          {TEXT_CORNERS.map((corner) => (
            <span
              key={corner}
              className={`nodrag nopan studio-text-corner is-${corner}`}
              onPointerDown={startScaling(corner)}
            />
          ))}
          <span
            className="nodrag nopan studio-text-turn"
            title="Rotate (Shift: 15° steps)"
            onPointerDown={startTurning}
          />
        </>
      )}
      <Writing
        id={id}
        text={String(data.text ?? "")}
        editing={editing}
        onDone={done}
        placeholder={editing ? "" : "Double-click to write"}
        className="studio-text-body"
        style={{ fontSize }}
        growWidth
      />
    </div>
  );
});

/** A domain inside another one is a subdomain (badged as one, like the visualiser), unless its data says otherwise */
const useDomainData = ({
  type,
  data,
  parentId,
}: Pick<NodeProps, "type" | "data" | "parentId">) =>
  useMemo(() => {
    const isDomain = type === GROUP_TYPES.domain || type === "context-domain";
    return isDomain && parentId && data.subdomain === undefined
      ? { ...data, subdomain: true }
      : data;
  }, [type, data, parentId]);

/**
 * An entity as the visualiser draws EventCatalog's (its properties listed). The canvas keeps an entity's fields in
 * data.entity, as it keeps every resource's; the visualiser reads a catalog entry (data.entity.data)
 */
const EntityCard = memo(function EntityCard(props: NodeProps) {
  const data = useMemo(
    () => ({ ...props.data, entity: { data: props.data.entity ?? {} } }),
    [props.data],
  );
  return (
    <>
      <EntityNode {...props} data={data} />
      {/* From the entity as a whole (its header): the visualiser's only start at a property's row */}
      <Handle
        type="source"
        position={Position.Right}
        id={ENTITY_SOURCE_HANDLE}
        className="studio-entity-source"
      />
    </>
  );
});

/** A domain card, badged as a subdomain when it's in another domain */
const DomainCard = memo(function DomainCard(props: NodeProps) {
  return <DomainCardNode {...props} data={useDomainData(props)} />;
});

/**
 * A domain or system as a container: resizable when selected, highlighted when something's dragged over it.
 * Like frames in design tools, it's moved and selected by its header, and dragging inside it draws a selection
 * box (its body lets the pointer through to the canvas: see studio.css).
 */
const GroupNode = memo(function GroupNode(props: NodeProps) {
  const isDropTarget = useContext(DropTargetContext) === props.id;
  const locked = useContext(LockedContext);
  const data = useDomainData(props);
  const store = useStoreApi();
  // Where what's inside has to stay (with room around it and for the header), in the container's parent's
  // coordinates: found when a resize starts, so it can't be resized smaller than what's in it
  const contents = useRef<{
    left: number;
    top: number;
    right: number;
    bottom: number;
  } | null>(null);
  const onResizeStart = useCallback(() => {
    const { nodeLookup } = store.getState();
    const container = nodeLookup.get(props.id);
    const children = [...nodeLookup.values()].filter(
      (node) => node.parentId === props.id,
    );
    if (!container || children.length === 0) {
      contents.current = null;
      return;
    }
    const { x, y } = container.position;
    const size = (node: (typeof children)[number]) => ({
      width: node.measured.width ?? node.width ?? 0,
      height: node.measured.height ?? node.height ?? 0,
    });
    const own = size(container);
    // A side already closer in than that (e.g. something placed in the padding) can still move out, just not in
    contents.current = {
      left: Math.max(
        x +
          Math.min(...children.map((node) => node.position.x)) -
          GROUP_PADDING.left,
        x,
      ),
      top: Math.max(
        y +
          Math.min(...children.map((node) => node.position.y)) -
          GROUP_PADDING.top,
        y,
      ),
      right: Math.min(
        x +
          Math.max(
            ...children.map((node) => node.position.x + size(node).width),
          ) +
          GROUP_PADDING.right,
        x + own.width,
      ),
      bottom: Math.min(
        y +
          Math.max(
            ...children.map((node) => node.position.y + size(node).height),
          ) +
          GROUP_PADDING.bottom,
        y + own.height,
      ),
    };
  }, [store, props.id]);
  const shouldResize = useCallback(
    (
      _: unknown,
      {
        x,
        y,
        width,
        height,
      }: { x: number; y: number; width: number; height: number },
    ) => {
      const bounds = contents.current;
      return (
        !bounds ||
        (x <= bounds.left &&
          y <= bounds.top &&
          x + width >= bounds.right &&
          y + height >= bounds.bottom)
      );
    },
    [],
  );
  return (
    <div style={{ width: "100%", height: "100%", position: "relative" }}>
      <NodeResizer
        isVisible={props.selected && !locked}
        onResizeStart={onResizeStart}
        shouldResize={shouldResize}
        minWidth={240}
        minHeight={160}
        lineClassName="!border-[rgb(var(--ec-accent))]"
        handleClassName="!h-2.5 !w-2.5 !rounded-sm !border-2 !bg-[rgb(var(--ec-card-bg))] !border-[rgb(var(--ec-accent))]"
      />
      <SystemGroupComponent {...props} data={data} />
      {/* The header (and the badge on its border) */}
      <div className="ec-group-grip absolute inset-x-0 -top-3 h-[60px] cursor-grab" />
      {isDropTarget ? (
        // What's dragged over it goes in it when it's dropped
        <div className="ec-drop-target">
          <span className="ec-drop-target-label">
            Drop to add to{" "}
            {getNodeName(props.type, props.data, "this container")}
          </span>
        </div>
      ) : (
        props.selected && <div className="ec-group-selected" />
      )}
    </div>
  );
});

const components: NodeTypes = {
  // Everything the visualiser draws, drawn the same (so a diagram's levels look as they do there). It types its
  // components' props as nodes (Node<Data>) rather than React Flow's NodeProps, which they're rendered with.
  ...(diagramNodeComponents as unknown as NodeTypes),
  // Written on the canvas
  note: StickyNote,
  text: TextNode,
  // Actors look like the visualiser's actors on its architecture diagrams
  actor: diagramNodeComponents["context-actor"] as NodeTypes[string],
  "context-domain": DomainCard,
  // The domain model, and who owns what
  entity: EntityCard,
  team: TeamNode,
  // Domains and systems as containers
  [GROUP_TYPES.domain]: GroupNode,
  [GROUP_TYPES.system]: GroupNode,
};

// React Flow gives every node its position, which changes on every frame it moves (dragged, in a dragged container,
// or gliding to a layout): like the visualiser's, nodes render again only when something else changes
export const nodeTypes: NodeTypes = Object.fromEntries(
  Object.entries(components).map(([type, component]) => [
    type,
    memoNode(component),
  ]),
);
