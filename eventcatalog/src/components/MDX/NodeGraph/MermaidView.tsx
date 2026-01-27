import React, { useState, useEffect, useRef, useCallback } from 'react';
import { CheckIcon, ClipboardIcon } from 'lucide-react';
import type { Node, Edge } from '@xyflow/react';
import { convertToMermaid } from '@utils/node-graphs/export-mermaid';
import { copyToClipboard } from '@utils/clipboard';

interface MermaidViewProps {
  nodes: Node[];
  edges: Edge[];
  maxTextSize?: number;
}

const MermaidView = ({ nodes, edges, maxTextSize = 100000 }: MermaidViewProps) => {
  const [copySuccess, setCopySuccess] = useState(false);
  const [mermaidCode, setMermaidCode] = useState('');
  const [previewSvg, setPreviewSvg] = useState<string | null>(null);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [isRendering, setIsRendering] = useState(true);
  const containerRef = useRef<HTMLDivElement>(null);
  const svgContainerRef = useRef<HTMLDivElement>(null);
  const panZoomInstanceRef = useRef<any>(null);

  // Generate mermaid code
  useEffect(() => {
    const code = convertToMermaid(nodes, edges, { includeStyles: true, direction: 'LR' });
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
        const { default: mermaid } = await import('mermaid');

        // Detect current theme
        const isDarkMode = document.documentElement.getAttribute('data-theme') === 'dark';
        const currentTheme = isDarkMode ? 'dark' : 'default';

        mermaid.initialize({
          maxTextSize: maxTextSize,
          startOnLoad: false,
          theme: currentTheme,
          flowchart: {
            curve: 'basis',
            padding: 20,
          },
          securityLevel: 'loose',
        });

        const id = 'mermaid-view-' + Math.random().toString(36).substring(2, 9);
        const { svg } = await mermaid.render(id, mermaidCode);

        if (!cancelled) {
          setPreviewSvg(svg);
          setPreviewError(null);
        }
      } catch (error) {
        if (!cancelled) {
          console.error('Mermaid render error:', error);
          setPreviewError(error instanceof Error ? error.message : 'Failed to render diagram');
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

  // Initialize pan/zoom after SVG is rendered
  useEffect(() => {
    if (!previewSvg || !svgContainerRef.current) return;

    const initZoom = async () => {
      const svgElement = svgContainerRef.current?.querySelector('svg');
      if (!svgElement) return;

      try {
        const { default: svgPanZoom } = await import('svg-pan-zoom');

        // Set SVG to fill container
        svgElement.style.width = '100%';
        svgElement.style.height = '100%';
        svgElement.removeAttribute('height');
        svgElement.removeAttribute('width');

        const instance = svgPanZoom(svgElement, {
          zoomEnabled: true,
          controlIconsEnabled: false,
          fit: true,
          center: true,
          minZoom: 0.1,
          maxZoom: 10,
          zoomScaleSensitivity: 0.15,
          dblClickZoomEnabled: true,
          mouseWheelZoomEnabled: true,
          panEnabled: true,
        });

        panZoomInstanceRef.current = instance;
      } catch (e) {
        console.warn('Failed to initialize zoom:', e);
      }
    };

    initZoom();

    return () => {
      if (panZoomInstanceRef.current) {
        try {
          panZoomInstanceRef.current.destroy();
        } catch (e) {
          // Ignore
        }
        panZoomInstanceRef.current = null;
      }
    };
  }, [previewSvg]);

  const handleCopyToClipboard = useCallback(async () => {
    await copyToClipboard(mermaidCode);
    setCopySuccess(true);
    setTimeout(() => setCopySuccess(false), 2000);
  }, [mermaidCode]);

  return (
    <div
      ref={containerRef}
      className="w-full h-full bg-[rgb(var(--ec-page-bg))] relative flex flex-col"
      style={{ animation: 'fadeIn 200ms ease-out' }}
    >
      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
      `}</style>

      {/* Copy button - top right */}
      <div className="absolute top-[10px] right-4 z-20">
        <div className="relative group">
          <button
            onClick={handleCopyToClipboard}
            className={`p-2.5 rounded-md shadow-md focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[rgb(var(--ec-accent))] transition-all duration-150 ${
              copySuccess
                ? 'bg-green-500 text-white scale-110'
                : 'bg-[rgb(var(--ec-card-bg))] hover:bg-[rgb(var(--ec-page-border))/0.5] text-[rgb(var(--ec-icon-color))] hover:scale-105'
            }`}
            aria-label={copySuccess ? 'Copied!' : 'Copy Mermaid code'}
          >
            {copySuccess ? <CheckIcon className="h-5 w-5" /> : <ClipboardIcon className="h-5 w-5" />}
          </button>
          <div className="absolute top-full right-0 mt-2 px-2 py-1 bg-[rgb(var(--ec-page-text))] text-[rgb(var(--ec-page-bg))] text-xs rounded shadow-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-50">
            {copySuccess ? 'Copied!' : 'Copy Mermaid code'}
          </div>
        </div>
      </div>

      {/* Mermaid diagram container */}
      <div className="flex-1 overflow-hidden">
        {isRendering && (
          <div className="w-full h-full flex items-center justify-center">
            <div className="relative">
              <div className="flex items-center gap-4 opacity-40">
                <div className="w-24 h-10 bg-[rgb(var(--ec-page-border))] rounded animate-pulse" />
                <div className="w-12 h-0.5 bg-[rgb(var(--ec-page-border))] animate-pulse" />
                <div
                  className="w-20 h-10 bg-[rgb(var(--ec-page-border))] rounded-full animate-pulse"
                  style={{ animationDelay: '75ms' }}
                />
                <div className="w-12 h-0.5 bg-[rgb(var(--ec-page-border))] animate-pulse" style={{ animationDelay: '150ms' }} />
                <div
                  className="w-24 h-10 bg-[rgb(var(--ec-page-border))] rounded animate-pulse"
                  style={{ animationDelay: '225ms' }}
                />
              </div>
              <p className="text-center text-sm text-[rgb(var(--ec-page-text-muted))] mt-4">Rendering diagram...</p>
            </div>
          </div>
        )}

        {previewError && !isRendering && (
          <div className="w-full h-full flex flex-col items-center justify-center p-4">
            <div className="text-red-500 text-sm mb-2">Failed to render diagram</div>
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

        {previewSvg && !isRendering && !previewError && (
          <div
            ref={svgContainerRef}
            className="w-full h-full cursor-grab active:cursor-grabbing [&_svg]:w-full [&_svg]:h-full"
            dangerouslySetInnerHTML={{ __html: previewSvg }}
          />
        )}
      </div>

      {/* Footer hint */}
      <div className="absolute bottom-4 left-4 z-20">
        <div className="flex items-center gap-2 bg-[rgb(var(--ec-card-bg))]/90 backdrop-blur-sm px-3 py-1.5 rounded-md shadow-sm border border-[rgb(var(--ec-page-border))]">
          <svg className="w-3.5 h-3.5 text-[rgb(var(--ec-icon-color))]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5M7.188 2.239l.777 2.897M5.136 7.965l-2.898-.777M13.95 4.05l-2.122 2.122m-5.657 5.656l-2.12 2.122"
            />
          </svg>
          <span className="text-xs text-[rgb(var(--ec-page-text-muted))]">Scroll to zoom · Drag to pan</span>
        </div>
      </div>
    </div>
  );
};

export default MermaidView;
