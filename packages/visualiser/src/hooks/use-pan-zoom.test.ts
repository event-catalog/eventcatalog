import { describe, expect, it } from "vitest";
import { wheelZoomFactor } from "./use-pan-zoom";

const wheel = (deltaY: number, init: Partial<WheelEventInit> = {}) =>
  ({ deltaY, deltaMode: 0, ctrlKey: false, ...init }) as WheelEvent;

describe("wheelZoomFactor", () => {
  it("zooms in proportion to how far the wheel or trackpad moved, rather than a fixed step per event", () => {
    const small = wheelZoomFactor(wheel(-4));
    const large = wheelZoomFactor(wheel(-100));

    expect(small).toBeGreaterThan(1);
    expect(small).toBeLessThan(1.01);
    expect(large).toBeGreaterThan(1.1);
    expect(wheelZoomFactor(wheel(100))).toBeCloseTo(1 / large);
  });

  it("zooms faster for a pinch (a wheel event with ctrlKey), as React Flow does", () => {
    expect(wheelZoomFactor(wheel(-2, { ctrlKey: true }))).toBeCloseTo(
      Math.pow(2, 0.04),
    );
  });

  it("reads wheels that scroll by lines in lines", () => {
    expect(wheelZoomFactor(wheel(-3, { deltaMode: 1 }))).toBeCloseTo(
      Math.pow(2, 0.15),
    );
  });
});
