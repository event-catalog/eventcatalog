import { getViewportForBounds, type Rect, type Viewport } from "@xyflow/react";

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
