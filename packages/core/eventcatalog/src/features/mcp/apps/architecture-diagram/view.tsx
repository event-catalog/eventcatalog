/**
 * MCP App view for the architecture diagram tool. Renders the EventCatalog visualiser inline
 * in MCP hosts that support MCP Apps (e.g. Claude, ChatGPT, VS Code). Hosts without MCP Apps
 * support show the tool's Mermaid text instead.
 *
 * Built into a single HTML file by scripts/build-mcp-apps.mjs and served as a ui:// resource.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { config as configureZod } from 'zod';
import { createRoot } from 'react-dom/client';
import type { App, McpUiHostContext } from '@modelcontextprotocol/ext-apps';
import { useApp } from '@modelcontextprotocol/ext-apps/react';
import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import { NodeGraph } from '@eventcatalog/visualiser';
import { ArrowLeft, ExternalLink, Maximize2, Minimize2 } from 'lucide-react';
// The visualiser's stylesheet expects Tailwind's base reset, which EventCatalog pages include
import baseStyles from 'tailwindcss/preflight.css?inline';
import visualiserStyles from '@eventcatalog/visualiser/styles.css?inline';
import type { Node } from '@xyflow/react';
import { ARCHITECTURE_DIAGRAM_META_KEY, ARCHITECTURE_DIAGRAM_VIEW_TOOL, type ArchitectureDiagramPayload } from './shared';
import { NodeChat, describeNode, describeNodeForModel, type SelectedNode } from './node-chat';
import { parseAskLink, parseDiagramLink, withAskMenuItem, type DiagramLink } from './links';

const INLINE_HEIGHT = 560;

const RESOURCE_TYPE_LABELS: Record<string, string> = {
  domains: 'Domain',
  systems: 'System',
  services: 'Service',
  agents: 'Agent',
  events: 'Event',
  commands: 'Command',
  queries: 'Query',
  flows: 'Flow',
  containers: 'Data store',
  'data-products': 'Data product',
};

// Styles for the view's own header and question modal
const viewStyles = `
  body {
    background: rgb(var(--ec-page-bg));
    color: rgb(var(--ec-page-text));
    font-family: ui-sans-serif, system-ui, -apple-system, 'Segoe UI', sans-serif;
  }
  .ec-mcp-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    padding: 8px 12px;
    border-bottom: 1px solid rgb(var(--ec-page-border));
    background: rgb(var(--ec-page-bg));
  }
  .ec-mcp-title { display: flex; align-items: center; gap: 8px; min-width: 0; font-size: 13px; }
  .ec-mcp-type {
    flex-shrink: 0;
    padding: 1px 6px;
    border-radius: 4px;
    background: rgb(var(--ec-accent-subtle));
    color: rgb(var(--ec-accent));
    font-size: 10px;
    font-weight: 600;
    letter-spacing: 0.04em;
    text-transform: uppercase;
  }
  .ec-mcp-name { font-weight: 600; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .ec-mcp-version { flex-shrink: 0; color: rgb(var(--ec-page-text-muted)); font-size: 12px; }
  .ec-mcp-actions { display: flex; gap: 6px; flex-shrink: 0; }
  .ec-mcp-button {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    height: 28px;
    padding: 0 10px;
    border: 1px solid rgb(var(--ec-page-border));
    border-radius: 6px;
    background: rgb(var(--ec-card-bg));
    color: rgb(var(--ec-page-text));
    font-size: 12px;
    font-weight: 500;
    cursor: pointer;
    transition: border-color 150ms, color 150ms;
  }
  .ec-mcp-button:hover { border-color: rgb(var(--ec-accent)); color: rgb(var(--ec-accent)); }
  .ec-mcp-button svg { width: 14px; height: 14px; }
  .ec-mcp-back { padding: 0 7px; }
  .ec-mcp-loading { flex-shrink: 0; color: rgb(var(--ec-page-text-muted)); font-size: 12px; }
  .ec-mcp-graph { position: relative; flex: 1; min-height: 0; }
  .ec-mcp-modal {
    position: absolute;
    z-index: 20;
    padding: 12px;
    border: 1px solid rgb(var(--ec-page-border));
    border-radius: 12px;
    background: rgb(var(--ec-card-bg));
    color: rgb(var(--ec-page-text));
    box-shadow: 0 12px 32px rgb(0 0 0 / 0.18), 0 2px 6px rgb(0 0 0 / 0.08);
    font-size: 13px;
  }
  /* Pointer towards the node */
  .ec-mcp-modal::before {
    content: '';
    position: absolute;
    top: 16px;
    width: 10px;
    height: 10px;
    background: rgb(var(--ec-card-bg));
    border: 1px solid rgb(var(--ec-page-border));
    transform: rotate(45deg);
  }
  .ec-mcp-modal[data-side='right']::before { left: -6px; border-top-color: transparent; border-right-color: transparent; }
  .ec-mcp-modal[data-side='left']::before { right: -6px; border-bottom-color: transparent; border-left-color: transparent; }
  .ec-mcp-modal-header { display: flex; align-items: center; gap: 6px; min-width: 0; }
  .ec-mcp-modal-close {
    margin-left: auto;
    flex-shrink: 0;
    display: inline-flex;
    padding: 3px;
    border-radius: 6px;
    color: rgb(var(--ec-page-text-muted));
    cursor: pointer;
  }
  .ec-mcp-modal-close:hover { background: color-mix(in srgb, rgb(var(--ec-page-border)) 50%, transparent); color: rgb(var(--ec-page-text)); }
  .ec-mcp-modal-close svg { width: 14px; height: 14px; }
  .ec-mcp-modal-summary {
    margin-top: 6px;
    color: rgb(var(--ec-page-text-muted));
    font-size: 12px;
    line-height: 1.45;
    display: -webkit-box;
    -webkit-line-clamp: 3;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }
  .ec-mcp-modal-form { margin-top: 10px; padding-top: 10px; border-top: 1px solid rgb(var(--ec-page-border)); }
  .ec-mcp-modal-form label { display: block; margin-bottom: 6px; font-size: 12px; font-weight: 600; }
  .ec-mcp-composer {
    border: 1px solid rgb(var(--ec-page-border));
    border-radius: 10px;
    background: rgb(var(--ec-page-bg));
    transition: border-color 150ms, box-shadow 150ms;
  }
  .ec-mcp-composer:focus-within {
    border-color: rgb(var(--ec-accent));
    box-shadow: 0 0 0 3px color-mix(in srgb, rgb(var(--ec-accent)) 15%, transparent);
  }
  .ec-mcp-composer textarea {
    display: block;
    width: 100%;
    padding: 9px 11px 2px;
    background: transparent;
    color: rgb(var(--ec-page-text));
    font-family: inherit;
    font-size: 13px;
    line-height: 1.45;
    resize: none;
    outline: none;
  }
  .ec-mcp-composer textarea::placeholder { color: color-mix(in srgb, rgb(var(--ec-page-text-muted)) 70%, transparent); opacity: 1; }
  .ec-mcp-composer-footer { display: flex; align-items: center; justify-content: space-between; gap: 8px; padding: 4px 6px 6px 11px; }
  .ec-mcp-composer-hint { color: color-mix(in srgb, rgb(var(--ec-page-text-muted)) 75%, transparent); font-size: 11px; }
  .ec-mcp-composer-send {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    width: 28px;
    height: 28px;
    border-radius: 8px;
    background: rgb(var(--ec-accent));
    color: rgb(var(--ec-button-text));
    cursor: pointer;
    transition: opacity 150ms, transform 150ms;
  }
  .ec-mcp-composer-send:hover:not(:disabled) { transform: translateY(-1px); }
  .ec-mcp-composer-send:disabled { background: rgb(var(--ec-page-border)); color: rgb(var(--ec-page-text-muted)); cursor: default; }
  .ec-mcp-composer-send svg { width: 14px; height: 14px; }
  .ec-mcp-modal-link {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    margin-top: 8px;
    padding: 4px 8px;
    border: 1px solid rgb(var(--ec-page-border));
    border-radius: 6px;
    color: rgb(var(--ec-page-text));
    font-size: 12px;
    font-weight: 500;
    cursor: pointer;
    transition: border-color 150ms, color 150ms;
  }
  .ec-mcp-modal-link:hover { border-color: rgb(var(--ec-accent)); color: rgb(var(--ec-accent)); }
  .ec-mcp-modal-link svg { width: 13px; height: 13px; }
  .ec-mcp-modal-hint { margin-top: 10px; color: rgb(var(--ec-page-text-muted)); font-size: 12px; }
  /* There are no error or success colour tokens in the theme yet, so these are fixed */
  .ec-mcp-modal-error { margin-top: 6px; color: rgb(220 38 38); font-size: 12px; }
  .ec-mcp-modal-sent {
    display: flex;
    align-items: center;
    gap: 6px;
    margin-top: 10px;
    padding-top: 10px;
    border-top: 1px solid rgb(var(--ec-page-border));
    color: rgb(22 163 74);
    font-size: 13px;
    font-weight: 500;
  }
  .ec-mcp-modal-sent svg { width: 14px; height: 14px; }
