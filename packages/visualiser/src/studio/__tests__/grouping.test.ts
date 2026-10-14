import { describe, it, expect } from "vitest";
import type { Node } from "@xyflow/react";
import {
  containerFor,
  findDropTarget,
  findDropTargets,
  placeDropped,
  DROP_GAP,
  findGroupAtPoint,
  fitGroup,
  getAbsolutePosition,
  sortByHierarchy,
  withDescendants,
  withParent,
  previewContainerGrowth,
} from "../grouping";

const node = (
  id: string,
  x: number,
  y: number,
  extra: Partial<Node> = {},
): Node => ({
  id,
  type: "service",
  position: { x, y },
  data: {},
  ...extra,
});

// A domain (0,0 720x460) with a system inside it (at 40,80 → 40..600, 80..440), with a service inside that
const domain = node("domain", 0, 0, {
  type: "domain-group",
  width: 720,
  height: 460,
});
const system = node("system", 40, 80, {
  type: "system-group",
  width: 560,
  height: 360,
  parentId: "domain",
});
const service = node("service", 10, 10, { parentId: "system" });
const loose = node("loose", 1000, 1000);
const nested = [domain, system, service, loose];

describe("getAbsolutePosition", () => {
  it("returns the position of a node not in a container", () => {
    expect(
      getAbsolutePosition(loose, new Map(nested.map((n) => [n.id, n]))),
    ).toEqual({ x: 1000, y: 1000 });
  });

  it("adds up the positions of the containers a node is nested in", () => {
    const outer = node("outer", 100, 50, { type: "domain-group" });
    const inner = node("inner", 40, 80, {
      type: "system-group",
      parentId: "outer",
    });
    const leaf = node("leaf", 10, 20, { parentId: "inner" });
    const lookup = new Map([outer, inner, leaf].map((n) => [n.id, n]));

    expect(getAbsolutePosition(leaf, lookup)).toEqual({ x: 150, y: 150 });
  });

  it("treats a node whose container is missing as positioned on the canvas", () => {
    const orphan = node("orphan", 5, 6, { parentId: "gone" });
    expect(getAbsolutePosition(orphan, new Map([[orphan.id, orphan]]))).toEqual(
      { x: 5, y: 6 },
    );
  });
});

describe("sortByHierarchy", () => {
  it("puts containers before what is in them", () => {
    const result = sortByHierarchy([service, system, domain, loose]);
    expect(result.map((n) => n.id)).toEqual([
      "domain",
      "loose",
      "system",
      "service",
    ]);
  });

  it("keeps the original order of nodes at the same depth", () => {
    const a = node("a", 0, 0);
    const b = node("b", 0, 0);
    const c = node("c", 0, 0);
    expect(sortByHierarchy([c, a, b]).map((n) => n.id)).toEqual([
      "c",
      "a",
      "b",
    ]);
  });
});

describe("findDropTarget", () => {
  it("returns the innermost container under the centre of the node", () => {
    // service is at 50,90 on the canvas, its centre at 170,146: inside both the domain and the system
    expect(findDropTarget("service", nested)?.id).toBe("system");
  });

  it("returns the outer container when the node is only under that one", () => {
    // Centre at 660,450: in the domain, right of the system
    const inCorner = node("n", 540, 394);
    expect(findDropTarget("n", [domain, system, inCorner])?.id).toBe("domain");
  });

  it("never returns the node itself", () => {
    // The system's centre (320,260) is in the domain, and in itself
    expect(findDropTarget("system", nested)?.id).toBe("domain");
  });

  it("never returns a container inside the node being dragged", () => {
    // The domain's centre (360,230) is inside the system, which is inside the domain
    expect(findDropTarget("domain", nested)).toBeUndefined();
  });

  it("returns nothing when no container is under the node", () => {
    expect(findDropTarget("loose", nested)).toBeUndefined();
  });

  it("returns nothing for an unknown node", () => {
    expect(findDropTarget("missing", nested)).toBeUndefined();
  });

  it("never puts sticky notes or text in a container: they go anywhere", () => {
    // Centred in the domain, as the service-sized node in the corner is
    for (const type of ["note", "text"]) {
      const written = { ...node("w", 540, 394), type };
      expect(findDropTarget("w", [domain, system, written])).toBeUndefined();
    }
  });
});

