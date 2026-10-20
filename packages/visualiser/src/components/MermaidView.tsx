import {
  useState,
  useEffect,
  useLayoutEffect,
  useRef,
  useCallback,
  useId,
} from "react";
import {
  CheckIcon,
  ClipboardIcon,
  Maximize,
  ZoomIn,
  ZoomOut,
} from "lucide-react";
import type { Node, Edge } from "@xyflow/react";
import { convertToMermaid } from "../utils/export-mermaid";
import { copyToClipboard } from "../utils/clipboard";
import { usePanZoom, type PanZoomView } from "../hooks/use-pan-zoom";
import {
  LevelButtons,
  MermaidToggle,
  Toolbar,
  ToolbarButton,
  ToolbarDivider,
  type CanvasLevel,
} from "./CanvasToolbar";

interface MermaidViewProps {
  nodes: Node[];
  edges: Edge[];
  maxTextSize?: number;
  /** The diagram's levels of detail, shown in the toolbar as on the diagram */
  levels?: CanvasLevel[];
  /** Zoom with the wheel; otherwise only with Ctrl or Cmd held (or a pinch), as on the diagram */
  zoomOnScroll?: boolean;
  /** Goes back to the diagram (the toolbar's Mermaid toggle, which is on here) */
  onShowDiagram?: () => void;
}

// The diagram's dotted background (see DiagramBackground), moved and scaled
// with the diagram as React Flow does it: dots 1px across, 16px apart
const BACKGROUND_GAP = 16;
const BACKGROUND_DOT_SIZE = 1;

