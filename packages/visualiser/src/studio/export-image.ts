/**
 * "Export image…": the whole canvas (and its sticky notes and text) as a PNG, as the visualiser exports a diagram
 * (its helpers in utils/export-image.ts), with "Made with EventCatalog" in its bottom right corner. Each app saves it
 * its own way (downloaded, or through the chat it's in).
 */
import { toPng } from "html-to-image";
import {
  getExportImageDimensions,
  injectExportStyles,
} from "../utils/export-image";
import logoSvg from "./eventcatalog-logo.svg?raw";

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

const loadImage = (src: string) =>
  new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = reject;
    image.src = src;
  });

/** A theme colour, from EventCatalog's variables (e.g. --ec-card-bg is "255 255 255") */
const themeColor = (name: string, alpha = 1) => {
  const value =
    getComputedStyle(document.documentElement).getPropertyValue(name).trim() ||
    getComputedStyle(document.body).getPropertyValue(name).trim();
  return value
    ? `rgb(${value} / ${alpha})`
    : alpha === 1
      ? "#0f172a"
      : `rgb(15 23 42 / ${alpha})`;
};

/**
 * The image with "Made with EventCatalog" in its bottom right corner: a small pill with the logo, as the badge on
 * the diagram has it, in the diagram's theme
 */
async function withBranding(dataUrl: string): Promise<string> {
  const image = await loadImage(dataUrl);
  const canvas = document.createElement("canvas");
  canvas.width = image.width;
  canvas.height = image.height;
  const context = canvas.getContext("2d");
  if (!context) return dataUrl;
  context.drawImage(image, 0, 0);
  await document.fonts?.ready;

  // Sized to the image, so it reads the same on a small diagram or a very wide one
  const r = Math.max(
    PIXEL_RATIO,
    Math.min(canvas.width / 1200, canvas.height / 500),
  );
  const text = themeColor("--ec-page-text");
  const muted = themeColor("--ec-page-text-muted");
  const font = (weight: number) =>
    `${weight} ${12 * r}px Inter, ui-sans-serif, system-ui, sans-serif`;
  const parts = [
    { label: "Made with ", weight: 400, color: muted },
    { label: "EventCatalog", weight: 600, color: text },
    { label: "  ·  eventcatalog.dev", weight: 400, color: muted },
  ];
  const widths = parts.map((part) => {
    context.font = font(part.weight);
    return context.measureText(part.label).width;
  });
  const logoSize = 16 * r;
  const paddingX = 12 * r;
  const gap = 7 * r;
  const height = 30 * r;
  const width =
    paddingX * 2 + logoSize + gap + widths.reduce((sum, w) => sum + w, 0);
  const margin = 20 * r;
  const x = canvas.width - width - margin;
  const y = canvas.height - height - margin;

  // The pill
  context.fillStyle = themeColor("--ec-card-bg", 0.96);
  context.strokeStyle = themeColor("--ec-page-border");
  context.lineWidth = r;
  context.beginPath();
  context.roundRect(x, y, width, height, height / 2);
  context.fill();
  context.stroke();

  // The logo, in the text colour
  const logo = await loadImage(
    `data:image/svg+xml;charset=utf-8,${encodeURIComponent(logoSvg.replace(/currentColor/g, text))}`,
  );
  context.drawImage(
    logo,
    x + paddingX,
    y + (height - logoSize) / 2,
    logoSize,
    logoSize,
  );

  // Made with EventCatalog · eventcatalog.dev
  let textX = x + paddingX + logoSize + gap;
  context.textBaseline = "middle";
  parts.forEach((part, index) => {
    context.font = font(part.weight);
    context.fillStyle = part.color;
    context.fillText(part.label, textX, y + height / 2 + r);
    textX += widths[index];
  });
  return canvas.toDataURL("image/png");
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
  try {
    return await withBranding(dataUrl);
  } catch {
    // Exported without the badge rather than not at all
    return dataUrl;
  }
}
