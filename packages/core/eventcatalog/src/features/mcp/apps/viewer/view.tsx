/**
 * The EventCatalog viewer MCP App: one view that shows what showResource asks for, a resource's
 * architecture diagram or its schema. Hosts keep one viewer open (ChatGPT, with the result's widget
 * session) and each new result switches it to the new view. Hosts without MCP Apps support show the
 * tool's text instead.
 *
 * Built into a single HTML file by scripts/build-mcp-apps.mjs and served as a ui:// resource.
 */
import { useEffect } from 'react';
// Tailwind (with its base reset), built from the classes the views use, and EventCatalog's theme variables
import styles from './styles.css?inline';
import { mountView, useMcpAppView } from '../shared/app-view';
import { ArchitectureDiagramView, architectureDiagramStyles, VISUALISER_BODY_CLASS } from '../architecture-diagram/view';
import { SchemaViewerView } from '../schema-viewer/view';
import { VIEWER_META_KEY, VIEWER_VIEW_TOOL, type ViewerPayload } from './shared';

const isViewerPayload = (payload?: ViewerPayload): payload is ViewerPayload =>
  (payload?.view === 'architecture' && Boolean(payload.diagram?.view)) ||
  (payload?.view === 'schema' && Boolean(payload.schema?.schemas));

const VIEW_OPTIONS = {
  name: 'EventCatalog',
  metaKey: VIEWER_META_KEY,
  viewTool: VIEWER_VIEW_TOOL,
  isPayload: isViewerPayload,
  getViewToolArguments: ({ view, resourceId, resourceVersion, resourceCollection }: Record<string, any>) => ({
    view,
    resourceId,
    resourceVersion,
    resourceCollection,
  }),
  loadErrorMessage: 'This could not be loaded from EventCatalog',
};

function Viewer() {
  const { app, payload, error, hostContext } = useMcpAppView(VIEW_OPTIONS);

  // The visualiser's theme variables would override EventCatalog's, so they only apply to the diagram
  const isDiagram = payload?.view === 'architecture';
  useEffect(() => {
    document.body.classList.toggle(VISUALISER_BODY_CLASS, isDiagram);
  }, [isDiagram]);

  if (error) {
    return <p className="p-4 text-sm">{error}</p>;
  }

  if (!payload) {
    return <p className="p-4 text-sm text-[rgb(var(--ec-page-text-muted))]">Loading from EventCatalog…</p>;
  }

  return payload.view === 'architecture' ? (
    <ArchitectureDiagramView app={app} payload={payload.diagram} hostContext={hostContext} />
  ) : (
    <SchemaViewerView app={app} payload={payload.schema} hostContext={hostContext} />
  );
}

mountView(Viewer, [styles, architectureDiagramStyles].join('\n'));
