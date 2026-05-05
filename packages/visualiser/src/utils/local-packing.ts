export type Position = {
  x: number;
  y: number;
};

export type Rect = Position & {
  width: number;
  height: number;
};

export type PackableNode = {
  id: string;
  parentId?: string;
  position: Position;
  style?: {
    width?: number | string;
    height?: number | string;
  };
  measured?: {
    width?: number;
    height?: number;
  };
  width?: number;
  height?: number;
};

const toNumber = (value: unknown) => {
  if (typeof value === "number") return value;
  if (typeof value === "string") {
    const parsed = Number.parseFloat(value);
    return Number.isFinite(parsed) ? parsed : undefined;
  }
  return undefined;
};

export const getPackableNodeSize = (node: PackableNode) => ({
  width:
    toNumber(node.measured?.width) ??
    toNumber(node.width) ??
    toNumber(node.style?.width) ??
    260,
  height:
    toNumber(node.measured?.height) ??
    toNumber(node.height) ??
    toNumber(node.style?.height) ??
    140,
});

export const rectsIntersect = (a: Rect, b: Rect, gap = 0) =>
  a.x < b.x + b.width + gap &&
  a.x + a.width + gap > b.x &&
  a.y < b.y + b.height + gap &&
  a.y + a.height + gap > b.y;

const toRect = (node: PackableNode, y = node.position.y): Rect => {
  const size = getPackableNodeSize(node);
  return {
    x: node.position.x,
    y,
    width: size.width,
    height: size.height,
  };
};

export const packNodesAroundBounds = ({
  nodes,
  movableNodeIds,
  protectedBounds,
  groupNodeId,
  gap = 40,
}: {
  nodes: PackableNode[];
  movableNodeIds: Set<string>;
  protectedBounds: Rect;
  groupNodeId: string;
  gap?: number;
}) => {
  const movableNodes = nodes
    .filter((node) => movableNodeIds.has(node.id))
    .sort((a, b) => a.position.y - b.position.y);
  const movableIds = new Set(movableNodes.map((node) => node.id));
  const occupiedRects: Rect[] = [
    protectedBounds,
    ...nodes
      .filter(
        (node) =>
          !node.parentId && node.id !== groupNodeId && !movableIds.has(node.id),
      )
      .map((node) => toRect(node)),
  ];
  const plannedPositions = new Map<string, Position>();
  const groupCenterY = protectedBounds.y + protectedBounds.height / 2;

  const placeNode = (node: PackableNode) => {
    const size = getPackableNodeSize(node);
    const nodeCenterY = node.position.y + size.height / 2;
    const moveDirection = nodeCenterY >= groupCenterY ? 1 : -1;
    let y =
      moveDirection > 0
        ? Math.max(
            node.position.y,
            protectedBounds.y + protectedBounds.height + gap,
          )
        : Math.min(node.position.y, protectedBounds.y - size.height - gap);
    let attempts = 0;

    while (attempts < occupiedRects.length + 8) {
      const rect = {
        x: node.position.x,
        y,
        width: size.width,
        height: size.height,
      };
      const collision = occupiedRects.find((occupied) =>
        rectsIntersect(rect, occupied, gap),
      );
      if (!collision) {
        occupiedRects.push(rect);
        plannedPositions.set(node.id, { ...node.position, y });
        return;
      }

      y =
        moveDirection > 0
          ? collision.y + collision.height + gap
          : collision.y - size.height - gap;
      attempts += 1;
    }

    occupiedRects.push({
      x: node.position.x,
      y,
      width: size.width,
      height: size.height,
    });
    plannedPositions.set(node.id, { ...node.position, y });
  };

  const below = movableNodes.filter((node) => {
    const size = getPackableNodeSize(node);
    return node.position.y + size.height / 2 >= groupCenterY;
  });
  const belowIds = new Set(below.map((node) => node.id));
  const above = movableNodes.filter((node) => !belowIds.has(node.id)).reverse();

  below.forEach(placeNode);
  above.forEach(placeNode);

  return plannedPositions;
};
