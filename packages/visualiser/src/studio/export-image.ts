/**
 * "Export image…": the whole canvas (and its sticky notes and text) as a PNG, as the visualiser exports a diagram
 * (its helpers in utils/export-image.ts), with "Made with EventCatalog" in its bottom right corner. Each app saves it
 * its own way (downloaded, or through the chat it's in).
 */
import { toPng } from "html-to-image";
import {
  addExportBranding,
  getExportImageDimensions,
  injectExportStyles,
} from "../utils/export-image";

const PIXEL_RATIO = 2;

const translateOf = (element: HTMLElement) => {
  const matrix = new DOMMatrix(getComputedStyle(element).transform);
  return { x: matrix.e, y: matrix.f };
};

/** What's drawn, in the diagram's coordinates: its nodes (React Flow places them with transforms) and notes */
function drawnBounds(viewport: HTMLElement) {
  const rects: { x: number; y: number; width: number; height: number }[] = [];
  viewport
    .querySelectorAll<HTMLElement>(".react-flow__node")
    .forEach((node) => {
      const { x, y } = translateOf(node);
      rects.push({ x, y, width: node.offsetWidth, height: node.offsetHeight });
    });
  viewport.querySelectorAll<HTMLElement>(".studio-note").forEach((note) => {
    rects.push({
      x: note.offsetLeft,
      y: note.offsetTop,
      width: note.offsetWidth,
      height: note.offsetHeight,
    });
  });
  if (!rects.length) return undefined;
  const left = Math.min(...rects.map((r) => r.x));
  const top = Math.min(...rects.map((r) => r.y));
  return {
    x: left,
    y: top,
    width: Math.max(...rects.map((r) => r.x + r.width)) - left,
    height: Math.max(...rects.map((r) => r.y + r.height)) - top,
  };
}

/** The canvas in `container` as a PNG (a data URL), or undefined when there's nothing on it */
export async function canvasImage(
  container: HTMLElement,
): Promise<string | undefined> {
  const viewport = container.querySelector<HTMLElement>(
    ".react-flow__viewport",
  );
  const bounds = viewport && drawnBounds(viewport);
  if (!viewport || !bounds) return undefined;
  const { width, height, viewport: view } = getExportImageDimensions(bounds);
  const removeExportStyles = injectExportStyles(viewport);
  // Without the selection outlines
  container.classList.add("ec-exporting");
  let dataUrl: string;
  try {
    dataUrl = await toPng(viewport, {
      backgroundColor: getComputedStyle(document.body).backgroundColor,
      width,
      height,
      pixelRatio: PIXEL_RATIO,
      style: {
        width: `${width}px`,
        height: `${height}px`,
        transform: `translate(${view.x}px, ${view.y}px) scale(${view.zoom})`,
      },
    });
  } finally {
    removeExportStyles();
    container.classList.remove("ec-exporting");
  }
  return addExportBranding(dataUrl, PIXEL_RATIO);
}