`;

// MCP hosts block eval in views, so stop zod (used by the MCP Apps SDK) from probing for it
configureZod({ jitless: true });

const getPayloadFromMeta = (result: CallToolResult) =>
  (result._meta?.[ARCHITECTURE_DIAGRAM_META_KEY] as ArchitectureDiagramPayload | undefined) ??
  (result.structuredContent as ArchitectureDiagramPayload | undefined);

/** The diagram from the tool result, or loaded through the app-only tool when the host doesn't pass `_meta` */
async function loadPayload(app: App, result: CallToolResult): Promise<ArchitectureDiagramPayload> {
  const payload = getPayloadFromMeta(result);
  if (payload?.view) return payload;

  const text = result.content?.find((item) => item.type === 'text')?.text;
  const { resourceId, resourceVersion, resourceCollection } = JSON.parse(text ?? '{}');
  const viewResult = await app.callServerTool({
    name: ARCHITECTURE_DIAGRAM_VIEW_TOOL,
    arguments: { resourceId, resourceVersion, resourceCollection },
  });
  const loaded = getPayloadFromMeta(viewResult);
  if (!loaded?.view) throw new Error('The diagram could not be loaded');
  return loaded;
}

const applyTheme = (context?: McpUiHostContext) => {
  if (context?.theme) document.documentElement.setAttribute('data-theme', context.theme);
};

function ArchitectureDiagramView() {
  // The diagrams opened in the view, the current one last (links like "Focus node" open another)
  const [diagrams, setDiagrams] = useState<ArchitectureDiagramPayload[]>([]);
  const payload = diagrams[diagrams.length - 1] ?? null;
  const [isOpeningDiagram, setIsOpeningDiagram] = useState(false);
  const [selectedNode, setSelectedNode] = useState<SelectedNode | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [hostContext, setHostContext] = useState<McpUiHostContext | undefined>();

  const { app, error: connectionError } = useApp({
    appInfo: { name: 'EventCatalog architecture diagram', version: '1.0.0' },
    capabilities: {},
    onAppCreated: (createdApp) => {
      createdApp.ontoolresult = (result) => {
        if (result.isError) {
          setError(result.content?.find((item) => item.type === 'text')?.text ?? 'The diagram could not be loaded');
          return;
        }
        loadPayload(createdApp, result)
          .then((loaded) => setDiagrams([loaded]))
          .catch((loadError) => setError(String(loadError?.message ?? loadError)));
      };
      createdApp.onhostcontextchanged = (context) => {
        applyTheme(context);
        setHostContext((previous) => ({ ...previous, ...context }));
      };
    },
  });

  useEffect(() => {
    const context = app?.getHostContext();
    applyTheme(context);
    setHostContext(context);
  }, [app]);

  const toCatalogUrl = useCallback((path: string) => (payload ? new URL(path, payload.catalogUrl).href : path), [payload]);

  // Links in the diagram open EventCatalog in the host (the view itself can't navigate)
  const openInCatalog = useCallback((url: string) => app?.openLink({ url: toCatalogUrl(url) }), [app, toCatalogUrl]);

  // Opens another resource's diagram in the view, loaded from the MCP server through the host
  const openDiagram = useCallback(
    async (diagram: DiagramLink) => {
      if (!app) return;
      setIsOpeningDiagram(true);
      try {
        const result = await app.callServerTool({
          name: ARCHITECTURE_DIAGRAM_VIEW_TOOL,
          arguments: { resourceId: diagram.id, resourceVersion: diagram.version, resourceCollection: diagram.collection },
        });
        const loaded = getPayloadFromMeta(result);
        if (result.isError || !loaded?.view) throw new Error('The diagram could not be loaded');
        setSelectedNode(null);
        setDiagrams((opened) => [...opened, loaded]);
      } catch {
        // Show it in EventCatalog instead
        openInCatalog(`/visualiser/${diagram.collection}/${diagram.id}/${diagram.version}`);
      } finally {
        setIsOpeningDiagram(false);
      }
    },
    [app, openInCatalog]
  );

  const goBack = useCallback(() => {
    setSelectedNode(null);
    setDiagrams((opened) => (opened.length > 1 ? opened.slice(0, -1) : opened));
  }, []);

  // Diagram links open in the view when the host can call the MCP server for the view, other links in EventCatalog
  const followLink = useCallback(
    (href: string) => {
      const diagram = payload && parseDiagramLink(href, payload.catalogUrl);
      if (diagram && app?.getHostCapabilities()?.serverTools) {
        const current = payload.resource;
        const isCurrent =
          diagram.collection === current.collection && diagram.id === current.id && diagram.version === current.version;
        if (!isCurrent) openDiagram(diagram);
        return;
      }
      openInCatalog(href);
    },
    [app, payload, openDiagram, openInCatalog]
  );

  // The diagram's levels, with "Ask a question" added to every node's right-click menu
  const graph = useMemo(() => {
    if (!payload) return null;
    const { view } = payload;
    const withAsk = (level?: { nodes: any[]; edges: any[] }) => level && { ...level, nodes: withAskMenuItem(level.nodes) };
    const levels = { ...withAsk(view)!, overview: withAsk(view.overview), hiddenMessages: withAsk(view.hiddenMessages) };
    const nodesById = new Map<string, Node>(
      [levels, levels.overview, levels.hiddenMessages].flatMap((level) => level?.nodes ?? []).map((node) => [node.id, node])
    );
    return { ...levels, nodesById };
  }, [payload]);

  // The view can't navigate (it runs in a sandbox), so links in the diagram, such as the ones in
  // a node's right-click menu, are followed here
  const followLinkRef = useRef(followLink);
  followLinkRef.current = followLink;
  const askAboutNodeIdRef = useRef((nodeId: string) => {});
  askAboutNodeIdRef.current = (nodeId: string) => {
    const node = graph?.nodesById.get(nodeId);
    if (node) setSelectedNode(describeNode(node));
  };
  useEffect(() => {
    const onClick = (event: MouseEvent) => {
      const anchor = (event.target as Element | null)?.closest?.('a[href]');
      const href = anchor?.getAttribute('href');
      if (!href) return;
      // "Ask a question" links only point within the view, so the click isn't cancelled: that lets
      // the right-click menu handle it and close
      const askNodeId = parseAskLink(href);
      if (askNodeId) {
        askAboutNodeIdRef.current(askNodeId);
        return;
      }
      if (href.startsWith('#')) return;
      event.preventDefault();
      // Cancelling the click stops a right-click menu closing itself, so close it (menus close on Escape)
      if (anchor?.closest('[role="menu"]')) {
        document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
      }
      followLinkRef.current(href);
    };
    document.addEventListener('click', onClick, true);
    return () => document.removeEventListener('click', onClick, true);
  }, []);

  // Domain and system cards navigate with window.__ecNavigate (or by changing the page, which would
  // take the view away). Clicking them opens the question modal, which offers to open their diagram.
  const catalogUrl = payload?.catalogUrl;
  useEffect(() => {
    const bridge = window as unknown as { __ecNavigate?: (url: string) => void };
    bridge.__ecNavigate = (url: string) => {
      if (catalogUrl && parseDiagramLink(url, catalogUrl)) return;
      followLinkRef.current(url);
    };
    return () => {
      delete bridge.__ecNavigate;
    };
  }, [catalogUrl]);

  const isFullscreen = hostContext?.displayMode === 'fullscreen';

  // Fit the diagram to the view again when the host resizes it (e.g. going full screen)
  const [fitRequestId, setFitRequestId] = useState(0);
  useEffect(() => setFitRequestId((id) => id + 1), [hostContext?.displayMode]);
  const canGoFullscreen = hostContext?.availableDisplayModes?.includes('fullscreen');

  // Clicking a node opens a modal next to it, to ask the conversation about it
  const graphRef = useRef<HTMLDivElement>(null);
  const closeChat = useCallback(() => setSelectedNode(null), []);
  const hostCapabilities = app?.getHostCapabilities();

  // Only opens the modal: nothing is sent to the host until the user sends a question
  const handleNodeClick = useCallback((node: Node) => setSelectedNode(describeNode(node)), []);

  const askAboutNode = useCallback(
    async (question: string) => {
      if (!app || !selectedNode || !payload) return;
      const result = await app.sendMessage({
        role: 'user',
        content: [
          {
            type: 'text',
            text: `${question}\n\n(About ${describeNodeForModel(selectedNode)} in the EventCatalog architecture diagram for ${payload.resource.name}.)`,
          },
        ],
      });
      if (result.isError) throw new Error('The host did not accept the message');
    },
    [app, selectedNode, payload]
  );

  if (connectionError || error) {
    return <p style={{ padding: 16, fontFamily: 'sans-serif' }}>{connectionError?.message ?? error}</p>;
  }

  if (!payload || !graph) {
    return <p style={{ padding: 16, fontFamily: 'sans-serif' }}>Loading diagram…</p>;
  }

  const { resource } = payload;
  const isCurrentDiagram = (diagram: DiagramLink) =>
    diagram.collection === resource.collection && diagram.id === resource.id && diagram.version === resource.version;
  // NodeGraph renders into a portal element with this id (as the Diagram page provides one)
  const graphId = `mcp-${resource.collection}-${resource.id}-${resource.version}`;

  return (
    <div style={{ height: isFullscreen ? '100vh' : INLINE_HEIGHT, display: 'flex', flexDirection: 'column' }}>
      <div className="ec-mcp-header">
        <div className="ec-mcp-title">
          {diagrams.length > 1 && (
            <button type="button" className="ec-mcp-button ec-mcp-back" aria-label="Back" title="Back" onClick={goBack}>
              <ArrowLeft aria-hidden />
            </button>
          )}
          <span className="ec-mcp-type">{RESOURCE_TYPE_LABELS[resource.collection] ?? resource.collection}</span>
          <span className="ec-mcp-name">{resource.name}</span>
          <span className="ec-mcp-version">v{resource.version}</span>
          {isOpeningDiagram && <span className="ec-mcp-loading">Opening diagram…</span>}
        </div>
        <div className="ec-mcp-actions">
          <button type="button" className="ec-mcp-button" onClick={() => openInCatalog(payload.visualiserPath)}>
            <ExternalLink aria-hidden />
            Open in EventCatalog
          </button>
          {canGoFullscreen && (
            <button
              type="button"
              className="ec-mcp-button"
              aria-label={isFullscreen ? 'Exit full screen' : 'Full screen'}
              onClick={() => app?.requestDisplayMode({ mode: isFullscreen ? 'inline' : 'fullscreen' })}
            >
              {isFullscreen ? <Minimize2 aria-hidden /> : <Maximize2 aria-hidden />}
            </button>
          )}
        </div>
      </div>
      <div className="ec-mcp-graph" ref={graphRef} key={graphId}>
        <div id={`${graphId}-portal`} style={{ height: '100%' }} />
        {selectedNode && (
          <NodeChat
            node={selectedNode}
            containerRef={graphRef}
            canSend={!!hostCapabilities?.message}
            onSend={askAboutNode}
            onOpenDiagram={
              selectedNode.diagram && app?.getHostCapabilities()?.serverTools && !isCurrentDiagram(selectedNode.diagram)
                ? () => openDiagram(selectedNode.diagram!)
                : undefined
            }
            onClose={closeChat}
          />
        )}
      </div>
      <div style={{ display: 'none' }} key={`${graphId}-graph`}>
        <NodeGraph
          id={graphId}
          nodes={graph.nodes}
          edges={graph.edges}
          overviewGraph={
            graph.overview
              ? {
                  ...graph.overview,
                  label: resource.collection === 'domains' ? 'domains and systems' : 'system context',
                }
              : undefined
          }
          hiddenMessagesGraph={graph.hiddenMessages}
          preferenceScope={resource.collection}
          mode="full"
          linkTo="docs"
          showSearch
          compactSearch
          showMenu={false}
          hideAttribution
          zoomOnScroll
          fitRequestId={fitRequestId}
          onNodeClick={handleNodeClick}
          onBuildUrl={toCatalogUrl}
          onNavigate={followLink}
        />
      </div>
    </div>
  );
}

// The visualiser's theme variables (colours for light and dark mode) are set on this class
document.body.classList.add('eventcatalog-visualizer');

const style = document.createElement('style');
style.textContent = [baseStyles, visualiserStyles, viewStyles].join('\n');
document.head.appendChild(style);

// No StrictMode: it mounts the view twice, which connects to the host twice
createRoot(document.getElementById('root')!).render(<ArchitectureDiagramView />);
