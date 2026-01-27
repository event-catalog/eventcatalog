/**
 * Diagram Zoom Utility
 * Provides pan/zoom functionality for Mermaid and PlantUML diagrams with React Flow-style controls
 *
 * NOTE: A standalone version of this code also exists in the embed page at:
 * src/pages/diagrams/[id]/[version]/embed.astro
 *
 * The embed page uses CDN imports for isolation in iframes. If you update this file,
 * please also update the embed page to keep the zoom functionality in sync.
 */

// Store zoom instances for cleanup
const zoomInstances = new Map<string, any>();
const resizeObservers = new Map<string, ResizeObserver>();
const fullscreenHandlers = new Map<string, () => void>();

// Abort flag for cancelling in-progress renders during cleanup
let renderingAborted = false;

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

  // Clean up fullscreen event listeners
  fullscreenHandlers.forEach((handler) => {
    document.removeEventListener('fullscreenchange', handler);
  });
  fullscreenHandlers.clear();
}

/**
 * Gets an RGB color string from a CSS variable
 * CSS variables store RGB values as "R G B" format, so we convert to "rgb(R, G, B)"
 */
function getCssVariableColor(variableName: string, fallback: string): string {
  const value = getComputedStyle(document.documentElement).getPropertyValue(variableName).trim();
  if (value) {
    // Convert "R G B" format to "rgb(R, G, B)"
    return `rgb(${value.split(' ').join(', ')})`;
  }
  return fallback;
}

/**
 * Gets theme colors based on current mode using CSS variables
 */
function getThemeColors() {
  const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
  return {
    isDark,
    bgColor: getCssVariableColor('--ec-card-bg', isDark ? '#161b22' : '#ffffff'),
    borderColor: getCssVariableColor('--ec-page-border', isDark ? '#30363d' : '#e2e8f0'),
    iconColor: getCssVariableColor('--ec-icon-color', isDark ? '#8b949e' : '#64748b'),
    iconHoverColor: getCssVariableColor('--ec-icon-hover', isDark ? '#f0f6fc' : '#0f172a'),
    hoverBgColor: getCssVariableColor('--ec-content-hover', isDark ? '#21262d' : '#f1f5f9'),
    overlayBg: getCssVariableColor('--ec-page-bg', isDark ? '#0d1117' : '#ffffff'),
  };
}

/**
 * Creates a styled button with inline CSS
 */
function createStyledButton(
  svg: string,
  title: string,
  onClick: () => void,
  colors: ReturnType<typeof getThemeColors>,
  options: { isLast?: boolean; isRound?: boolean } = {}
): HTMLButtonElement {
  const { isLast = false, isRound = false } = options;
  const btn = document.createElement('button');
  btn.type = 'button';
  btn.title = title;
  btn.innerHTML = svg;
  btn.onclick = onClick;

  btn.style.cssText = `
    all: unset;
    box-sizing: border-box;
    display: flex;
    justify-content: center;
    align-items: center;
    width: 26px;
    height: 26px;
    min-width: 26px;
    min-height: 26px;
    padding: 0;
    margin: 0;
    border: none;
    background: ${colors.bgColor};
    color: ${colors.iconColor};
    cursor: pointer;
    transition: background-color 0.15s, color 0.15s;
    line-height: 1;
    font-size: 12px;
    ${!isLast && !isRound ? `border-bottom: 1px solid ${colors.borderColor};` : ''}
    ${isRound ? 'border-radius: 6px;' : ''}
  `;

  const svgEl = btn.querySelector('svg');
  if (svgEl) {
    svgEl.style.cssText = 'display: block; width: 12px; height: 12px;';
  }

  btn.onmouseenter = () => {
    btn.style.backgroundColor = colors.hoverBgColor;
    btn.style.color = colors.iconHoverColor;
  };
  btn.onmouseleave = () => {
    btn.style.backgroundColor = colors.bgColor;
    btn.style.color = colors.iconColor;
  };

  return btn;
}

/**
 * SVG icons
 */
