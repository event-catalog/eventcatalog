import { describe, expect, it } from "vitest";
import * as Y from "yjs";
import { getLock, setLock } from "../canvas-doc";

describe("locking the canvas", () => {
  it("is in the document: locked for everyone it syncs to, and by whom, until it is unlocked", () => {
    const mine = new Y.Doc();
    const theirs = new Y.Doc();
    mine.on("update", (update: Uint8Array) => Y.applyUpdate(theirs, update));
    setLock(mine, "Sam");
    expect(getLock(theirs)).toBe("Sam");
    setLock(mine, null);
    expect(getLock(theirs)).toBeNull();
  });

  it("writes nothing when it already is so", () => {
    const doc = new Y.Doc();
    let updates = 0;
    doc.on("update", () => updates++);
    setLock(doc, null);
    setLock(doc, "Sam");
    setLock(doc, "Sam");
    expect(updates).toBe(1);
  });
});