describe("findDropTargets", () => {
  const moves = (grabbed: string, dragged: string[], nodes: Node[]) =>
    findDropTargets(grabbed, dragged, nodes).map(({ id, target }) => [
      id,
      target?.id,
    ]);

  it("puts everything selected in the container the held node is dropped in", () => {
    // a is dropped in the system (centre 170,146); b and c are still outside it
    const a = node("a", 50, 90);
    const b = node("b", 900, 900);
    const c = node("c", 1200, 900);
    expect(moves("a", ["a", "b", "c"], [domain, system, a, b, c])).toEqual([
      ["a", "system"],
      ["b", "system"],
      ["c", "system"],
    ]);
  });

  it("takes everything selected out of its containers when the held node is dropped out of its own", () => {
    // a is dragged far out of the system (and the domain); inside is still in the system
    const a = node("a", 2000, 2000, { parentId: "system" });
    const inside = node("inside", 10, 10, { parentId: "system" });
    expect(moves("a", ["a", "inside"], [domain, system, a, inside])).toEqual([
      ["a", undefined],
      ["inside", undefined],
    ]);
  });

  it("leaves sticky notes and text out of the container, and what the container can't hold where it would go alone", () => {
    const a = node("a", 50, 90);
    const written = { ...node("w", 900, 900), type: "note" };
    const otherDomain = node("other", 1500, 1500, {
      type: "domain-group",
      width: 100,
      height: 100,
    });
    expect(
      moves(
        "a",
        ["a", "w", "other"],
        [domain, system, a, written, otherDomain],
      ),
    ).toEqual([["a", "system"]]);
  });

  it("moves what's in a dragged container with it, not into the target", () => {
    const box = node("box", 1000, 0, {
      type: "system-group",
      width: 200,
      height: 200,
    });
    const inBox = node("inBox", 10, 10, { parentId: "box" });
    const a = node("a", 50, 90);
    expect(
      moves("a", ["a", "box", "inBox"], [domain, system, box, inBox, a]),
    ).toEqual([
      ["a", "system"],
      ["box", "system"],
    ]);
  });

  it("follows the container the held node is in, when it's dragged with it", () => {
    // Holding a service in a dragged system: the system is what's dropped (its centre, 320,260, is in the domain)
    const free = node("free", 900, 900);
    const out = { ...system, parentId: undefined, position: { x: 40, y: 80 } };
    expect(
      moves(
        "service",
        ["system", "service", "free"],
        [domain, out, service, free],
      ),
    ).toEqual([
      ["system", "domain"],
      ["free", "domain"],
    ]);
  });

  it("drops each where it is when the held node stays in its container", () => {
    // a stays in the system; b is dropped in the domain, c on the canvas
    const a = node("a", 10, 10, { parentId: "system" });
    const b = node("b", 540, 394);
    const c = node("c", 2000, 2000, { parentId: "system" });
    expect(moves("a", ["a", "b", "c"], [domain, system, a, b, c])).toEqual([
      ["b", "domain"],
      ["c", undefined],
    ]);
  });
});

