import { describe, it, expect } from "vitest";
import {
  getExportImageDimensions,
  EXPORT_PADDING,
  extractEcVarNames,
  buildExportCss,
} from "./export-image";

describe("getExportImageDimensions", () => {
  it("adds padding around large graphs so edge nodes are not flush against the image border", () => {
    // Graph larger than the minimum image size
    const nodesBounds = { x: 100, y: 200, width: 3000, height: 2000 };
    const { width, height, viewport } = getExportImageDimensions(nodesBounds);

    expect(width).toBe(3000 + EXPORT_PADDING * 2);
    expect(height).toBe(2000 + EXPORT_PADDING * 2);
    expect(viewport.zoom).toBe(1);

    // The leftmost/topmost node should be rendered EXPORT_PADDING px inside
    // the image, not at 0,0 (which clips badges/icons rendered above and
    // shadows rendered around the measured node rects)
    expect(viewport.x + nodesBounds.x * viewport.zoom).toBe(EXPORT_PADDING);
    expect(viewport.y + nodesBounds.y * viewport.zoom).toBe(EXPORT_PADDING);
  });

  it("keeps the whole graph inside the image (no clipping at the far edges)", () => {
    const nodesBounds = { x: -500, y: -250, width: 4200, height: 1500 };
    const { width, height, viewport } = getExportImageDimensions(nodesBounds);

    const rightEdge =
      viewport.x + (nodesBounds.x + nodesBounds.width) * viewport.zoom;
    const bottomEdge =
      viewport.y + (nodesBounds.y + nodesBounds.height) * viewport.zoom;

    expect(rightEdge).toBeLessThanOrEqual(width - EXPORT_PADDING);
    expect(bottomEdge).toBeLessThanOrEqual(height - EXPORT_PADDING);
  });

  it("uses the minimum image size for small graphs and centers the content", () => {
    const nodesBounds = { x: 0, y: 0, width: 200, height: 100 };
    const { width, height, viewport } = getExportImageDimensions(nodesBounds);

    expect(width).toBe(1024);
    expect(height).toBe(768);
    // Zoom is clamped to 2 for small graphs (existing behaviour)
    expect(viewport.zoom).toBe(2);

    // Content is centered horizontally: distance from left edge equals
    // distance from right edge
    const left = viewport.x + nodesBounds.x * viewport.zoom;
    const right =
      width -
      (viewport.x + (nodesBounds.x + nodesBounds.width) * viewport.zoom);
    expect(left).toBeCloseTo(right, 5);
  });

  it("extracts --ec-* variable names from stylesheet text", () => {
    const css = `
      :root { --ec-card-bg: 255 255 255; --ec-page-text: 23 23 23; }
      .react-flow__edge-path { stroke: var(--ec-edge-stroke, #6b7280); }
      .other { color: red; --not-ec: 1; }
    `;
    expect(extractEcVarNames(css).sort()).toEqual([
      "--ec-card-bg",
      "--ec-edge-stroke",
      "--ec-page-text",
    ]);
  });

  it("builds export CSS that pins theme variables and edge styles", () => {
    const css = buildExportCss({
      "--ec-card-bg": "255 255 255",
      "--ec-page-text": "23 23 23",
    });

    // Variables must apply to every element so they reach the deep-cloned
    // SVG subtree (html-to-image copies SVG without inlining styles)
    expect(css).toContain("--ec-card-bg: 255 255 255;");
    expect(css).toContain("--ec-page-text: 23 23 23;");
    expect(css).toMatch(/\*\s*\{/);

    // Edge paths lose their stylesheet rule in the clone — it must be inlined
    expect(css).toContain(".react-flow__edge-path");
    expect(css).toContain("stroke:");
  });

  it("rounds image dimensions up to whole pixels", () => {
    const nodesBounds = { x: 0, y: 0, width: 3000.4, height: 2000.6 };
    const { width, height } = getExportImageDimensions(nodesBounds);

    expect(Number.isInteger(width)).toBe(true);
    expect(Number.isInteger(height)).toBe(true);
    expect(width).toBeGreaterThanOrEqual(3000.4 + EXPORT_PADDING * 2);
    expect(height).toBeGreaterThanOrEqual(2000.6 + EXPORT_PADDING * 2);
  });
});
