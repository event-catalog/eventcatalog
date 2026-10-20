// @vitest-environment jsdom

import { describe, it, expect, beforeEach } from "vitest";
import {
  getMiniMapKind,
  getMiniMapNodeClassName,
  getStoredShowMinimap,
  storeShowMinimap,
  SHOW_MINIMAP_STORAGE_KEY,
} from "./minimap";

describe("minimap", () => {
  describe("getMiniMapKind", () => {
    it("colours each resource by its kind, whether the diagram names its type singular or plural", () => {
      expect(getMiniMapKind("event")).toBe("event");
      expect(getMiniMapKind("events")).toBe("event");
      expect(getMiniMapKind("commands")).toBe("command");
      expect(getMiniMapKind("queries")).toBe("query");
      expect(getMiniMapKind("services")).toBe("service");
      expect(getMiniMapKind("channels")).toBe("channel");
      expect(getMiniMapKind("data")).toBe("data");
      expect(getMiniMapKind("context-actor")).toBe("actor");
    });

    it("colours domains yellow and systems violet as cards and as containers", () => {
      expect(getMiniMapKind("domain-group")).toBe("domain");
      expect(getMiniMapKind("context-domain")).toBe("domain");
      expect(getMiniMapKind("system-group")).toBe("system");
      expect(getMiniMapKind("system")).toBe("system");
    });

    it("colours Studio's node types like the diagram's", () => {
      expect(getMiniMapKind("actor")).toBe("actor");
      expect(getMiniMapKind("agent")).toBe("agent");
      expect(getMiniMapKind("externalSystem")).toBe("external");
      expect(getMiniMapKind("note")).toBe("note");
    });

    it("falls back to a neutral colour for types it doesn't know, or nodes without a type", () => {
      expect(getMiniMapKind("something-new")).toBe("other");
      expect(getMiniMapKind(undefined)).toBe("other");
    });
  });

  describe("getMiniMapNodeClassName", () => {
    it("draws a resource card filled in its kind's colour", () => {
      expect(getMiniMapNodeClassName({ type: "events", data: {} })).toBe(
        "ec-minimap-node ec-minimap-event",
      );
    });

    it("draws domains and systems that hold other nodes as outlined containers", () => {
      expect(getMiniMapNodeClassName({ type: "domain-group", data: {} })).toBe(
        "ec-minimap-node ec-minimap-domain ec-minimap-container",
      );
      expect(getMiniMapNodeClassName({ type: "system-group", data: {} })).toBe(
        "ec-minimap-node ec-minimap-system ec-minimap-container",
      );
    });

    it("dashes the outline of an external system's container, as the diagram does", () => {
      expect(
        getMiniMapNodeClassName({
          type: "system-group",
          data: { scope: "external" },
        }),
      ).toBe(
        "ec-minimap-node ec-minimap-system ec-minimap-container ec-minimap-external",
      );
    });

    it("draws domain and system cards (with nothing inside them) filled, not outlined", () => {
      expect(
        getMiniMapNodeClassName({ type: "context-domain", data: {} }),
      ).toBe("ec-minimap-node ec-minimap-domain");
      expect(getMiniMapNodeClassName({ type: "system", data: {} })).toBe(
        "ec-minimap-node ec-minimap-system",
      );
    });

    it("draws an external system's card as a dashed outline, as its card on the diagram is", () => {
      expect(
        getMiniMapNodeClassName({
          type: "system",
          data: { system: { id: "stripe", scope: "external" } },
        }),
      ).toBe("ec-minimap-node ec-minimap-system ec-minimap-external");
    });
  });

  describe("remembering whether the minimap is shown", () => {
    beforeEach(() => localStorage.removeItem(SHOW_MINIMAP_STORAGE_KEY));

    it("hides the minimap until the person turns it on", () => {
      expect(getStoredShowMinimap()).toBe(false);
    });

    it("keeps the minimap on once it's turned on, so the next level or diagram shows it too", () => {
      storeShowMinimap(true);
      expect(getStoredShowMinimap()).toBe(true);
    });

    it("keeps the minimap off once it's turned off again", () => {
      storeShowMinimap(true);
      storeShowMinimap(false);
      expect(getStoredShowMinimap()).toBe(false);
    });
  });
});
