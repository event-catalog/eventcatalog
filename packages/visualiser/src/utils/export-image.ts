import { getViewportForBounds, type Rect, type Viewport } from "@xyflow/react";
import logoSvg from "../studio/eventcatalog-logo.svg?raw";

const MIN_IMAGE_WIDTH = 1024;
const MIN_IMAGE_HEIGHT = 768;

// Nodes render decorations outside their measured rects (type badges at
// -top-2.5, actor icons at -top-4, box shadows), so the exported image needs
// breathing room around getNodesBounds() or edge nodes get clipped.
export const EXPORT_PADDING = 40;

export function getExportImageDimensions(nodesBounds: Rect): {
  width: number;
  height: number;
  viewport: Viewport;
} {
  const paddedBounds = {
    x: nodesBounds.x - EXPORT_PADDING,
    y: nodesBounds.y - EXPORT_PADDING,
    width: nodesBounds.width + EXPORT_PADDING * 2,
    height: nodesBounds.height + EXPORT_PADDING * 2,
  };

  const width = Math.max(MIN_IMAGE_WIDTH, Math.ceil(paddedBounds.width));
  const height = Math.max(MIN_IMAGE_HEIGHT, Math.ceil(paddedBounds.height));

  const viewport = getViewportForBounds(paddedBounds, width, height, 0.5, 2, 0);

  return { width, height, viewport };
}

// html-to-image deep-clones <svg> subtrees without inlining computed styles,
// so var()-based fills (edge label pills, label text) and stylesheet rules
// (.react-flow__edge-path) resolve to nothing in the capture — labels render
// black and edges lose their color. Injecting a <style> that pins the resolved
// theme variables and mirrors the edge rules fixes the capture in both themes.

export function extractEcVarNames(cssText: string): string[] {
  return Array.from(new Set(cssText.match(/--ec-[a-z0-9-]+/g) ?? []));
}

export function buildExportCss(themeVars: Record<string, string>): string {
  const varDeclarations = Object.entries(themeVars)
    .map(([name, value]) => `${name}: ${value};`)
    .join(" ");

  return [
    // Applied to every element so the variables reach the cloned SVG subtree
    `* { ${varDeclarations} }`,
    // Mirrors .react-flow__edge-path in styles.css, which is lost in the clone
    `.react-flow__edge-path { stroke: var(--ec-edge-stroke, #6b7280); stroke-width: 1.5; fill: none; }`,
  ].join("\n");
}

function collectThemeCssVars(scope: Element): Record<string, string> {
  const names = new Set<string>();
  for (const sheet of Array.from(document.styleSheets)) {
    let rules: CSSRuleList;
    try {
      rules = sheet.cssRules;
    } catch {
      continue; // cross-origin stylesheet
    }
    for (const rule of Array.from(rules)) {
      for (const name of extractEcVarNames(rule.cssText)) {
        names.add(name);
      }
    }
  }

  const computed = window.getComputedStyle(scope);
  const vars: Record<string, string> = {};
  for (const name of names) {
    const value = computed.getPropertyValue(name).trim();
    if (value) vars[name] = value;
  }
  return vars;
}

// html-to-image deep-clones <svg> elements via cloneNode(true) and skips
// computed-style inlining for everything inside them (cloneChildren returns
// early for SVG). Styles that SVG content gets from stylesheets or var()-based
// presentation attributes are therefore lost in the capture. Inlining the
// resolved values directly onto each SVG element before capture is the only
// approach that survives the clone in every browser.
const SVG_EXPORT_STYLE_PROPERTIES = [
  "fill",
  "fill-opacity",
  "stroke",
  "stroke-width",
  "stroke-dasharray",
  "stroke-linecap",
  "stroke-linejoin",
  "opacity",
  "font-family",
  "font-size",
  "font-weight",
  "letter-spacing",
  "text-anchor",
  "dominant-baseline",
];

function inlineSvgComputedStyles(viewport: HTMLElement): () => void {
  const restores: Array<() => void> = [];
  const svgElements = viewport.querySelectorAll("svg, svg *");
  svgElements.forEach((element) => {
    if (!(element instanceof SVGElement)) return;
    const computed = window.getComputedStyle(element);
    const originalStyle = element.getAttribute("style");
    for (const property of SVG_EXPORT_STYLE_PROPERTIES) {
      const value = computed.getPropertyValue(property);
      if (value) element.style.setProperty(property, value);
    }
    restores.push(() => {
      if (originalStyle === null) {
        element.removeAttribute("style");
      } else {
        element.setAttribute("style", originalStyle);
      }
    });
  });
  return () => restores.forEach((restore) => restore());
}

// Returns a cleanup function that removes the injected styles.
export function injectExportStyles(viewport: HTMLElement): () => void {
  const styleElement = document.createElement("style");
  styleElement.textContent = buildExportCss(collectThemeCssVars(viewport));
  viewport.appendChild(styleElement);
  const restoreSvgStyles = inlineSvgComputedStyles(viewport);
  return () => {
    restoreSvgStyles();
    styleElement.remove();
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

type BrandingOptions = {
  /** Space to add around the image, in CSS pixels (e.g. for an image cropped to what's drawn) */
  padding?: number;
  /** The background around the image, when its own edges aren't background */
  background?: string;
};

async function drawBranding(
  dataUrl: string,
  pixelRatio: number,
  { padding = 0, background }: BrandingOptions,
): Promise<string> {
  const image = await loadImage(dataUrl);
  // Sized to the image, so it reads the same on a small diagram or a very wide one
  const r = Math.max(
    pixelRatio,
    Math.min(image.width / 1200, image.height / 500),
  );
  const height = 30 * r;
  const margin = 20 * r;

  const pad = padding * pixelRatio;

  // The badge goes in a strip under the image, so it never covers the diagram
  const canvas = document.createElement("canvas");
  canvas.width = image.width + pad * 2;
  canvas.height = image.height + pad * 2 + height + margin;
  const context = canvas.getContext("2d");
  if (!context) return dataUrl;
  context.drawImage(image, pad, pad);
  // The space around it in the image's background (its corner is padding,
  // never the diagram), filled in behind it
  const [red, green, blue, alpha] = context.getImageData(
    pad,
    pad + image.height - 1,
    1,
    1,
  ).data;
  context.globalCompositeOperation = "destination-over";
  context.fillStyle =
    background ?? `rgba(${red}, ${green}, ${blue}, ${alpha / 255})`;
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.globalCompositeOperation = "source-over";
  await document.fonts?.ready;

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
  const width =
    paddingX * 2 + logoSize + gap + widths.reduce((sum, w) => sum + w, 0);
  const x = canvas.width - width - margin;
  const y = image.height + pad * 2;

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

/**
 * An exported image with "Made with EventCatalog · eventcatalog.dev" in its
 * bottom right corner: a small pill with the logo, in the diagram's theme.
 * Diagrams and Studio canvases are exported with it.
 */
export async function addExportBranding(
  dataUrl: string,
  pixelRatio: number,
  options: BrandingOptions = {},
): Promise<string> {
  try {
    return await drawBranding(dataUrl, pixelRatio, options);
  } catch {
    // Exported without the badge rather than not at all
    return dataUrl;
  }
}