describe("placeDropped", () => {
  // A system (0,0 600x400) with a service in it (at 100,100, 240x80 as rendered)
  const box = node("box", 0, 0, {
    type: "system-group",
    width: 600,
    height: 400,
  });
  const there = node("there", 100, 100, {
    parentId: "box",
    measured: { width: 240, height: 80 },
  });
  const sized = (id: string, x: number, y: number, extra: Partial<Node> = {}) =>
    node(id, x, y, { measured: { width: 240, height: 80 }, ...extra });
  const rectsOf = (
    places: Map<string, { x: number; y: number }>,
    ids: string[],
  ) => ids.map((id) => ({ ...places.get(id)!, width: 240, height: 80 }));
  const clear = (a: { x: number; y: number }, b: { x: number; y: number }) =>
    a.x >= b.x + 240 + DROP_GAP ||
    b.x >= a.x + 240 + DROP_GAP ||
    a.y >= b.y + 80 + DROP_GAP ||
    b.y >= a.y + 80 + DROP_GAP;

  it("keeps what's dropped in free space where it was dropped", () => {
    const dropped = sized("d", 300, 260);
    const { places, nudged } = placeDropped(
      [box, there, dropped],
      [{ id: "d", target: box }],
    );
    expect(places.get("d")).toEqual({ x: 300, y: 260 });
    expect(nudged).toBe(false);
  });

  it("moves what's dropped on something in the container to the nearest free place", () => {
    const dropped = sized("d", 120, 110);
    const { places, nudged } = placeDropped(
      [box, there, dropped],
      [{ id: "d", target: box }],
    );
    const at = places.get("d")!;
    expect(nudged).toBe(true);
    expect(clear(at, there.position)).toBe(true);
    // Nearest: straight below it (80 + gap from its top), not further
    expect(at).toEqual({ x: 120, y: 100 + 80 + DROP_GAP });
  });

  it("puts a dropped selection clear of what's in the container, and of each other, inside it", () => {
    // a on the service, b beside it but hanging over the right edge, c on top of a
    const a = sized("a", 100, 100);
    const b = sized("b", 400, 100);
    const c = sized("c", 110, 110);
    const { places } = placeDropped(
      [box, there, a, b, c],
      ["a", "b", "c"].map((id) => ({ id, target: box })),
    );
    const rects = rectsOf(places, ["a", "b", "c"]);
    for (const [i, rect] of rects.entries()) {
      expect(clear(rect, there.position)).toBe(true);
      rects
        .slice(i + 1)
        .forEach((other) => expect(clear(rect, other)).toBe(true));
    }
  });

  it("pulls in what's dropped hanging over the edge, rather than growing the container", () => {
    // Its middle is in the box, its right side 80 past the padding
    const dropped = sized("d", 400, 260);
    const { places, nudged } = placeDropped(
      [box, dropped],
      [{ id: "d", target: box }],
    );
    expect(places.get("d")).toEqual({ x: 600 - 40 - 240, y: 260 });
    expect(nudged).toBe(true);
  });

  it("brings in something selected that was dropped far outside the container", () => {
    const far = sized("far", 2000, 2000);
    const at = placeDropped(
      [box, there, far],
      [{ id: "far", target: box }],
    ).places.get("far")!;
    expect(at.x + 240).toBeLessThanOrEqual(600 - 40);
    expect(at.y + 80).toBeLessThanOrEqual(400 - 40);
    expect(clear(at, there.position)).toBe(true);
  });

  it("places relative to the container, from where it was on the canvas", () => {
    const inner = node("inner", 1000, 500, {
      type: "system-group",
      width: 400,
      height: 400,
    });
    const dropped = sized("d", 1100, 650);
    expect(
      placeDropped([inner, dropped], [{ id: "d", target: inner }]).places.get(
        "d",
      ),
    ).toEqual({ x: 100, y: 150 });
  });

  it("doesn't place what's taken out of a container", () => {
    const out = sized("out", 900, 900);
    expect(
      placeDropped([box, there, out], [{ id: "out", target: undefined }]).places
        .size,
    ).toBe(0);
  });

  it("goes below everything when the container is full around it", () => {
    // A 3x3 grid of services, tightly packed, and one dropped in the middle
    const grid = [0, 1, 2].flatMap((row) =>
      [0, 1, 2].map((col) =>
        sized(`g${row}${col}`, col * 250, row * 90, { parentId: "box" }),
      ),
    );
    const dropped = sized("d", 250, 90);
    const at = placeDropped(
      [box, ...grid, dropped],
      [{ id: "d", target: box }],
    ).places.get("d")!;
    expect(grid.every((cell) => clear(at, cell.position))).toBe(true);
  });
});

describe("findGroupAtPoint", () => {
  it("returns the innermost container at a point", () => {
    expect(findGroupAtPoint({ x: 100, y: 100 }, nested)?.id).toBe("system");
  });

  it("returns the outer container when the point is only in that one", () => {
    expect(findGroupAtPoint({ x: 650, y: 450 }, nested)?.id).toBe("domain");
  });

  it("returns nothing outside every container", () => {
    expect(findGroupAtPoint({ x: 2000, y: 2000 }, nested)).toBeUndefined();
  });
});

describe("containerFor", () => {
  it("returns the container asked for, wherever the point is (something added on a level goes in it)", () => {
    expect(containerFor({ x: 2000, y: 2000 }, nested, "domain")?.id).toBe(
      "domain",
    );
  });

  it("returns nothing for something asked for that is not a container", () => {
    expect(containerFor({ x: 100, y: 100 }, nested, "loose")).toBeUndefined();
  });

  it("returns the container at the point when none is asked for", () => {
    expect(containerFor({ x: 100, y: 100 }, nested)?.id).toBe("system");
  });
});

describe("withParent", () => {
  it("moves a node into a container, keeping where it is on the canvas", () => {
    const outside = node("n", 500, 500);
    const result = withParent(outside, "system", [...nested, outside]);

    expect(result.parentId).toBe("system");
    expect(result.position).toEqual({ x: 460, y: 420 });
    expect(
      getAbsolutePosition(
        result,
        new Map([...nested, result].map((n) => [n.id, n])),
      ),
    ).toEqual({ x: 500, y: 500 });
  });

  it("moves a node out of its container, keeping where it is on the canvas", () => {
    const inside = { ...service, extent: "parent" as const };
    const result = withParent(inside, undefined, nested);

    expect(result).not.toHaveProperty("parentId");
    expect(result).not.toHaveProperty("extent");
    expect(result.position).toEqual({ x: 50, y: 90 });
  });

  it("moves a node from one container to another", () => {
    const result = withParent(service, "domain", nested);
    expect(result.parentId).toBe("domain");
    expect(result.position).toEqual({ x: 50, y: 90 });
  });
});

describe("withDescendants", () => {
  it("includes everything nested inside the given nodes", () => {
    expect([...withDescendants(["domain"], nested)].sort()).toEqual([
      "domain",
      "service",
      "system",
    ]);
  });

  it("only includes what is inside the given container", () => {
    expect([...withDescendants(["system"], nested)].sort()).toEqual([
      "service",
      "system",
    ]);
  });

  it("includes just the node when nothing is inside it", () => {
    expect([...withDescendants(["loose"], nested)]).toEqual(["loose"]);
  });
});

