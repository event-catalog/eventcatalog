import { createContext, memo, useContext, useEffect, useId, useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import { Maximize2 } from 'lucide-react';

/** Whether this answer is still being written: until it is, a diagram's code may be unfinished */
export const AnswerStreamingContext = createContext(false);

// How long the code must stop changing before it's drawn, so a diagram isn't redrawn for every streamed word
const SETTLE_MS = 200;

const isDarkTheme = () => document.documentElement.getAttribute('data-theme') === 'dark';

/** The page's theme, followed as it changes */
const useDarkTheme = () => {
  const [dark, setDark] = useState(isDarkTheme);
  useEffect(() => {
    const observer = new MutationObserver(() => setDark(isDarkTheme()));
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
    return () => observer.disconnect();
  }, []);
  return dark;
};

// Below this, labels are too small to read: a wider diagram scrolls sideways instead (or opens full size)
const MIN_SCALE = 0.75;

/** A theme colour (an `r g b` CSS variable) as hex, which Mermaid can work out lighter and darker shades from */
const themeColour = (name: string, fallback: string) => {
  const rgb = getComputedStyle(document.documentElement)
    .getPropertyValue(name)
    .trim()
    .split(/[\s,]+/)
    .map(Number);
  if (rgb.length !== 3 || rgb.some(Number.isNaN)) return fallback;
  return `#${rgb.map((value) => value.toString(16).padStart(2, '0')).join('')}`;
};

/** Mermaid in EventCatalog's colours: quiet nodes and lines, so the diagram reads like the rest of the answer */
const mermaidTheme = (dark: boolean) => {
  const background = themeColour('--ec-page-bg', dark ? '#090d0d' : '#ffffff');
  const text = themeColour('--ec-page-text', dark ? '#f0f6fc' : '#0f172a');
  return {
    theme: 'base' as const,
    darkMode: dark,
    fontFamily: getComputedStyle(document.body).fontFamily,
    themeVariables: {
      background,
      primaryColor: themeColour('--ec-card-bg', background),
      primaryTextColor: text,
      primaryBorderColor: themeColour('--ec-page-border', dark ? '#26292f' : '#e5e5e5'),
      lineColor: themeColour('--ec-page-text-muted', '#64748b'),
      edgeLabelBackground: background,
      tertiaryColor: background,
      fontSize: '13px',
    },
    themeCSS: '.node rect, .node polygon { rx: 6px; ry: 6px; } .edgeLabel { font-size: 12px; }',
    // Compact, for a narrow column: closer nodes and labels wrapped sooner
    flowchart: { nodeSpacing: 28, rankSpacing: 36, padding: 10, diagramPadding: 4, wrappingWidth: 150 },
  };
};

// Mermaid's settings are global: diagrams are drawn one at a time, each with its own
let queue: Promise<unknown> = Promise.resolve();

/** Draws a diagram as SVG, or throws if its code isn't valid Mermaid */
const draw = (id: string, code: string, dark: boolean) => {
  const drawn = queue.then(async () => {
    // Loaded the first time an answer has a diagram, so the panel doesn't carry Mermaid until then
    const { default: mermaid } = await import('mermaid');
    mermaid.initialize({
      startOnLoad: false,
      // The model writes the code: no scripts, click handlers or HTML labels
      securityLevel: 'strict',
      ...mermaidTheme(dark),
    });
    // Checked first: rendering invalid code leaves Mermaid's error graphic in the page
    await mermaid.parse(code);
    return (await mermaid.render(id, code)).svg;
  });
  queue = drawn.catch(() => undefined);
  return drawn;
};

/** Opens the drawn diagram full size, with zoom, like the diagrams in docs */
const openFullSize = async (diagram: HTMLElement | null, code: string) => {
  // The diagram's own SVG, not the expand icon beside it
  const svg = diagram?.querySelector<SVGSVGElement>(':scope > svg');
  if (!svg) return;
  const { openDiagramModal } = await import('@utils/mermaid-zoom');
  const { width, height } = svg.viewBox.baseVal;
  // In the expanded chat (a modal), the viewer opens inside it: outside, the modal would block its clicks and focus
  const modal = diagram?.closest<HTMLElement>('[role="dialog"]') ?? undefined;
  openDiagramModal({ svg: svg.cloneNode(true) as SVGElement, width, height, diagramContent: code }, modal);
};

/**
 * A Mermaid diagram the assistant drew in its answer. While the answer streams it shows where the diagram will be; if the
 * finished code isn't valid Mermaid, the code is shown instead (`fallback`).
 */
export const ChatMermaid = memo(({ code, fallback }: { code: string; fallback: ReactNode }) => {
  const streaming = useContext(AnswerStreamingContext);
  const dark = useDarkTheme();
  const id = `chat-diagram-${useId().replace(/[^a-zA-Z0-9]/g, '')}`;
  const box = useRef<HTMLButtonElement>(null);
  const diagram = useRef<HTMLSpanElement>(null);
  const [svg, setSvg] = useState<string>();
  // The code that didn't parse: an earlier, partial diagram doesn't stand in for finished code that's invalid
  const [failedCode, setFailedCode] = useState<string>();

  useEffect(() => {
    let current = true;
    const timer = setTimeout(() => {
      draw(id, code, dark)
        .then((drawn) => {
          if (!current) return;
          setSvg(drawn);
          setFailedCode(undefined);
        })
        .catch(() => current && setFailedCode(code));
    }, SETTLE_MS);
    return () => {
      current = false;
      clearTimeout(timer);
    };
  }, [id, code, dark]);

  // Fitted to the space it has, but never below MIN_SCALE: then it keeps that size and scrolls sideways
  useLayoutEffect(() => {
    const drawn = diagram.current?.querySelector<SVGSVGElement>(':scope > svg');
    if (!svg || !drawn || !box.current) return;
    const naturalWidth = drawn.viewBox.baseVal.width;
    const fit = () => {
      const tooSmall = naturalWidth * MIN_SCALE > (box.current?.clientWidth ?? 0);
      drawn.style.width = tooSmall ? `${naturalWidth * MIN_SCALE}px` : '100%';
      drawn.style.maxWidth = tooSmall ? 'none' : `${naturalWidth}px`;
    };
    fit();
    const resized = new ResizeObserver(fit);
    resized.observe(box.current);
    return () => resized.disconnect();
  }, [svg]);

  if (failedCode === code && !streaming) return <>{fallback}</>;

  if (!svg) {
    return (
      <div
        role="status"
        className="ec-chat-diagram flex h-32 items-center justify-center rounded-lg border border-dashed border-[rgb(var(--ec-page-border))] text-xs text-[rgb(var(--ec-page-text-muted))]"
      >
        Drawing a diagram…
      </div>
    );
  }

  return (
    <button
      ref={box}
      type="button"
      onClick={() => openFullSize(diagram.current, code)}
      title="Open the diagram full size"
      className="ec-chat-diagram group relative block w-full cursor-zoom-in overflow-x-auto text-left [&_svg]:mx-auto [&_svg]:h-auto"
    >
      <span className="pointer-events-none absolute right-2 top-2 rounded p-1 text-[rgb(var(--ec-icon-color))] opacity-0 transition-opacity group-hover:opacity-100">
        <Maximize2 size={14} />
      </span>
      <span ref={diagram} className="block" dangerouslySetInnerHTML={{ __html: svg }} />
    </button>
  );
});
ChatMermaid.displayName = 'ChatMermaid';