const MermaidView = ({
  nodes,
  edges,
  maxTextSize = 100000,
  levels = [],
  zoomOnScroll = true,
  onShowDiagram,
}: MermaidViewProps) => {
  const [copySuccess, setCopySuccess] = useState(false);
  // How far the diagram is zoomed in, as a percentage (as the diagram's
  // toolbar shows it). Written straight into the label, so zooming doesn't
  // render the view again
  const zoomLabelRef = useRef<HTMLDivElement>(null);
  const handleZoomChange = useCallback((percent: number) => {
    if (zoomLabelRef.current) zoomLabelRef.current.textContent = `${percent}%`;
  }, []);
  // Drawn as React Flow's Background draws it, updated in the same frame as the diagram
  const patternRef = useRef<SVGPatternElement>(null);
  const dotRef = useRef<SVGCircleElement>(null);
  // Without the colons React puts in ids, for `url(#...)`
  const patternId = `mermaid-dots-${useId().replace(/[^a-zA-Z0-9_-]/g, "")}`;
  const handleViewChange = useCallback(({ x, y, scale }: PanZoomView) => {
    const pattern = patternRef.current;
    const dot = dotRef.current;
    if (!pattern || !dot) return;
    const gap = BACKGROUND_GAP * scale || 1;
    const radius = (BACKGROUND_DOT_SIZE * scale) / 2;
    pattern.setAttribute("x", String(x % gap));
    pattern.setAttribute("y", String(y % gap));
    pattern.setAttribute("width", String(gap));
    pattern.setAttribute("height", String(gap));
    pattern.setAttribute(
      "patternTransform",
      `translate(-${gap / 2},-${gap / 2})`,
    );
    dot.setAttribute("cx", String(radius));
    dot.setAttribute("cy", String(radius));
    dot.setAttribute("r", String(radius));
  }, []);
  const { viewportRef, contentRef, setContentSize, fitView, zoomIn, zoomOut } =
    usePanZoom({
      zoomOnScroll,
      onZoomChange: handleZoomChange,
      onViewChange: handleViewChange,
    });
  const [mermaidCode, setMermaidCode] = useState("");
  const [previewSvg, setPreviewSvg] = useState<string | null>(null);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [isRendering, setIsRendering] = useState(true);
  const containerRef = useRef<HTMLDivElement>(null);

  // Generate mermaid code
  useEffect(() => {
    const code = convertToMermaid(nodes, edges, {
      includeStyles: true,
      direction: "LR",
    });
    setMermaidCode(code);
  }, [nodes, edges]);

  // Render mermaid preview
  useEffect(() => {
    if (!mermaidCode) return;

    let cancelled = false;
    setIsRendering(true);
    setPreviewError(null);

    const renderMermaid = async () => {
      try {
        const { default: mermaid } = await import("mermaid");

        // Detect current theme
        const isDarkMode =
          document.documentElement.getAttribute("data-theme") === "dark";
        const currentTheme = isDarkMode ? "dark" : "default";

        mermaid.initialize({
          maxTextSize: maxTextSize,
          startOnLoad: false,
          theme: currentTheme,
          flowchart: {
            curve: "basis",
            padding: 20,
          },
          securityLevel: "loose",
        });

        const id = "mermaid-view-" + Math.random().toString(36).substring(2, 9);
        const { svg } = await mermaid.render(id, mermaidCode);

        if (!cancelled) {
          setPreviewSvg(svg);
          setPreviewError(null);
        }
      } catch (error) {
        if (!cancelled) {
          console.error("Mermaid render error:", error);
          setPreviewError(
            error instanceof Error ? error.message : "Failed to render diagram",
          );
          setPreviewSvg(null);
        }
      } finally {
        if (!cancelled) {
          setIsRendering(false);
        }
      }
    };

    renderMermaid();

    return () => {
      cancelled = true;
    };
  }, [mermaidCode]);

  // Each diagram drawn at its own size, fitted to the view (as the diagram is
  // fitted after switching levels)
  useLayoutEffect(() => {
    const svgElement = contentRef.current?.querySelector("svg");
    if (!svgElement) return;
    const { width, height } = svgElement.viewBox.baseVal;
    svgElement.style.maxWidth = "none";
    svgElement.setAttribute("width", String(width));
    svgElement.setAttribute("height", String(height));
    setContentSize(width, height);
    // Each diagram (e.g. another level) fades in, as there's no animating
    // between two Mermaid diagrams
    svgElement.animate([{ opacity: 0 }, { opacity: 1 }], {
      duration: 200,
      easing: "ease-out",
    });
  }, [previewSvg, setContentSize]);

  const handleCopyToClipboard = useCallback(async () => {
    await copyToClipboard(mermaidCode);
    setCopySuccess(true);
    setTimeout(() => setCopySuccess(false), 2000);
  }, [mermaidCode]);

  return (
    <div
      ref={containerRef}
      className="absolute inset-0 bg-[rgb(var(--ec-page-bg))]"
      style={{ animation: "fadeIn 200ms ease-out" }}
    >
      <svg
        className="absolute inset-0 w-full h-full pointer-events-none"
        aria-hidden="true"
      >
        <pattern
          ref={patternRef}
          id={patternId}
          width={BACKGROUND_GAP}
          height={BACKGROUND_GAP}
          patternUnits="userSpaceOnUse"
        >
          <circle ref={dotRef} style={{ fill: "var(--ec-bg-dots)" }} />
        </pattern>
        <rect width="100%" height="100%" fill={`url(#${patternId})`} />
      </svg>
      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
      `}</style>

      {/* Mermaid diagram container: drag to pan, scroll or pinch to zoom */}
      <div
        ref={viewportRef}
        className="absolute inset-0 overflow-hidden cursor-grab select-none touch-none"
      >
        {/* Only before the first diagram: switching levels keeps the last one until the next is drawn */}
        {isRendering && !previewSvg && (
          <div className="w-full h-full flex items-center justify-center">
            <div className="relative">
              <div className="flex items-center gap-4 opacity-40">
                <div className="w-24 h-10 bg-[rgb(var(--ec-page-border))] rounded animate-pulse" />
                <div className="w-12 h-0.5 bg-[rgb(var(--ec-page-border))] animate-pulse" />
                <div
                  className="w-20 h-10 bg-[rgb(var(--ec-page-border))] rounded-full animate-pulse"
                  style={{ animationDelay: "75ms" }}
                />
                <div
                  className="w-12 h-0.5 bg-[rgb(var(--ec-page-border))] animate-pulse"
                  style={{ animationDelay: "150ms" }}
                />
                <div
                  className="w-24 h-10 bg-[rgb(var(--ec-page-border))] rounded animate-pulse"
                  style={{ animationDelay: "225ms" }}
                />
              </div>
              <p className="text-center text-sm text-[rgb(var(--ec-page-text-muted))] mt-4">
                Rendering diagram...
              </p>
            </div>
          </div>
        )}

        {previewError && !isRendering && (
          <div className="w-full h-full flex flex-col items-center justify-center p-4">
            <div className="text-red-500 text-sm mb-2">
              Failed to render diagram
            </div>
            <div className="text-[rgb(var(--ec-page-text-muted))] text-xs font-mono bg-[rgb(var(--ec-code-bg))] p-2 rounded max-w-lg overflow-auto">
              {previewError}
            </div>
            <div className="mt-4 text-sm text-[rgb(var(--ec-page-text-muted))]">
              <p>You can still copy the Mermaid code and paste it into</p>
              <a
                href="https://mermaid.live"
                target="_blank"
                rel="noopener noreferrer"
                className="text-[rgb(var(--ec-accent))] hover:underline"
              >
                mermaid.live
              </a>
            </div>
          </div>
        )}

        {previewSvg && !previewError && (
          <div
            ref={contentRef}
            className="absolute left-0 top-0 origin-top-left"
            dangerouslySetInnerHTML={{ __html: previewSvg }}
          />
        )}
      </div>

      {/* The diagram's toolbar: the view, its levels and copying the Mermaid code */}
      <div className="absolute bottom-[15px] left-1/2 -translate-x-1/2 z-20">
        <Toolbar>
          <ToolbarButton label="Fit view" onClick={() => fitView()}>
            <Maximize className="w-4 h-4" />
          </ToolbarButton>
          <ToolbarButton label="Zoom out" onClick={zoomOut}>
            <ZoomOut className="w-4 h-4" />
          </ToolbarButton>
          <div
            ref={zoomLabelRef}
            className="w-12 text-center text-xs font-medium tabular-nums text-[rgb(var(--ec-page-text-muted))]"
          >
            100%
          </div>
          <ToolbarButton label="Zoom in" onClick={zoomIn}>
            <ZoomIn className="w-4 h-4" />
          </ToolbarButton>
          {levels.length > 0 && (
            <>
              <ToolbarDivider />
              <LevelButtons levels={levels} />
            </>
          )}
          {onShowDiagram && (
            <>
              <ToolbarDivider />
              <MermaidToggle active onClick={onShowDiagram} />
            </>
          )}
          <ToolbarDivider />
          <ToolbarButton
            label={copySuccess ? "Copied!" : "Copy Mermaid code"}
            active={copySuccess}
            onClick={handleCopyToClipboard}
          >
            {copySuccess ? (
              <CheckIcon className="w-4 h-4" />
            ) : (
              <ClipboardIcon className="w-4 h-4" />
            )}
          </ToolbarButton>
        </Toolbar>
      </div>
    </div>
  );
};

export default MermaidView;
