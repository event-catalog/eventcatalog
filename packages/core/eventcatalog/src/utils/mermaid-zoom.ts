/**
 * Diagram Zoom Utility
 * Provides pan/zoom functionality for Mermaid and PlantUML diagrams with hover-revealed controls,
 * smooth (CSS transform) transitions and a fullscreen modal viewer.
 *
 * NOTE: A standalone version of this code also exists in the embed page at:
 * src/pages/diagrams/[id]/[version]/embed.astro
 *
 * The embed page uses CDN imports for isolation in iframes. If you update this file,
 * please also update the embed page to keep the zoom functionality in sync.
 */

// Store zoom instances for cleanup
const zoomInstances = new Map<string, PanZoomInstance>();
const resizeObservers = new Map<string, ResizeObserver>();

// Track registered icon pack names to avoid re-registering on subsequent renders
const registeredIconPacks = new Set<string>();

// Abort flag for cancelling in-progress renders during cleanup
let renderingAborted = false;

// Closer for the currently open fullscreen modal (only one can be open at a time)
let closeOpenModal: (() => void) | null = null;

// Mermaid renders are generation-tracked so a re-render (e.g. on theme change) supersedes in-flight ones
let mermaidRenderGeneration = 0;
let lastMermaidConfig: any;
let themeObserver: MutationObserver | null = null;

/**
 * Mermaid bakes the theme into the rendered SVG, so diagrams are re-rendered whenever the
 * `data-theme` attribute on <html> changes (light/dark toggle).
 */
function ensureThemeObserver(): void {
  if (themeObserver) return;
  themeObserver = new MutationObserver(() => {
    const graphs = document.getElementsByClassName('mermaid');
    if (graphs.length === 0) return;
    destroyZoomInstances();
    renderMermaidWithZoom(graphs, lastMermaidConfig);
  });
  themeObserver.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
}

/**
 * Destroys all zoom instances and cleans up observers
 */
export function destroyZoomInstances(): void {
  // Set abort flag to cancel any in-progress renders
  renderingAborted = true;

  zoomInstances.forEach((instance) => {
    try {
      instance.destroy();
    } catch (e) {
      // Instance may already be destroyed
    }
  });
  zoomInstances.clear();

  resizeObservers.forEach((observer) => {
    observer.disconnect();
  });
  resizeObservers.clear();

  closeOpenModal?.();
}

/**
 * Diagram control options
 */
export type ControlsPlacement = 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';

const CONTROLS_PLACEMENTS: ControlsPlacement[] = ['top-left', 'top-right', 'bottom-left', 'bottom-right'];
const DEFAULT_PLACEMENT: ControlsPlacement = 'top-right';

/** Controls are shown by default only when the diagram's natural height exceeds this value */
const CONTROLS_MIN_HEIGHT = 120;

/** Pixels moved per pan button click / arrow key */
const PAN_STEP = 60;

/** Zoom factor per zoom button click / keyboard press */
const ZOOM_STEP = 1.2;

/** Duration of animated pan/zoom transitions */
const TRANSITION_MS = 150;

/** Padding around the diagram when fitting it into its viewport */
const FIT_PADDING = 16;

const STYLE_ID = 'ec-diagram-styles';

/**
 * Styles for the diagram viewport, controls and fullscreen modal. Uses EventCatalog theme
 * variables with sensible fallbacks so the same styles work inside the isolated embed page.
 */