describe("fitGroup", () => {
  const group = node("g", 0, 0, {
    type: "domain-group",
    width: 300,
    height: 200,
  });

  it("returns nothing for a container with nothing inside it", () => {
    expect(fitGroup("g", [group])).toBeUndefined();
  });

  it("returns nothing for an unknown container", () => {
    expect(fitGroup("missing", [group])).toBeUndefined();
  });

  it("grows to fit its children with padding", () => {
    // Child at 100,100, 240x112: right edge 340 + 40, bottom 212 + 40
    const child = node("c", 100, 100, { parentId: "g" });
    expect(fitGroup("g", [group, child])).toEqual({
      shift: { x: 0, y: 0 },
      width: 380,
      height: 252,
    });
  });

  it("shifts children that sit above or left of the content area (clear of the header)", () => {
    const child = node("c", 10, 20, { parentId: "g" });
    // shift x: 40 - 10, y: 80 - 20; width: 250 + 30 + 40, height: 132 + 60 + 40
    expect(fitGroup("g", [group, child])).toEqual({
      shift: { x: 30, y: 60 },
      width: 320,
      height: 232,
    });
  });

  it("never shrinks", () => {
    const big = node("g", 0, 0, {
      type: "domain-group",
      width: 1000,
      height: 900,
    });
    const child = node("c", 100, 100, { parentId: "g" });
    expect(fitGroup("g", [big, child])).toEqual({
      shift: { x: 0, y: 0 },
      width: 1000,
      height: 900,
    });
  });

  it("only fits direct children", () => {
    const child = node("c", 100, 100, { parentId: "g" });
    const other = node("o", 5000, 5000, { parentId: "elsewhere" });
    expect(fitGroup("g", [group, child, other])).toEqual({
      shift: { x: 0, y: 0 },
      width: 380,
      height: 252,
    });
  });
});

describe("previewContainerGrowth", () => {
  const box = (
    id: string,
    x: number,
    y: number,
    extra: Partial<Node> = {},
  ): Node => ({
    id,
    type: "service",
    position: { x, y },
    data: {},
    width: 200,
    height: 100,
    ...extra,
  });
  const lookup = (nodes: Node[]) =>
    new Map(nodes.map((node) => [node.id, node]));
  const start = lookup([
    box("domain", 1000, 1000, {
      type: "domain-group",
      width: 600,
      height: 400,
    }),
    box("dragged", 40, 80, { parentId: "domain" }),
    box("other", 300, 200, { parentId: "domain" }),
  ]);
  const draggedTo = (x: number, y: number) => {
    const now = new Map(start);
    now.set("dragged", { ...start.get("dragged")!, position: { x, y } });
    return previewContainerGrowth(["domain"], new Set(["dragged"]), start, now);
  };

  it("grows right and down to fit what is dragged towards those edges", () => {
    const preview = draggedTo(500, 350);
    // 500 + 200 + 40 wide, 350 + 100 + 40 tall
    expect(preview.get("domain")).toEqual({
      position: { x: 1000, y: 1000 },
      width: 740,
      height: 490,
    });
    expect(preview.get("other")).toEqual({ position: { x: 300, y: 200 } });
  });

  it("grows left and up by moving, with what else is in it moved the other way", () => {
    const preview = draggedTo(-60, 0);
    // 100 past the left padding, 80 past the header
    expect(preview.get("domain")).toEqual({
      position: { x: 900, y: 920 },
      width: 700,
      height: 480,
    });
    expect(preview.get("other")).toEqual({ position: { x: 400, y: 280 } });
    // React Flow places what's dragged
    expect(preview.has("dragged")).toBe(false);
  });

  it("goes back to its size once what is dragged is well past its edge", () => {
    const preview = draggedTo(900, 100);
    expect(preview.get("domain")).toEqual({
      position: { x: 1000, y: 1000 },
      width: 600,
      height: 400,
    });
  });
});

describe("sticky notes and containers", () => {
  const container: Node = {
    id: "d",
    type: "domain-group",
    position: { x: 0, y: 0 },
    data: {},
    width: 600,
    height: 400,
  };

  it("never finds a container for a sticky note dropped on one", () => {
    const note: Node = {
      id: "n",
      type: "note",
      position: { x: 100, y: 100 },
      data: {},
      width: 200,
    };
    expect(findDropTarget("n", [container, note])).toBeUndefined();
  });

  it("still finds one for other nodes", () => {
    const service: Node = {
      id: "s",
      type: "service",
      position: { x: 100, y: 100 },
      data: {},
    };
    expect(findDropTarget("s", [container, service])?.id).toBe("d");
  });
});
