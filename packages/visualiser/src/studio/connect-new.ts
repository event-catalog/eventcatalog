import type { Connection, NodeChange, XYPosition } from "@xyflow/react";
import { getEdgeLabel } from "./edges";
import type { Level } from "./levels";
import {
  componentKey,
  getNodeDefinition,
  GROUP_TYPES,
  isShownOnLevel,
  isWrittenOnCanvas,
  NODE_CATEGORIES,
  nodeDefinitions,
  type NodeCategory,
} from "./node-types";

/**
 * A connection dragged from a node and let go of on empty canvas: a placeholder is put where it was let go of, and
 * what it is is chosen from a list (as Miro's and n8n's do), so connecting something new doesn't need the palette.
 */

/** The placeholder's node type and id (only ever in this browser, never in the document) */
export const CONNECT_PLACEHOLDER = "connect-placeholder";
export const CONNECT_PLACEHOLDER_EDGE = "connect-placeholder-edge";
export const CONNECT_PLACEHOLDER_SIZE = { width: 200, height: 66 };

/** The placeholder is only in this browser, shown to React Flow: none of its changes (measured, hovered) go anywhere */
export const notPlaceholder = (change: NodeChange) =>
  change.type === "add" || change.id !== CONNECT_PLACEHOLDER;

/** The end of the connection on the node it was dragged from, and which end the new node is */
export type NewLink = {
  nodeId: string;
  handleId: string | null;
  /** The new node is the connection's target (dragged from a node's source handle), or its source */
  newIs: "source" | "target";
};

/** The connection between a new node and the node it was dragged from */
export const linkConnection = (newId: string, link: NewLink): Connection =>
  link.newIs === "target"
    ? {
        source: link.nodeId,
        sourceHandle: link.handleId,
        target: newId,
        targetHandle: null,
      }
    : {
        source: newId,
        sourceHandle: null,
        target: link.nodeId,
        targetHandle: link.handleId,
      };

export type ConnectOption = {
  /** Its key in the components list (what's added) */
  key: string;
  /** The node type it becomes (domains and systems become cards: they connect, containers hold) */
  type: string;
  label: string;
  summary?: string;
  category: NodeCategory;
  /** What the connection says (EventCatalog's wording, e.g. "publishes event"), when it has a word for it */
  says: string;
};

const DOMAIN_CARD = "context-domain";
const SYSTEM_CARD = "system";
type CardType = typeof DOMAIN_CARD | typeof SYSTEM_CARD;

/** Domains and systems added from a connection are cards: that's how they're connected on every level */
export const connectedType = (type: string) =>
  type === GROUP_TYPES.domain
    ? DOMAIN_CARD
    : type === GROUP_TYPES.system
      ? SYSTEM_CARD
      : type;

/** A domain's or system's card (the visualiser's), rather than a container */
export const isCardType = (type: string | undefined): type is CardType =>
  type === DOMAIN_CARD || type === SYSTEM_CARD;

/** A new domain or system card's data: the new domain or system its container would be, shown in full */
export const newCardData = (type: CardType): Record<string, unknown> => ({
  mode: "full",
  navigable: false,
  ...getNodeDefinition(
    type === DOMAIN_CARD ? GROUP_TYPES.domain : GROUP_TYPES.system,
  )!.createData(),
});

const categoryOrder = new Map(
  NODE_CATEGORIES.map((category, index) => [category.id, index]),
);

/**
 * What can be made at the end of a connection from a node of `fromType`: everything the level shows (not notes or
 * text, which don't connect), the ones EventCatalog has a word for first (e.g. from a service: events, commands,
 * data stores), each group in the palette's order
 */
export const getConnectOptions = (
  fromType: string | undefined,
  newIs: NewLink["newIs"],
  level: Level,
): ConnectOption[] =>
  nodeDefinitions
    .filter(
      (definition) =>
        !definition.unlisted &&
        !isWrittenOnCanvas(definition.type) &&
        isShownOnLevel(definition.type, level),
    )
    .map((definition) => {
      const type = connectedType(definition.type);
      const says =
        newIs === "target"
          ? getEdgeLabel(fromType, type)
          : getEdgeLabel(type, fromType);
      return {
        key: componentKey(definition),
        type,
        label: definition.label,
        summary: definition.summary,
        category: definition.category,
        says: says.replace(/\s+/g, " ").trim(),
      };
    })
    .sort(
      (a, b) =>
        Number(!a.says) - Number(!b.says) ||
        (categoryOrder.get(a.category) ?? 0) -
          (categoryOrder.get(b.category) ?? 0),
    );

/** The options that match what's typed (by name, what it is, or what the connection says) */
export const filterConnectOptions = (
  options: ConnectOption[],
  query: string,
) => {
  const words = query.toLowerCase().split(/\s+/).filter(Boolean);
  if (!words.length) return options;
  return options.filter((option) => {
    const text =
      `${option.label} ${option.summary ?? ""} ${option.says}`.toLowerCase();
    return words.every((word) => text.includes(word));
  });
};

/** How far a connection's dragged (on the canvas) before letting go of it makes something new: closer is a click */
export const CONNECT_MIN_DISTANCE = 40;
export const isAwayFrom = (from: XYPosition, to: XYPosition) =>
  Math.hypot(to.x - from.x, to.y - from.y) >= CONNECT_MIN_DISTANCE;

/**
 * Whether a point on screen is empty canvas in a canvas: not a node (containers let the pointer through their body),
 * an edge or a label counts as canvas (nodes are inside React Flow's pane too)
 */
export const isEmptyCanvasAt = (
  point: { x: number; y: number },
  canvas: Element | null | undefined,
) => {
  const under = document.elementFromPoint(point.x, point.y);
  return (
    !!under?.closest(".react-flow__pane") &&
    !under.closest(".react-flow__node") &&
    !!canvas?.contains(under)
  );
};

/**
 * Where a new node goes: its near side where the connection was let go of, out the way it was dragged (to the
 * right of a node, it starts there and grows right; above it, it ends there)
 */
export const centreBeyond = (
  from: XYPosition,
  to: XYPosition,
  size: { width: number; height: number },
): XYPosition => {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  if (Math.abs(dx) >= Math.abs(dy))
    return { x: to.x + Math.sign(dx || 1) * (size.width / 2), y: to.y };
  return { x: to.x, y: to.y + Math.sign(dy) * (size.height / 2) };
};