const DIAGRAM_STYLES = `
.mermaid-zoom-container {
  position: relative;
  width: 100%;
  overflow: hidden;
}
.ec-diagram-viewport {
  position: absolute;
  inset: 0;
  overflow: hidden;
  cursor: grab;
  touch-action: pan-y pinch-zoom;
  user-select: none;
  -webkit-user-select: none;
  outline: none;
}
.ec-diagram-viewport.is-panning {
  cursor: grabbing;
}
.ec-diagram-viewport--modal {
  touch-action: none;
  background-image: radial-gradient(rgb(var(--ec-page-text, 15 23 42) / 0.08) 1px, transparent 1px);
  background-size: 16px 16px;
}
.ec-diagram-content {
  position: absolute;
  left: 0;
  top: 0;
  transform-origin: 0 0;
  transition: transform ${TRANSITION_MS}ms ease-out;
  will-change: transform;
}
/* Element selectors bump specificity above the page's global ".mermaid svg" rules */
div.ec-diagram-content > svg {
  display: block;
  margin: 0;
  max-width: none !important;
}
.ec-diagram-btn {
  all: unset;
  box-sizing: border-box;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border-radius: 6px;
  cursor: pointer;
  background: rgb(var(--ec-card-bg, 255 255 255));
  color: rgb(var(--ec-page-text, 15 23 42));
  border: 1px solid rgb(var(--ec-page-border, 226 232 240));
  transition: background-color 0.15s, transform 0.1s;
}
.ec-diagram-btn:hover {
  background: rgb(var(--ec-content-hover, 241 245 249));
}
.ec-diagram-btn:active {
  transform: scale(0.95);
}
.ec-diagram-btn:focus-visible {
  outline: 2px solid rgb(var(--ec-accent, 59 130 246));
  outline-offset: 1px;
}
button.ec-diagram-btn svg {
  display: block;
  width: 16px;
  height: 16px;
  margin: 0;
  flex-shrink: 0;
}
.ec-diagram-btn.ec-diagram-btn--success {
  color: #10b981;
}
.ec-diagram-controls {
  position: absolute;
  z-index: 10;
  display: grid;
  grid-template-columns: repeat(3, 28px);
  gap: 4px;
  opacity: 0;
  pointer-events: none;
  transition: opacity 0.15s ease;
}
.ec-diagram-controls[data-placement="top-left"] { top: 8px; left: 8px; }
.ec-diagram-controls[data-placement="top-right"] { top: 8px; right: 8px; }
.ec-diagram-controls[data-placement="bottom-left"] { bottom: 8px; left: 8px; }
.ec-diagram-controls[data-placement="bottom-right"] { bottom: 8px; right: 8px; }
.mermaid-zoom-container:hover .ec-diagram-controls,
.mermaid-zoom-container:focus-within .ec-diagram-controls {
  opacity: 1;
  pointer-events: auto;
}
@media (pointer: coarse) {
  .ec-diagram-controls { opacity: 1; pointer-events: auto; }
}
@media print {
  .ec-diagram-controls { display: none; }
}
.ec-diagram-modal-backdrop {
  position: fixed;
  inset: 0;
  z-index: 9998;
  background: rgb(0 0 0 / 0.4);
  opacity: 0;
  transition: opacity 250ms cubic-bezier(0.22, 1, 0.36, 1);
}
.ec-diagram-modal-backdrop.is-open {
  opacity: 1;
}
.ec-diagram-modal {
  position: fixed;
  inset: 0;
  z-index: 9999;
  padding: 16px;
}
@media (min-width: 640px) {
  .ec-diagram-modal { padding: 24px; }
}
.ec-diagram-modal__dialog {
  position: relative;
  width: 100%;
  height: 100%;
  overflow: hidden;
  border-radius: 16px;
  background: rgb(var(--ec-page-bg, 255 255 255));
  box-shadow:
    0 0 0 1px rgb(var(--ec-page-border, 226 232 240)),
    0 25px 50px -12px rgb(0 0 0 / 0.25);
  transform: scale(0.96);
  opacity: 0;
  transition:
    transform 250ms cubic-bezier(0.22, 1, 0.36, 1),
    opacity 250ms cubic-bezier(0.22, 1, 0.36, 1);
}
.ec-diagram-modal.is-open .ec-diagram-modal__dialog {
  transform: none;
  opacity: 1;
}
.ec-diagram-modal.is-closing .ec-diagram-modal__dialog,
.ec-diagram-modal-backdrop.is-closing {
  transition-duration: 150ms;
}
.ec-diagram-modal__toolbar {
  position: absolute;
  left: 12px;
  top: 12px;
  z-index: 10;
  display: flex;
  align-items: center;
  gap: 4px;
}
.ec-diagram-modal__zoom {
  box-sizing: border-box;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  height: 28px;
  min-width: 56px;
  padding: 0 6px;
  border-radius: 6px;
  border: 1px solid rgb(var(--ec-page-border, 226 232 240));
  background: rgb(var(--ec-card-bg, 255 255 255));
  color: rgb(var(--ec-page-text, 15 23 42));
  font-family: inherit;
  font-size: 12px;
  line-height: 1;
  font-variant-numeric: tabular-nums;
}
.ec-diagram-modal__close {
  position: absolute;
  right: 12px;
  top: 12px;
  z-index: 10;
}
@media (prefers-reduced-motion: reduce) {
  .ec-diagram-content,
  .ec-diagram-controls,
  .ec-diagram-modal-backdrop,
  .ec-diagram-modal__dialog {
    transition: none;
  }
}
`;

/**
 * Injects the diagram stylesheet once per document
 */
function ensureDiagramStyles(): void {
  if (document.getElementById(STYLE_ID)) return;
  const style = document.createElement('style');
  style.id = STYLE_ID;
  style.textContent = DIAGRAM_STYLES;
  document.head.appendChild(style);
}

/**
 * SVG icons (Lucide-style, 24px viewBox). Stroke widths are tuned for rendering at 16px.
 */