const ICONS = {
  plus: `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>`,
  minus: `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="5" y1="12" x2="19" y2="12"></line></svg>`,
  fit: `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3"></path></svg>`,
  // Heroicons PresentationChartLineIcon (outline)
  presentation: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M3.75 3v11.25A2.25 2.25 0 006 16.5h2.25M3.75 3h-1.5m1.5 0h16.5m0 0h1.5m-1.5 0v11.25A2.25 2.25 0 0118 16.5h-2.25m-7.5 0h7.5m-7.5 0l-1 3m8.5-3l1 3m0 0l.5 1.5m-.5-1.5h-9.5m0 0l-.5 1.5m.75-9l3-3 2.148 2.148A12.061 12.061 0 0116.5 7.605"></path></svg>`,
  // Heroicons ClipboardDocumentIcon (outline)
  copy: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M8.25 7.5V6.108c0-1.135.845-2.098 1.976-2.192.373-.03.748-.057 1.123-.08M15.75 18H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08M15.75 18.75v-1.875a3.375 3.375 0 00-3.375-3.375h-1.5a1.125 1.125 0 01-1.125-1.125v-1.5A3.375 3.375 0 006.375 7.5H5.25m11.9-3.664A2.251 2.251 0 0015 2.25h-1.5a2.251 2.251 0 00-2.15 1.586m5.8 0c.065.21.1.433.1.664v.75h-6V4.5c0-.231.035-.454.1-.664M6.75 7.5H4.875c-.621 0-1.125.504-1.125 1.125v12c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V16.5a9 9 0 00-9-9z"></path></svg>`,
  // Heroicons CheckIcon (outline)
  check: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>`,
};

/**
 * Creates React Flow-style zoom controls
 */
function createZoomControls(onZoomIn: () => void, onZoomOut: () => void, onFitView: () => void): HTMLElement {
  const colors = getThemeColors();

  const controls = document.createElement('div');
  controls.style.cssText = `
    position: absolute;
    bottom: 12px;
    left: 12px;
    display: flex;
    flex-direction: column;
    background: ${colors.bgColor};
    border-radius: 6px;
    box-shadow: 0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1);
    border: 1px solid ${colors.borderColor};
    overflow: hidden;
    z-index: 10;
  `;

  controls.appendChild(createStyledButton(ICONS.plus, 'Zoom in', onZoomIn, colors));
  controls.appendChild(createStyledButton(ICONS.minus, 'Zoom out', onZoomOut, colors));
  controls.appendChild(createStyledButton(ICONS.fit, 'Fit view', onFitView, colors, { isLast: true }));

  return controls;
}

/**
 * Creates a toolbar button with tooltip
 */
function createToolbarButton(
  icon: string,
  tooltipText: string,
  onClick: () => void,
  colors: ReturnType<typeof getThemeColors>,
  tooltipPosition: 'left' | 'right' | 'bottom' = 'bottom'
): { wrapper: HTMLElement; btn: HTMLButtonElement; tooltip: HTMLElement } {
  const wrapper = document.createElement('div');
  wrapper.style.cssText = `position: relative;`;

  const btn = document.createElement('button');
  btn.type = 'button';
  btn.innerHTML = icon;
  btn.style.cssText = `
    all: unset;
    box-sizing: border-box;
    display: flex;
    justify-content: center;
    align-items: center;
    width: 40px;
    height: 40px;
    min-width: 40px;
    min-height: 40px;
    padding: 0;
    margin: 0;
    border: none;
    border-radius: 6px;
    background: ${colors.bgColor};
    color: ${colors.iconColor};
    cursor: pointer;
    transition: background-color 0.15s, color 0.15s;
    box-shadow: 0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1);
  `;

  const svgEl = btn.querySelector('svg');
  if (svgEl) {
    svgEl.style.cssText = 'display: block; width: 20px; height: 20px;';
  }

  btn.onmouseenter = () => {
    btn.style.backgroundColor = colors.hoverBgColor;
    btn.style.color = colors.iconHoverColor;
  };
  btn.onmouseleave = () => {
    btn.style.backgroundColor = colors.bgColor;
    btn.style.color = colors.iconColor;
  };
  btn.onclick = onClick;

  // Tooltip with position-based styling
  const tooltip = document.createElement('div');
  tooltip.textContent = tooltipText;

  let tooltipStyles = `
    position: absolute;
    padding: 4px 8px;
    background: #1f2937;
    color: white;
    font-size: 12px;
    border-radius: 4px;
    box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1);
    white-space: nowrap;
    pointer-events: none;
    opacity: 0;
    transition: opacity 0.15s;
    z-index: 50;
  `;

  if (tooltipPosition === 'right') {
    tooltipStyles += `
      top: 50%;
      left: 100%;
      transform: translateY(-50%);
      margin-left: 8px;
    `;
  } else if (tooltipPosition === 'left') {
    tooltipStyles += `
      top: 50%;
      right: 100%;
      transform: translateY(-50%);
      margin-right: 8px;
    `;
  } else {
    // Default: bottom
    tooltipStyles += `
      top: 100%;
      left: 50%;
      transform: translateX(-50%);
      margin-top: 8px;
    `;
  }

  tooltip.style.cssText = tooltipStyles;

  wrapper.onmouseenter = () => {
    tooltip.style.opacity = '1';
  };
  wrapper.onmouseleave = () => {
    tooltip.style.opacity = '0';
  };

  wrapper.appendChild(btn);
  wrapper.appendChild(tooltip);

  return { wrapper, btn, tooltip };
}

/**
 * Creates the fullscreen button for top-left (tooltip shows to the right)
 */
function createFullscreenButton(onClick: () => void): HTMLElement {
  const colors = getThemeColors();
  const { wrapper } = createToolbarButton(ICONS.presentation, 'Presentation Mode', onClick, colors, 'right');
  wrapper.style.cssText = `
    position: absolute;
    top: 12px;
    left: 12px;
    z-index: 10;
  `;
  return wrapper;
}

/**
 * Creates the copy button for top-right (tooltip shows to the left)
 */
function createCopyButton(onCopy: () => void): HTMLElement {
  const colors = getThemeColors();
  const copy = createToolbarButton(
    ICONS.copy,
    'Copy diagram code',
    () => {
      onCopy();
      // Show feedback
      copy.btn.innerHTML = ICONS.check;
      copy.btn.style.color = '#10b981'; // Green color for success
      copy.tooltip.textContent = 'Copied!';

      const svgEl = copy.btn.querySelector('svg');
      if (svgEl) {
        svgEl.style.cssText = 'display: block; width: 20px; height: 20px;';
      }

      setTimeout(() => {
        copy.btn.innerHTML = ICONS.copy;
        copy.btn.style.color = colors.iconColor;
        copy.tooltip.textContent = 'Copy diagram code';
        const svgEl = copy.btn.querySelector('svg');
        if (svgEl) {
          svgEl.style.cssText = 'display: block; width: 20px; height: 20px;';
        }
      }, 2000);
    },
    colors,
    'left'
  );

  copy.wrapper.style.cssText = `
    position: absolute;
    top: 12px;
    right: 12px;
    z-index: 10;
  `;

  return copy.wrapper;
}

/**
 * Toggles native fullscreen mode on a container
 */
function toggleFullscreen(container: HTMLElement): void {
  if (!document.fullscreenElement) {
    container.requestFullscreen().catch((err) => {
      console.warn(`Error entering fullscreen: ${err.message}`);
    });
  } else {
    document.exitFullscreen();
  }
}

/**
 * Creates the zoom container with React Flow-style appearance
 */
export function createZoomContainer(): HTMLElement {
  const container = document.createElement('div');
  container.className = 'mermaid-zoom-container';
  container.style.cssText = `
    position: relative;
    width: 100%;
    min-height: 200px;
    overflow: hidden;
    margin: 0;
    cursor: grab;
  `;
  return container;
}

interface ZoomOptions {
  minZoom?: number;
  maxZoom?: number;
  zoomScaleSensitivity?: number;
  maxHeight?: number;
  minHeight?: number;
  diagramContent?: string;
}

/**
 * Initializes zoom on a Mermaid SVG element
 */
export async function initMermaidZoom(
  svgElement: SVGElement,
  container: HTMLElement,
  id: string,
  options: ZoomOptions = {}
): Promise<void> {
  // Lower zoomScaleSensitivity = smoother but slower zoom
  const { minZoom = 0.5, maxZoom = 10, zoomScaleSensitivity = 0.15, maxHeight = 500, minHeight = 200, diagramContent } = options;

  // Dynamic import for performance
  const { default: svgPanZoom } = await import('svg-pan-zoom');

  // Get the natural dimensions from viewBox or getBBox
  let width: number = 0;
  let height: number = 0;
  const viewBox = svgElement.getAttribute('viewBox');

  if (viewBox) {
    const parts = viewBox.split(/[\s,]+/).map(Number);
    width = parts[2];
    height = parts[3];
  }

  // If viewBox didn't give us dimensions, try getBBox
  if (width <= 0 || height <= 0) {
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
  if (width <= 0 || height <= 0) {
    width = svgElement.clientWidth || parseFloat(svgElement.getAttribute('width') || '0') || 800;
    height = svgElement.clientHeight || parseFloat(svgElement.getAttribute('height') || '0') || 400;
  }

  // Set container height based on SVG aspect ratio, capped for usability
  if (width > 0 && height > 0) {
    const containerWidth = container.clientWidth || 800;
    const aspectRatio = height / width;
    const calculatedHeight = Math.min(Math.max(containerWidth * aspectRatio, minHeight), maxHeight);
    container.style.height = `${calculatedHeight}px`;
  } else {
    container.style.height = `${minHeight}px`;
  }

  // SVG needs to fill the container for svg-pan-zoom
  svgElement.style.width = '100%';
  svgElement.style.height = '100%';
  svgElement.removeAttribute('height');
  svgElement.removeAttribute('width');

  try {
    const instance = svgPanZoom(svgElement, {
      zoomEnabled: true,
      controlIconsEnabled: false, // We use custom controls
      fit: true,
      center: true,
      minZoom,
      maxZoom,
      zoomScaleSensitivity,
      dblClickZoomEnabled: true,
      mouseWheelZoomEnabled: false, // Disabled to avoid hijacking page scroll
      preventMouseEventsDefault: true,
      panEnabled: true,
    });

    zoomInstances.set(id, instance);

    // Update cursor during pan
    container.addEventListener('mousedown', () => {
      container.style.cursor = 'grabbing';
    });
    container.addEventListener('mouseup', () => {
      container.style.cursor = 'grab';
    });
    container.addEventListener('mouseleave', () => {
      container.style.cursor = 'grab';
    });

    // Add custom controls
    const controls = createZoomControls(
      () => instance.zoomIn(),
      () => instance.zoomOut(),
      () => {
        instance.fit();
        instance.center();
      }
    );
    container.appendChild(controls);

    // Add fullscreen button (top-left)
    const fullscreenBtn = createFullscreenButton(() => toggleFullscreen(container));
    container.appendChild(fullscreenBtn);

    // Add copy button (top-right) if diagram content is available
    if (diagramContent) {
      const copyBtn = createCopyButton(() => {
        navigator.clipboard.writeText(diagramContent).catch((err) => {
          console.warn('Failed to copy diagram code:', err);
        });
      });
      container.appendChild(copyBtn);
    }

    // Handle fullscreen changes - enable scroll zoom in fullscreen, disable when exiting
    const handleFullscreenChange = () => {
      const isFullscreen = document.fullscreenElement === container;

      if (isFullscreen) {
        // Enable scroll zoom in fullscreen
        instance.enableMouseWheelZoom();
        // Update container styles for fullscreen
        container.style.background = getThemeColors().overlayBg;
      } else {
        // Disable scroll zoom when not fullscreen
        instance.disableMouseWheelZoom();
        // Reset container background
        container.style.background = '';
      }

      // Fit and center after transition
      setTimeout(() => {
        if (container.clientWidth > 0 && container.clientHeight > 0) {
          try {
            instance.resize();
            instance.fit();
            instance.center();
          } catch (e) {
            // Ignore matrix inversion errors
          }
        }
      }, 100);
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    fullscreenHandlers.set(id, handleFullscreenChange);

    // Resize handler for responsiveness
    const resizeObserver = new ResizeObserver(() => {
      // Guard against zero-dimension containers which cause matrix inversion errors
      if (container.clientWidth > 0 && container.clientHeight > 0) {
        try {
          instance.resize();
          instance.fit();
          instance.center();
        } catch (e) {
          // Ignore matrix inversion errors during resize
        }
      }
    });
    resizeObserver.observe(container);
    resizeObservers.set(id, resizeObserver);
  } catch (e) {
    console.warn('Failed to initialize zoom on mermaid diagram:', e);
  }
}

/**
 * High-level function to render Mermaid diagrams with zoom
 */
export async function renderMermaidWithZoom(graphs: HTMLCollectionOf<Element>, mermaidConfig?: any): Promise<void> {
  if (graphs.length === 0) return;

  // Reset abort flag at the start of rendering
  renderingAborted = false;

  const { default: mermaid } = await import('mermaid');

  // Apply any custom mermaid configuration
  if (mermaidConfig) {
    const { icons } = await import('@iconify-json/logos');
    const { iconPacks = [], enableSupportForElkLayout = false } = mermaidConfig;

    if (iconPacks.length > 0) {
      const iconPacksToRegister = iconPacks.map((name: string) => ({
        name,
        icons,
      }));
      mermaid.registerIconPacks(iconPacksToRegister);
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
    if (renderingAborted) return;

    const content = graph.getAttribute('data-content');
    if (!content) continue;

    const id = 'mermaid-' + Math.round(Math.random() * 100000);

    try {
      const result = await mermaid.render(id, content);

      // Check again after async operation
      if (renderingAborted) return;

      // Create zoom container
      const container = createZoomContainer();
      container.innerHTML = result.svg;

      // Replace the graph content with the container
      graph.innerHTML = '';
      graph.appendChild(container);

      // Initialize zoom on the SVG
      const svgElement = container.querySelector('svg');
      if (svgElement) {
        await initMermaidZoom(svgElement as SVGElement, container, id, { diagramContent: content });
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

  // Reset abort flag at the start of rendering (only if not already rendering mermaid)
  // Note: renderMermaidWithZoom also resets this flag, so we check if it's currently aborted
  if (renderingAborted) renderingAborted = false;

  // Dynamic import pako for compression
  const { deflate } = await import('pako');

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
      // Fetch SVG content so we can use svg-pan-zoom
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
        await initMermaidZoom(svgElement as SVGElement, container, id, { diagramContent: content });
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
