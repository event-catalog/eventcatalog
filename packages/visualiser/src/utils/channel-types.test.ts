import { describe, expect, it } from "vitest";
import {
  getChannelIcon,
  getChannelLabel,
  getChannelType,
} from "./channel-types";

describe("channel types", () => {
  it.each([
    ["queue", "Queue", "ListEnd"],
    ["topic", "Topic", "RadioTower"],
    ["stream", "Stream", "Waves"],
  ])("gives a %s its label and icon", (type, label, icon) => {
    expect(getChannelLabel({ type })).toBe(label);
    expect(getChannelIcon({ type })).toBe(icon);
  });

  it("calls a channel without a type, or with one it doesn't know, a channel", () => {
    for (const type of [
      undefined,
      "pipe",
      42,
      "constructor",
      "__proto__",
      "toString",
    ]) {
      expect(getChannelType(type)).toBeUndefined();
      expect(getChannelLabel({ type })).toBe("Channel");
      expect(getChannelIcon({ type })).toBe("ArrowRightLeft");
    }
  });

  it("calls a dead letter channel one of its type, with the stop sign whatever its type", () => {
    expect(getChannelLabel({ type: "queue", isDeadLetterChannel: true })).toBe(
      "Dead Letter Queue",
    );
    expect(getChannelLabel({ isDeadLetterChannel: true })).toBe(
      "Dead Letter Channel",
    );
    expect(getChannelIcon({ type: "stream", isDeadLetterChannel: true })).toBe(
      "OctagonX",
    );
  });
});
