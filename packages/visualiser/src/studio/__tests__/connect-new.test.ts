import { describe, expect, it } from "vitest";
import {
  centreBeyond,
  filterConnectOptions,
  getConnectOptions,
  isCardType,
  linkConnection,
  newCardData,
} from "../connect-new";
import { isShownOnLevel } from "../node-types";

describe("getConnectOptions", () => {
  it("suggests what EventCatalog has a word for first, from a service", () => {
    const options = getConnectOptions("service", "target", 3);
    const firstOther = options.findIndex((option) => !option.says);
    expect(firstOther).toBeGreaterThan(0);
    expect(options.slice(firstOther).every((option) => !option.says)).toBe(
      true,
    );
    const says = Object.fromEntries(
      options.map((option) => [option.key, option.says]),
    );
    expect(says.event).toBe("publishes event");
    expect(says.command).toBe("invokes");
    expect(says.data).toBe("writes to");
  });

  it("words the connection the other way when the new node is its source", () => {
    const options = getConnectOptions("event", "source", 3);
    expect(options.find((option) => option.key === "service")?.says).toBe(
      "publishes event",
    );
  });

  it("only offers what the level shows, and never notes or text", () => {
    const options = getConnectOptions("service", "target", 2);
    expect(options.every((option) => isShownOnLevel(option.type, 2))).toBe(
      true,
    );
    expect(options.some((option) => option.key === "event")).toBe(false);
    const keys = getConnectOptions("service", "target", 3).map(
      (option) => option.key,
    );
    expect(keys).not.toContain("note");
    expect(keys).not.toContain("text");
  });

  it("makes domains and systems as cards", () => {
    const types = getConnectOptions("actor", "target", 1).map(
      (option) => option.type,
    );
    expect(types).toContain("context-domain");
    expect(types).toContain("system");
    expect(types).not.toContain("domain-group");
    expect(types).not.toContain("system-group");
  });
});

describe("filterConnectOptions", () => {
  it("matches every word typed, by name, what it is or what the connection says", () => {
    const options = getConnectOptions("service", "target", 3);
    expect(
      filterConnectOptions(options, "ev").map((option) => option.key),
    ).toContain("event");
    expect(
      filterConnectOptions(options, "writes").map((option) => option.key),
    ).toContain("data");
    expect(filterConnectOptions(options, "nothing like it")).toEqual([]);
    expect(filterConnectOptions(options, "  ")).toBe(options);
  });
});

describe("centreBeyond", () => {
  const size = { width: 200, height: 100 };
  it("puts the new node's near side where the connection was let go of", () => {
    expect(centreBeyond({ x: 0, y: 0 }, { x: 300, y: 20 }, size)).toEqual({
      x: 400,
      y: 20,
    });
    expect(centreBeyond({ x: 0, y: 0 }, { x: -300, y: 20 }, size)).toEqual({
      x: -400,
      y: 20,
    });
    expect(centreBeyond({ x: 0, y: 0 }, { x: 10, y: 300 }, size)).toEqual({
      x: 10,
      y: 350,
    });
    expect(centreBeyond({ x: 0, y: 0 }, { x: 10, y: -300 }, size)).toEqual({
      x: 10,
      y: -350,
    });
  });
});

describe("linkConnection", () => {
  it("connects from the node dragged from, or to it", () => {
    expect(
      linkConnection("new", { nodeId: "a", handleId: "h", newIs: "target" }),
    ).toEqual({
      source: "a",
      sourceHandle: "h",
      target: "new",
      targetHandle: null,
    });
    expect(
      linkConnection("new", { nodeId: "a", handleId: null, newIs: "source" }),
    ).toEqual({
      source: "new",
      sourceHandle: null,
      target: "a",
      targetHandle: null,
    });
  });
});

describe("cards", () => {
  it("knows a domain's or system's card from its container", () => {
    expect(isCardType("context-domain")).toBe(true);
    expect(isCardType("system")).toBe(true);
    expect(isCardType("domain-group")).toBe(false);
    expect(isCardType("service")).toBe(false);
  });

  it("makes a new card with the new domain or system its container would have", () => {
    expect(newCardData("context-domain")).toEqual({
      mode: "full",
      navigable: false,
      domain: { name: "New Domain", version: "0.0.1" },
    });
    expect(newCardData("system")).toMatchObject({
      system: { name: "New System" },
    });
  });
});