const icon = (paths: string, strokeWidth = 2) =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="${strokeWidth}" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths}</svg>`;

const ICONS = {
  fullscreen: icon('<path d="M15 3h6v6"/><path d="M9 21H3v-6"/><path d="M21 3l-7 7"/><path d="M3 21l7-7"/>'),
  close: icon('<path d="M18 6 6 18"/><path d="m6 6 12 12"/>'),
  panUp: icon('<path d="m18 15-6-6-6 6"/>', 2.5),
  panDown: icon('<path d="m6 9 6 6 6-6"/>', 2.5),
  panLeft: icon('<path d="m15 18-6-6 6-6"/>', 2.5),
  panRight: icon('<path d="m9 18 6-6-6-6"/>', 2.5),
  zoomIn: icon('<circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/><path d="M11 8v6"/><path d="M8 11h6"/>'),
  zoomOut: icon('<circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/><path d="M8 11h6"/>'),
  reset: icon('<path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/>', 2.5),
  copy: icon(
    '<rect width="14" height="14" x="8" y="8" rx="2" ry="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/>'
  ),
  check: icon('<path d="M20 6 9 17l-5-5"/>', 2.5),
};

/**
 * Creates a single control button
 */
function createControlButton(svg: string, label: string, onClick: () => void): HTMLButtonElement {
  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = 'ec-diagram-btn';
  btn.title = label;
  btn.setAttribute('aria-label', label);
  btn.innerHTML = svg;
  btn.onclick = onClick;
  return btn;
}

/**
 * Creates a "copy diagram code" button with success feedback
 */
function createCopyButton(diagramContent: string): HTMLButtonElement {
  let copyTimeout: ReturnType<typeof setTimeout> | undefined;
  const button = createControlButton(ICONS.copy, 'Copy diagram code', () => {
    navigator.clipboard.writeText(diagramContent).catch((err) => {
      console.warn('Failed to copy diagram code:', err);
    });
    button.innerHTML = ICONS.check;
    button.classList.add('ec-diagram-btn--success');
    button.title = 'Copied!';
    if (copyTimeout) clearTimeout(copyTimeout);
    copyTimeout = setTimeout(() => {
      button.innerHTML = ICONS.copy;
      button.classList.remove('ec-diagram-btn--success');
      button.title = 'Copy diagram code';
    }, 2000);
  });
  return button;
}

/**
 * Resolves the controls placement from a raw attribute/config value
 */
export function resolvePlacement(value: string | null | undefined): ControlsPlacement {
  return CONTROLS_PLACEMENTS.includes(value as ControlsPlacement) ? (value as ControlsPlacement) : DEFAULT_PLACEMENT;
}

/**
 * Resolves the `actions` option from a raw attribute value ("true" / "false" / undefined)
 */
export function resolveActions(value: string | null | undefined): boolean | undefined {
  if (value === 'true') return true;
  if (value === 'false') return false;
  return undefined;
}

/**
 * Reads diagram control options from the `data-*` attributes of a diagram element
 */
export function getControlOptionsFromElement(element: Element): Pick<ZoomOptions, 'placement' | 'actions'> {
  return {
    placement: resolvePlacement(element.getAttribute('data-placement')),
    actions: resolveActions(element.getAttribute('data-actions')),
  };
}

/**
 * Pan/zoom engine
 *
 * Applies `translate(x, y) scale(s)` to a content element inside a viewport. Button/keyboard
 * driven changes are animated with a CSS transition; drag, wheel and pinch changes are instant.
 */
export interface PanZoomInstance {
  fit: (animate?: boolean) => void;
  zoomIn: () => void;
  zoomOut: () => void;
  panBy: (dx: number, dy: number) => void;
  getScale: () => number;
  destroy: () => void;
}

interface PanZoomOptions {
  minScale?: number;
  maxScale?: number;
  /** Zoom with the mouse wheel / trackpad. Disabled inline so the page keeps scrolling. */
  wheelZoom?: boolean;
  onChange?: (scale: number) => void;
}

export function createPanZoom(
  viewport: HTMLElement,
  content: HTMLElement,
  contentWidth: number,
  contentHeight: number,
  options: PanZoomOptions = {}
): PanZoomInstance {
  const { minScale = 0.1, maxScale = 8, wheelZoom = false, onChange } = options;

  let scale = 1;
  let x = 0;
  let y = 0;

  const clamp = (value: number) => Math.min(maxScale, Math.max(minScale, value));

  const apply = (animate: boolean) => {
    content.style.transitionDuration = animate ? `${TRANSITION_MS}ms` : '0ms';
    content.style.transform = `translate(${x}px, ${y}px) scale(${scale})`;
    onChange?.(scale);
  };

  /** Fits the diagram inside the viewport (never scaling it above 100%) and centers it */
  const fit = (animate = false) => {
    const vw = viewport.clientWidth;
    const vh = viewport.clientHeight;
    if (vw <= 0 || vh <= 0) return;
    scale = clamp(Math.min((vw - FIT_PADDING * 2) / contentWidth, (vh - FIT_PADDING * 2) / contentHeight, 1));
    x = (vw - contentWidth * scale) / 2;
    y = (vh - contentHeight * scale) / 2;
    apply(animate);
  };

  /** Zooms to `next` keeping the viewport point (ox, oy) fixed */
  const zoomTo = (next: number, ox: number, oy: number, animate: boolean) => {
    const target = clamp(next);
    const ratio = target / scale;
    x = ox - (ox - x) * ratio;
    y = oy - (oy - y) * ratio;
    scale = target;
    apply(animate);
  };

  const zoomAtCenter = (factor: number) => zoomTo(scale * factor, viewport.clientWidth / 2, viewport.clientHeight / 2, true);

  const panBy = (dx: number, dy: number) => {
    x += dx;
    y += dy;
    apply(true);
  };

  // Pointer handling (drag to pan, two-finger pinch to zoom)
  const pointers = new Map<number, { x: number; y: number }>();
  let dragStart: { px: number; py: number; x: number; y: number } | null = null;
  let pinchStart: { distance: number; scale: number } | null = null;

  const pointerDistance = () => {
    const [a, b] = Array.from(pointers.values());
    return Math.hypot(a.x - b.x, a.y - b.y);
  };

  const pointerMidpoint = () => {
    const [a, b] = Array.from(pointers.values());
    const rect = viewport.getBoundingClientRect();
    return { x: (a.x + b.x) / 2 - rect.left, y: (a.y + b.y) / 2 - rect.top };
  };

  const onPointerDown = (event: PointerEvent) => {
    if (event.pointerType === 'mouse' && event.button !== 0) return;
    if ((event.target as HTMLElement).closest('button')) return;
    viewport.setPointerCapture(event.pointerId);
    pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });

    if (pointers.size === 1) {
      dragStart = { px: event.clientX, py: event.clientY, x, y };
      viewport.classList.add('is-panning');
    } else if (pointers.size === 2) {
      dragStart = null;
      pinchStart = { distance: pointerDistance(), scale };
    }
  };

  const onPointerMove = (event: PointerEvent) => {
    if (!pointers.has(event.pointerId)) return;
    pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });

    if (pointers.size === 2 && pinchStart) {
      const mid = pointerMidpoint();
      zoomTo((pinchStart.scale * pointerDistance()) / pinchStart.distance, mid.x, mid.y, false);
    } else if (pointers.size === 1 && dragStart) {
      x = dragStart.x + (event.clientX - dragStart.px);
      y = dragStart.y + (event.clientY - dragStart.py);
      apply(false);
    }
  };

  const onPointerUp = (event: PointerEvent) => {
    if (!pointers.has(event.pointerId)) return;
    pointers.delete(event.pointerId);
    try {
      viewport.releasePointerCapture(event.pointerId);
    } catch (e) {
      // Pointer may already be released
    }

    if (pointers.size === 0) {
      dragStart = null;
      pinchStart = null;
      viewport.classList.remove('is-panning');
    } else if (pointers.size === 1) {
      const [remaining] = Array.from(pointers.values());
      pinchStart = null;
      dragStart = { px: remaining.x, py: remaining.y, x, y };
    }
  };

  const onWheel = (event: WheelEvent) => {
    if (!wheelZoom) return;
    event.preventDefault();
    const rect = viewport.getBoundingClientRect();
    const delta = event.deltaMode === 1 ? event.deltaY * 16 : event.deltaY;
    zoomTo(scale * Math.exp(-delta * 0.0015), event.clientX - rect.left, event.clientY - rect.top, false);
  };

  const onDoubleClick = (event: MouseEvent) => {
    if ((event.target as HTMLElement).closest('button')) return;
    const rect = viewport.getBoundingClientRect();
    zoomTo(scale * ZOOM_STEP * ZOOM_STEP, event.clientX - rect.left, event.clientY - rect.top, true);
  };

  viewport.addEventListener('pointerdown', onPointerDown);
  viewport.addEventListener('pointermove', onPointerMove);
  viewport.addEventListener('pointerup', onPointerUp);
  viewport.addEventListener('pointercancel', onPointerUp);
  viewport.addEventListener('wheel', onWheel, { passive: false });
  viewport.addEventListener('dblclick', onDoubleClick);

  return {
    fit,
    zoomIn: () => zoomAtCenter(ZOOM_STEP),
    zoomOut: () => zoomAtCenter(1 / ZOOM_STEP),
    panBy,
    getScale: () => scale,
    destroy: () => {
      viewport.removeEventListener('pointerdown', onPointerDown);
      viewport.removeEventListener('pointermove', onPointerMove);
      viewport.removeEventListener('pointerup', onPointerUp);
      viewport.removeEventListener('pointercancel', onPointerUp);
      viewport.removeEventListener('wheel', onWheel);
      viewport.removeEventListener('dblclick', onDoubleClick);
      pointers.clear();
    },
  };
}

/**
 * Builds the viewport + content wrapper around an SVG and sizes the SVG to its natural dimensions
 */
function createViewport(svgElement: SVGElement, width: number, height: number, modal = false) {
  const viewport = document.createElement('div');
  viewport.className = modal ? 'ec-diagram-viewport ec-diagram-viewport--modal' : 'ec-diagram-viewport';

  const content = document.createElement('div');
  content.className = 'ec-diagram-content';
  content.style.width = `${width}px`;
  content.style.height = `${height}px`;

  svgElement.setAttribute('width', String(width));
  svgElement.setAttribute('height', String(height));
  svgElement.style.width = `${width}px`;
  svgElement.style.height = `${height}px`;
  svgElement.style.maxWidth = 'none';

  content.appendChild(svgElement);
  viewport.appendChild(content);
  return { viewport, content };
}

interface DiagramSource {
  svg: SVGElement;
  width: number;
  height: number;
  diagramContent?: string;
}

/**
 * Opens the diagram in a fullscreen modal viewer with its own zoom toolbar.
 * Supports drag/wheel/pinch, arrow keys to pan, +/- to zoom, 0 to reset and Escape to close.
 */
export function openDiagramModal(source: DiagramSource): void {
  ensureDiagramStyles();
  closeOpenModal?.();

  const previouslyFocused = document.activeElement as HTMLElement | null;
  const previousBodyOverflow = document.body.style.overflow;

  const backdrop = document.createElement('div');
  backdrop.className = 'ec-diagram-modal-backdrop';

  const root = document.createElement('div');
  root.className = 'ec-diagram-modal';

  const dialog = document.createElement('div');
  dialog.className = 'ec-diagram-modal__dialog';
  dialog.setAttribute('role', 'dialog');
  dialog.setAttribute('aria-modal', 'true');
  dialog.setAttribute('aria-label', 'Diagram');

  const { viewport, content } = createViewport(source.svg.cloneNode(true) as SVGElement, source.width, source.height, true);
  viewport.tabIndex = 0;
  viewport.setAttribute('role', 'application');
  viewport.setAttribute('aria-label', 'Diagram viewer. Use the arrow keys to pan, plus and minus to zoom, and zero to reset.');

  const zoomStatus = document.createElement('span');
  zoomStatus.className = 'ec-diagram-modal__zoom';
  zoomStatus.setAttribute('role', 'status');
  zoomStatus.textContent = '100%';

  const panZoom = createPanZoom(viewport, content, source.width, source.height, {
    wheelZoom: true,
    onChange: (scale) => {
      zoomStatus.textContent = `${Math.round(scale * 100)}%`;
    },
  });

  let closed = false;
  const close = () => {
    if (closed) return;
    closed = true;
    closeOpenModal = null;
    document.removeEventListener('keydown', onKeyDown);
    panZoom.destroy();
    root.classList.add('is-closing');
    backdrop.classList.add('is-closing');
    root.classList.remove('is-open');
    backdrop.classList.remove('is-open');
    document.body.style.overflow = previousBodyOverflow;
    setTimeout(() => {
      root.remove();
      backdrop.remove();
    }, 150);
    previouslyFocused?.focus?.({ preventScroll: true });
  };
  closeOpenModal = close;

  const onKeyDown = (event: KeyboardEvent) => {
    switch (event.key) {
      case 'Escape':
        close();
        break;
      case 'ArrowUp':
        panZoom.panBy(0, PAN_STEP);
        break;
      case 'ArrowDown':
        panZoom.panBy(0, -PAN_STEP);
        break;
      case 'ArrowLeft':
        panZoom.panBy(PAN_STEP, 0);
        break;
      case 'ArrowRight':
        panZoom.panBy(-PAN_STEP, 0);
        break;
      case '+':
      case '=':
        panZoom.zoomIn();
        break;
      case '-':
      case '_':
        panZoom.zoomOut();
        break;
      case '0':
        panZoom.fit(true);
        break;
      default:
        return;
    }
    event.preventDefault();
  };

  const toolbar = document.createElement('div');
  toolbar.className = 'ec-diagram-modal__toolbar';
  toolbar.appendChild(createControlButton(ICONS.zoomOut, 'Zoom out', () => panZoom.zoomOut()));
  toolbar.appendChild(zoomStatus);
  toolbar.appendChild(createControlButton(ICONS.zoomIn, 'Zoom in', () => panZoom.zoomIn()));
  toolbar.appendChild(createControlButton(ICONS.reset, 'Reset view', () => panZoom.fit(true)));
  if (source.diagramContent) {
    toolbar.appendChild(createCopyButton(source.diagramContent));
  }

  const closeBtn = createControlButton(ICONS.close, 'Close fullscreen', close);
  closeBtn.classList.add('ec-diagram-modal__close');

  dialog.appendChild(viewport);
  dialog.appendChild(toolbar);
  dialog.appendChild(closeBtn);
  root.appendChild(dialog);

  backdrop.addEventListener('click', close);
  root.addEventListener('click', (event) => {
    // Clicks on the padding around the dialog close the modal
    if (event.target === root) close();
  });
  document.addEventListener('keydown', onKeyDown);

  document.body.appendChild(backdrop);
  document.body.appendChild(root);
  document.body.style.overflow = 'hidden';

  panZoom.fit(false);
  viewport.focus({ preventScroll: true });

  // Let the starting styles paint before transitioning in
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      backdrop.classList.add('is-open');
      root.classList.add('is-open');
    });
  });
}

interface DiagramControlsOptions {
  placement: ControlsPlacement;
  source: DiagramSource;
}

/**
 * Creates the inline interactive diagram controls, laid out as a 3x3 grid:
 *
 *   [fullscreen] [pan up]   [zoom in]
 *   [pan left]   [reset]    [pan right]
 *   [copy]       [pan down] [zoom out]
 */
function createDiagramControls(panZoom: PanZoomInstance, options: DiagramControlsOptions): HTMLElement {
  const { placement, source } = options;

  const controls = document.createElement('div');
  controls.className = 'ec-diagram-controls';
  controls.setAttribute('data-placement', placement);
  controls.setAttribute('role', 'toolbar');
  controls.setAttribute('aria-label', 'Diagram controls');

  let copyBtn: HTMLElement;
  if (source.diagramContent) {
    copyBtn = createCopyButton(source.diagramContent);
  } else {
    // Keep the grid shape when there is nothing to copy
    copyBtn = document.createElement('div');
    copyBtn.setAttribute('aria-hidden', 'true');
  }

  const buttons: HTMLElement[] = [
    createControlButton(ICONS.fullscreen, 'Open fullscreen', () => openDiagramModal(source)),
    createControlButton(ICONS.panUp, 'Pan up', () => panZoom.panBy(0, PAN_STEP)),
    createControlButton(ICONS.zoomIn, 'Zoom in', () => panZoom.zoomIn()),
    createControlButton(ICONS.panLeft, 'Pan left', () => panZoom.panBy(PAN_STEP, 0)),
    createControlButton(ICONS.reset, 'Reset view', () => panZoom.fit(true)),
    createControlButton(ICONS.panRight, 'Pan right', () => panZoom.panBy(-PAN_STEP, 0)),
    copyBtn,
    createControlButton(ICONS.panDown, 'Pan down', () => panZoom.panBy(0, -PAN_STEP)),
    createControlButton(ICONS.zoomOut, 'Zoom out', () => panZoom.zoomOut()),
  ];
  buttons.forEach((btn) => controls.appendChild(btn));

  return controls;
}

/**
 * Creates the zoom container that wraps a rendered diagram
 */
export function createZoomContainer(): HTMLElement {
  ensureDiagramStyles();
  const container = document.createElement('div');
  container.className = 'mermaid-zoom-container';
  container.style.minHeight = '200px';
  return container;
}

interface ZoomOptions {
  minZoom?: number;
  maxZoom?: number;
  maxHeight?: number;
  minHeight?: number;
  diagramContent?: string;
  /** Where to place the interactive controls. Defaults to `top-right`. */
  placement?: ControlsPlacement;
  /** Force the controls on/off. By default they are shown when the diagram is taller than 120px. */
  actions?: boolean;
}

/** Padding kept around the content when a viewBox is trimmed */
const TRIM_PADDING = 8;

/** Only trim a viewBox when it has more than this much empty space on a side */
const TRIM_THRESHOLD = 16;

/**
 * Some renderers (notably mermaid C4 diagrams) declare a viewBox much larger than the drawn
 * content, which makes the diagram appear small and heavily padded. When the SVG is rendered
 * we can measure the real content bounds and tighten the viewBox around them.
 */
function trimSvgViewBox(svgElement: SVGElement): void {
  const viewBox = svgElement.getAttribute('viewBox');
  if (!viewBox) return;
  const [vx, vy, vw, vh] = viewBox.split(/[\s,]+/).map(Number);
  if (!(vw > 0 && vh > 0)) return;

  let bbox: DOMRect;
  try {
    bbox = (svgElement as unknown as SVGGraphicsElement).getBBox();
  } catch (e) {
    return;
  }
  // getBBox returns zeros when the SVG is not rendered (e.g. inside a collapsed section)
  if (!(bbox.width > 0 && bbox.height > 0)) return;

  const slack = {
    left: bbox.x - vx,
    top: bbox.y - vy,
    right: vx + vw - (bbox.x + bbox.width),
    bottom: vy + vh - (bbox.y + bbox.height),
  };
  if (Math.max(slack.left, slack.top, slack.right, slack.bottom) <= TRIM_THRESHOLD) return;

  const x = Math.max(vx, bbox.x - TRIM_PADDING);
  const y = Math.max(vy, bbox.y - TRIM_PADDING);
  const width = Math.min(vx + vw, bbox.x + bbox.width + TRIM_PADDING) - x;
  const height = Math.min(vy + vh, bbox.y + bbox.height + TRIM_PADDING) - y;
  svgElement.setAttribute('viewBox', `${x} ${y} ${width} ${height}`);
}

/**
 * Reads the natural dimensions of an SVG from its viewBox, bounding box or attributes
 */
function getSvgDimensions(svgElement: SVGElement): { width: number; height: number } {
  let width = 0;
  let height = 0;
  trimSvgViewBox(svgElement);
  const viewBox = svgElement.getAttribute('viewBox');

  if (viewBox) {
    const parts = viewBox.split(/[\s,]+/).map(Number);
    width = parts[2];
    height = parts[3];
  }

  // If viewBox didn't give us dimensions, try getBBox
  if (!(width > 0 && height > 0)) {
    try {
      // Cast to SVGGraphicsElement which has getBBox method
      const bbox = (svgElement as unknown as SVGGraphicsElement).getBBox();
      width = bbox.width;
      height = bbox.height;
      if (width > 0 && height > 0 && !viewBox) {
        svgElement.setAttribute('viewBox', `${bbox.x} ${bbox.y} ${width} ${height}`);
      }
    } catch (e) {
      // getBBox can fail if SVG isn't in DOM yet
    }
  }

  // Fallback to element dimensions if still no size
  if (!(width > 0 && height > 0)) {
    width = svgElement.clientWidth || parseFloat(svgElement.getAttribute('width') || '0') || 800;
    height = svgElement.clientHeight || parseFloat(svgElement.getAttribute('height') || '0') || 400;
  }

  return { width, height };
}

/**
 * Initializes pan/zoom (and the interactive controls) on a rendered SVG element
 */
export async function initMermaidZoom(
  svgElement: SVGElement,
  container: HTMLElement,
  id: string,
  options: ZoomOptions = {}
): Promise<void> {
  const {
    minZoom = 0.1,
    maxZoom = 8,
    maxHeight = 500,
    minHeight = 200,
    diagramContent,
    placement = DEFAULT_PLACEMENT,
    actions,
  } = options;

  ensureDiagramStyles();

  const { width, height } = getSvgDimensions(svgElement);

  // Set container height based on SVG aspect ratio, capped for usability
  const containerWidth = container.clientWidth || 800;
  const calculatedHeight = Math.min(Math.max(containerWidth * (height / width), minHeight), maxHeight);
  container.style.height = `${calculatedHeight}px`;

  // Wrap the SVG in a viewport + transformable content element
  const { viewport, content } = createViewport(svgElement, width, height);
  container.innerHTML = '';
  container.appendChild(viewport);

  const panZoom = createPanZoom(viewport, content, width, height, { minScale: minZoom, maxScale: maxZoom });
  zoomInstances.set(id, panZoom);
  panZoom.fit(false);

  // Add interactive controls. By default they are only shown for diagrams taller than 120px.
  const showControls = actions ?? height > CONTROLS_MIN_HEIGHT;
  if (showControls) {
    const source: DiagramSource = { svg: svgElement, width, height, diagramContent };
    container.appendChild(createDiagramControls(panZoom, { placement, source }));
  }

  // Refit on resize for responsiveness
  const resizeObserver = new ResizeObserver(() => {
    if (container.clientWidth > 0 && container.clientHeight > 0) {
      panZoom.fit(false);
    }
  });
  resizeObserver.observe(container);
  resizeObservers.set(id, resizeObserver);
}

/**
 * Builds the mermaid `registerIconPacks` descriptor array for a list of Iconify pack names.
 *
 * - `logos` is resolved from the bundled `@iconify-json/logos` package (no network request).
 * - Every other name is fetched lazily from jsDelivr so only the packs that are actually used
 *   in a diagram trigger a network request.
 */
export function buildIconPackDescriptors(iconPacks: string[]): Array<{ name: string; loader: () => Promise<any> }> {
  return iconPacks.map((name) => ({
    name,
    loader:
      name === 'logos'
        ? () => import('@iconify-json/logos').then((m) => m.icons)
        : () =>
            fetch(`https://cdn.jsdelivr.net/npm/@iconify-json/${name}@1/icons.json`)
              .then((res) => {
                if (!res.ok) {
                  console.error(`[EventCatalog] Failed to load icon pack "${name}" from CDN (HTTP ${res.status})`);
                  return null;
                }
                return res.json();
              })
              .catch((err) => {
                console.error(`[EventCatalog] Error loading icon pack "${name}":`, err);
                return null;
              }),
  }));
}

/**
 * High-level function to render Mermaid diagrams with zoom
 */
export async function renderMermaidWithZoom(graphs: HTMLCollectionOf<Element>, mermaidConfig?: any): Promise<void> {
  if (graphs.length === 0) return;

  // Reset abort flag at the start of rendering
  renderingAborted = false;
  const generation = ++mermaidRenderGeneration;
  lastMermaidConfig = mermaidConfig;
  ensureThemeObserver();

  const { default: mermaid } = await import('mermaid');
  if (generation !== mermaidRenderGeneration) return;

  // Apply any custom mermaid configuration
  if (mermaidConfig) {
    const { iconPacks = [], enableSupportForElkLayout = false } = mermaidConfig;

    if (iconPacks.length > 0) {
      const newPacks: string[] = (iconPacks as string[]).filter((name: string) => !registeredIconPacks.has(name));

      if (newPacks.length > 0) {
        mermaid.registerIconPacks(buildIconPackDescriptors(newPacks));
        newPacks.forEach((name: string) => registeredIconPacks.add(name));
      }
    }

    if (enableSupportForElkLayout) {
      // @ts-ignore
      const { default: elkLayouts } = await import('@mermaid-js/layout-elk/dist/mermaid-layout-elk.core.mjs');
      mermaid.registerLayoutLoaders(elkLayouts);
    }
  }

  // Detect current theme
  const isDarkMode = document.documentElement.getAttribute('data-theme') === 'dark';
  const currentTheme = isDarkMode ? 'dark' : 'default';

  // Custom theme variables for better readability in dark mode
  const darkThemeVariables = {
    signalColor: '#f0f6fc',
    signalTextColor: '#f0f6fc',
    actorTextColor: '#0d1117',
    actorBkg: '#f0f6fc',
    actorBorder: '#484f58',
    actorLineColor: '#6b7280',
    primaryTextColor: '#f0f6fc',
    secondaryTextColor: '#c9d1d9',
    tertiaryTextColor: '#f0f6fc',
    lineColor: '#6b7280',
  };

  mermaid.initialize({
    maxTextSize: mermaidConfig?.maxTextSize || 100000,
    flowchart: {
      curve: 'linear',
      rankSpacing: 0,
      nodeSpacing: 0,
    },
    startOnLoad: false,
    fontFamily: 'var(--sans-font)',
    theme: currentTheme,
    themeVariables: isDarkMode ? darkThemeVariables : undefined,
    architecture: {
      useMaxWidth: true,
    },
  });

  // Convert to array to avoid live collection issues when modifying DOM
  const graphsArray = Array.from(graphs);

  for (const graph of graphsArray) {
    // Check if rendering was aborted (e.g., user navigated away)
    if (renderingAborted || generation !== mermaidRenderGeneration) return;

    const content = graph.getAttribute('data-content');
    if (!content) continue;

    const id = 'mermaid-' + Math.round(Math.random() * 100000);

    try {
      const result = await mermaid.render(id, content);

      // Check again after async operation
      if (renderingAborted || generation !== mermaidRenderGeneration) return;

      // Create zoom container
      const container = createZoomContainer();
      container.innerHTML = result.svg;

      // Replace the graph content with the container
      graph.innerHTML = '';
      graph.appendChild(container);

      // Initialize zoom on the SVG
      const svgElement = container.querySelector('svg');
      if (svgElement) {
        await initMermaidZoom(svgElement as SVGElement, container, id, {
          diagramContent: content,
          ...getControlOptionsFromElement(graph),
        });
      }
    } catch (e) {
      console.error('Mermaid render error:', e);
    }
  }
}

/**
 * PlantUML encoding utilities
 */
function encode64(data: Uint8Array): string {
  const chars = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz-_';
  let str = '';
  const len = data.length;
  for (let i = 0; i < len; i += 3) {
    const b1 = data[i];
    const b2 = i + 1 < len ? data[i + 1] : 0;
    const b3 = i + 2 < len ? data[i + 2] : 0;

    const c1 = b1 >> 2;
    const c2 = ((b1 & 0x3) << 4) | (b2 >> 4);
    const c3 = ((b2 & 0xf) << 2) | (b3 >> 6);
    const c4 = b3 & 0x3f;

    str += chars[c1] + chars[c2] + chars[c3] + chars[c4];
  }
  return str;
}

function encodePlantUML(text: string, deflate: (data: Uint8Array, options: any) => Uint8Array): string {
  const data = new TextEncoder().encode(text);
  const compressed = deflate(data, { level: 9, to: 'Uint8Array' });
  return encode64(compressed);
}

/**
 * High-level function to render PlantUML diagrams with zoom
 */
export async function renderPlantUMLWithZoom(blocks: HTMLCollectionOf<Element>): Promise<void> {
  if (blocks.length === 0) return;

  // Dynamic import pako for compression
  const { deflate } = await import('pako');

  // Reset abort flag AFTER async import to avoid race condition with
  // destroyZoomInstances() called by astro:page-load handler during the await.
  // When there are no mermaid diagrams on the page, destroyZoomInstances() sets
  // renderingAborted=true and renderMermaidWithZoom is never called to reset it,
  // causing PlantUML rendering to be silently aborted.
  renderingAborted = false;

  // Convert to array to avoid live collection issues when modifying DOM
  const blocksArray = Array.from(blocks);

  for (const block of blocksArray) {
    // Check if rendering was aborted (e.g., user navigated away)
    if (renderingAborted) return;

    const content = block.getAttribute('data-content');
    if (!content) continue;

    const id = 'plantuml-' + Math.round(Math.random() * 100000);
    const encoded = encodePlantUML(content, deflate);
    const svgUrl = `https://www.plantuml.com/plantuml/svg/~1${encoded}`;

    try {
      // Fetch SVG content so we can pan/zoom it
      const response = await fetch(svgUrl);

      // Check again after async operation
      if (renderingAborted) return;

      if (!response.ok) {
        throw new Error(`Failed to fetch PlantUML diagram: ${response.status}`);
      }

      const svgText = await response.text();

      // Check again after async operation
      if (renderingAborted) return;

      // Create zoom container
      const container = createZoomContainer();
      container.innerHTML = svgText;

      // Replace the block content with the container
      block.innerHTML = '';
      block.appendChild(container);

      // Initialize zoom on the SVG
      const svgElement = container.querySelector('svg');
      if (svgElement) {
        await initMermaidZoom(svgElement as SVGElement, container, id, {
          diagramContent: content,
          ...getControlOptionsFromElement(block),
        });
      }
    } catch (e) {
      // Fallback to img tag if fetch fails (e.g., CORS issues)
      console.warn('PlantUML SVG fetch failed, falling back to img:', e);
      const img = document.createElement('img');
      img.src = svgUrl;
      img.alt = 'PlantUML diagram';
      img.loading = 'lazy';
      img.style.margin = '0 auto';
      img.style.display = 'block';
      block.innerHTML = '';
      block.appendChild(img);
    }
  }
}
