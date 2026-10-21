/**
 * The view's styles, after EventCatalog's own: Inter, its dialog cards and buttons (--ec-button-bg), neutral hovers,
 * the visualiser's type colours, the docs pages' lists and badges, and the agent at work. The diagram
 * itself is the visualiser's (its stylesheet first).
 * Started from event-catalog/eventcatalog@v5-beta:packages/core/eventcatalog/src/features/mcp/apps/architecture-diagram/view.tsx
 */
import visualiserStyles from '@eventcatalog/visualiser/styles.css?inline';

export const INLINE_HEIGHT = 560;

// The visualiser's theme variables (colours for light and dark mode) are set on this class
export const VISUALISER_BODY_CLASS = 'eventcatalog-visualizer';

const styles = `
  :root { --ec-primary-bg: var(--ec-page-text); --ec-primary-text: var(--ec-page-bg); }
  body {
    background: rgb(var(--ec-page-bg));
    color: rgb(var(--ec-page-text));
    font-family: 'Inter', ui-sans-serif, system-ui, -apple-system, 'Segoe UI', sans-serif;
    -webkit-font-smoothing: antialiased;
  }
  .ec-mcp-message { padding: 24px; font-size: 14px; color: rgb(var(--ec-page-text-muted)); }

  .ec-inline-icon { display: inline-block; width: 13px; height: 13px; vertical-align: -2px; }

  /* A plain button (the agent's build: Skip) */
  .ec-mcp-button {
    display: inline-flex; align-items: center; gap: 6px; height: 32px; padding: 0 12px; border-radius: 8px; border: 1px solid rgb(var(--ec-page-border));
    background: rgb(var(--ec-card-bg)); color: rgb(var(--ec-page-text)); font: 500 13px/1 'Inter', ui-sans-serif, system-ui, sans-serif;
    cursor: pointer; transition: background-color 150ms;
  }
  .ec-mcp-button svg { width: 15px; height: 15px; }
  .ec-mcp-button:disabled { opacity: 0.55; cursor: default; }
  .ec-mcp-button:hover:not(:disabled) { background: rgb(var(--ec-content-hover)); }

  /* The diagram */
  .ec-diagram { display: flex; position: relative; }
  .ec-mcp-graph { position: relative; flex: 1; min-width: 0; min-height: 0; }
  /* Zoom and fit are in the controls at the bottom left */
  .ec-mcp-graph .react-flow__controls { display: none; }

  /* Selected nodes get an accent outline and glow, hovered ones a faint outline, as in Studio (studio.css): drawn by
     the node's wrapper, so it fits every kind of node. A selected container gets a ring. (The
     accent can be comma separated in the visualiser's themes, so its transparent shades are mixed rather than rgb(... / a)) */
  .ec-mcp-graph .react-flow__node:not(.react-flow__node-domain-group, .react-flow__node-system-group, .react-flow__node-text)::after {
    content: ''; position: absolute; inset: -6px; border-radius: 12px; border: 2px solid transparent; pointer-events: none;
    transition: border-color 120ms ease, box-shadow 120ms ease;
  }
  .ec-mcp-graph .react-flow__node:not(.react-flow__node-domain-group, .react-flow__node-system-group, .react-flow__node-text):hover::after { border-color: color-mix(in srgb, rgb(var(--ec-accent)) 35%, transparent); }
  .ec-mcp-graph .react-flow__node.selected:not(.react-flow__node-domain-group, .react-flow__node-system-group, .react-flow__node-text)::after {
    border-color: rgb(var(--ec-accent)); box-shadow: 0 0 0 4px color-mix(in srgb, rgb(var(--ec-accent)) 15%, transparent);
  }
  .ec-mcp-graph .react-flow__node.selected:is(.react-flow__node-domain-group, .react-flow__node-system-group)::after {
    content: ''; position: absolute; inset: 0; border-radius: 14px; box-shadow: 0 0 0 2px color-mix(in srgb, rgb(var(--ec-accent)) 70%, transparent); pointer-events: none;
  }
  .ec-exporting .react-flow__node::after { display: none !important; }

  /* Connection points, as Studio's (studio.css): the visualiser hides node handles; here they're shown on hover, on
     selection and while connecting, to drag a connection from one node to another */
  .ec-mcp-graph .react-flow__handle {
    opacity: 0 !important; width: 11px; height: 11px; background: rgb(var(--ec-card-bg)); border: 2px solid rgb(var(--ec-accent));
    transition: opacity 0.15s ease; z-index: 30;
  }
  .ec-mcp-graph .react-flow__node:hover .react-flow__handle,
  .ec-mcp-graph .react-flow__node.selected .react-flow__handle,
  .ec-mcp-graph .react-flow__handle.connectingto { opacity: 1 !important; }
  .ec-mcp-graph .react-flow__handle:hover, .ec-mcp-graph .react-flow__handle.connectingto { background: rgb(var(--ec-accent)); }
  .ec-mcp-graph .react-flow__edge.selected .react-flow__edge-path,
  .ec-mcp-graph .react-flow__edge:hover .react-flow__edge-path { stroke: rgb(var(--ec-accent)) !important; stroke-width: 2px !important; }
  .ec-exporting .react-flow__handle { display: none !important; }

  /* Top left: the menu button, as an island (as drawing tools have them) */
  .ec-topbar { position: absolute; top: 12px; left: 12px; z-index: 10; display: flex; align-items: center; gap: 8px; font-family: 'Inter', ui-sans-serif, system-ui, sans-serif; }


  /* Type colours, as the visualiser's (bg-*-600) */
  [data-color='pink'] { --ec-type: 219 39 119; }
  [data-color='orange'] { --ec-type: 234 88 12; }
  [data-color='blue'] { --ec-type: 37 99 235; }
  [data-color='green'] { --ec-type: 22 163 74; }
  [data-color='gray'] { --ec-type: 75 85 99; }
  [data-color='purple'] { --ec-type: 147 51 234; }
  [data-color='yellow'] { --ec-type: 202 138 4; }
  [data-color='sky'] { --ec-type: 2 132 199; }
  [data-color='violet'] { --ec-type: 124 58 237; }
  [data-color='emerald'] { --ec-type: 5 150 105; }
  .ec-type-pill {
    flex-shrink: 0; padding: 1px 6px; border-radius: 4px; background: rgb(var(--ec-type)); color: white;
    font-size: 9px; font-weight: 700; letter-spacing: 0.05em; text-transform: uppercase; line-height: 16px;
  }
  .ec-type-icon { width: 16px; height: 16px; flex-shrink: 0; color: rgb(var(--ec-type)); }

  /* An entity's properties: each a name and a type (edited as fields, or listed) */
  .ec-entity-props { display: flex; flex-direction: column; gap: 6px; margin: 0; padding: 0; list-style: none; }
  .ec-entity-props li { display: flex; justify-content: space-between; gap: 8px; font-size: 12px; }
  .ec-entity-prop-name { font-weight: 500; }
  .ec-entity-prop-type { color: rgb(var(--ec-page-text-muted)); font-family: ui-monospace, SFMono-Regular, Menlo, monospace; font-size: 11px; }
  .ec-entity-prop-row { display: grid; grid-template-columns: minmax(0, 1fr) 96px 24px; gap: 6px; align-items: center; }
  .ec-entity-prop-row .ec-editable { padding: 5px 8px; font-size: 12px; }
  .ec-entity-prop-type-input { font-family: ui-monospace, SFMono-Regular, Menlo, monospace; font-size: 11px !important; }
  .ec-entity-prop-remove { width: 24px; height: 24px; }
  .ec-entity-prop-remove svg { width: 13px; height: 13px; }
  .ec-entity-prop-add {
    display: inline-flex; align-items: center; gap: 4px; align-self: flex-start; padding: 2px 0; border: 0; background: transparent;
    color: rgb(var(--ec-accent)); font: inherit; font-size: 12px; font-weight: 500; cursor: pointer;
  }
  .ec-entity-prop-add:hover { text-decoration: underline; }
  .ec-entity-prop-add svg { width: 13px; height: 13px; }
  /* Nothing under the header: no line under it, nor an empty body */
  .ec-doc-card-body:empty { display: none; }
  .ec-badges { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 10px; }
  .ec-badge {
    display: inline-flex; align-items: center; gap: 4px; padding: 2px 6px; border-radius: 6px; border: 1px solid rgb(var(--ec-page-border));
    background: rgb(var(--ec-content-hover)); color: rgb(var(--ec-page-text)); font-size: 11px; font-weight: 500; box-shadow: 0 1px 1px rgb(0 0 0 / 0.03);
  }
  .ec-badge svg { width: 12px; height: 12px; }
  .ec-doc-card-toolbar { display: flex; flex-wrap: wrap; align-items: center; gap: 6px 12px; margin-top: 12px; }
  .ec-toolbar-link {
    display: inline-flex; align-items: center; gap: 6px; padding: 0; border: 0; background: none; cursor: pointer;
    color: rgb(var(--ec-page-text-muted)); font: 500 12px 'Inter', ui-sans-serif, system-ui, sans-serif; transition: color 150ms;
  }
  .ec-toolbar-link svg { width: 14px; height: 14px; color: rgb(var(--ec-icon-color, var(--ec-page-text-muted))); }
  .ec-toolbar-link:hover, .ec-toolbar-link:hover svg { color: rgb(var(--ec-page-text)); }
  .ec-toolbar-separator { width: 1px; height: 14px; background: rgb(var(--ec-page-border)); }
  .ec-doc-card-body { padding: 4px 16px 14px; }
  .ec-doc-section { padding-top: 12px; }
  .ec-doc-section + .ec-doc-section { margin-top: 2px; }
  .ec-doc-section h3 { margin: 0 0 8px; font-size: 13px; font-weight: 600; }
  .ec-doc-list { margin: 0 -8px; padding: 0; list-style: none; display: grid; gap: 1px; }
  .ec-doc-list li { display: flex; min-width: 0; }
  .ec-doc-list-link {
    display: flex; flex: 1; align-items: center; gap: 8px; min-width: 0; padding: 4px 8px; border: 0; border-radius: 6px; background: none;
    color: rgb(var(--ec-page-text-muted)); font: inherit; text-align: left; cursor: pointer;
  }
  .ec-doc-list-link:hover { background: rgb(var(--ec-content-hover)); color: rgb(var(--ec-page-text)); }
  .ec-doc-list-link:hover .ec-doc-list-name { text-decoration: underline; text-underline-offset: 2px; }
  .ec-doc-list-name { min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-size: 13px; font-weight: 300; }
  .ec-inferred-tag { margin-left: auto; padding: 0 5px; border: 1px dotted #d97706; border-radius: 4px; color: #b45309; font-size: 10px; }
  .ec-doc-note { margin: 0 0 6px; padding: 8px 10px; border-radius: 8px; background: rgb(254 249 195); color: rgb(113 63 18); font-size: 12px; line-height: 1.5; }
  .ec-doc-note span { opacity: 0.7; }

  /* A message's page: Overview and Schema tabs, as its page in EventCatalog has */
  .ec-doc-tabs { display: flex; gap: 16px; margin: 14px 0 -12px; border-bottom: 1px solid rgb(var(--ec-page-border)); }
  .ec-doc-tab {
    display: inline-flex; align-items: center; gap: 6px; padding: 0 0 8px; margin-bottom: -1px; border: 0; border-bottom: 2px solid transparent;
    background: none; color: rgb(var(--ec-page-text-muted)); font: 500 13px 'Inter', ui-sans-serif, system-ui, sans-serif; cursor: pointer;
  }
  .ec-doc-tab:hover { color: rgb(var(--ec-page-text)); }
  .ec-doc-tab[aria-selected='true'] { color: rgb(var(--ec-page-text)); border-bottom-color: rgb(var(--ec-page-text)); }
  .ec-doc-tab-label { padding: 0 5px; border-radius: 4px; background: rgb(var(--ec-content-hover)); border: 1px solid rgb(var(--ec-page-border)); font-size: 10px; font-weight: 600; color: rgb(var(--ec-page-text-muted)); }
  .ec-doc-card-schema { padding: 14px 16px 16px; }
  .ec-doc-schema-path { margin: 0 0 8px; font: 11px ui-monospace, SFMono-Regular, Menlo, monospace; color: rgb(var(--ec-page-text-muted)); }
  .ec-doc-found { margin: 14px 0 0; font-size: 12px; color: rgb(var(--ec-page-text-muted)); overflow-wrap: anywhere; }

  /* The agent at work: its pointer and what it's doing */
  .ec-build-skip { position: absolute; right: 12px; bottom: 12px; z-index: 10; }
  .ec-agent-label {
    position: absolute; left: 16px; top: 16px; display: flex; align-items: center; gap: 4px; white-space: nowrap;
    padding: 2px 6px; border-radius: 4px; color: white; font: 500 11px 'Inter', ui-sans-serif, system-ui, sans-serif;
  }
  .ec-agent-activity { font-weight: 400; opacity: 0.9; }

  /* The question modal (ported node chat) */
  .ec-mcp-modal {
    position: absolute; z-index: 30; padding: 12px; border: 1px solid rgb(var(--ec-page-border)); border-radius: 12px;
    background: rgb(var(--ec-card-bg)); color: rgb(var(--ec-page-text)); box-shadow: 0 16px 40px rgb(0 0 0 / 0.16); font: 13px 'Inter', ui-sans-serif, system-ui, sans-serif;
  }
  .ec-mcp-modal-header { display: flex; align-items: center; gap: 6px; min-width: 0; }
  .ec-mcp-type { flex-shrink: 0; padding: 1px 6px; border-radius: 4px; background: rgb(var(--ec-page-border) / 0.7); color: rgb(var(--ec-page-text)); font-size: 9px; font-weight: 700; letter-spacing: 0.05em; text-transform: uppercase; }
  .ec-mcp-name { font-weight: 600; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .ec-mcp-version { flex-shrink: 0; color: rgb(var(--ec-page-text-muted)); font-size: 12px; }
  .ec-mcp-modal-close {
    margin-left: auto; flex-shrink: 0; display: inline-flex; padding: 4px; border: 0; border-radius: 6px; background: transparent;
    color: rgb(var(--ec-page-text-muted)); cursor: pointer;
  }
  .ec-mcp-modal-close:hover { background: rgb(var(--ec-page-border) / 0.4); color: rgb(var(--ec-page-text)); }
  .ec-mcp-modal-close svg { width: 14px; height: 14px; }
  .ec-mcp-modal-summary { margin-top: 6px; color: rgb(var(--ec-page-text-muted)); font-size: 12px; line-height: 1.45; }
  .ec-mcp-modal-form { margin-top: 10px; padding-top: 10px; border-top: 1px solid rgb(var(--ec-page-border)); }
  .ec-mcp-modal-form label { display: block; margin-bottom: 6px; font-size: 12px; font-weight: 600; }
  .ec-mcp-composer { border: 1px solid rgb(var(--ec-page-border)); border-radius: 10px; background: rgb(var(--ec-page-bg)); }
  .ec-mcp-composer:focus-within { border-color: rgb(var(--ec-page-text-muted)); }
  .ec-mcp-composer textarea { display: block; width: 100%; box-sizing: border-box; padding: 9px 11px 2px; border: 0; background: transparent; color: rgb(var(--ec-page-text)); font: 13px/1.45 'Inter', sans-serif; resize: none; outline: none; }
  .ec-mcp-composer-footer { display: flex; align-items: center; justify-content: space-between; gap: 8px; padding: 4px 6px 6px 11px; }
  .ec-mcp-composer-hint { color: rgb(var(--ec-page-text-muted)); font-size: 11px; }
  .ec-mcp-composer-send {
    display: inline-flex; align-items: center; justify-content: center; width: 28px; height: 28px; border: 0; border-radius: 8px;
    background: rgb(var(--ec-primary-bg)); color: rgb(var(--ec-primary-text)); cursor: pointer;
  }
  .ec-mcp-composer-send:disabled { background: rgb(var(--ec-page-border)); color: rgb(var(--ec-page-text-muted)); cursor: default; }
  .ec-mcp-composer-send svg { width: 14px; height: 14px; }
  .ec-mcp-modal-hint { margin-top: 10px; color: rgb(var(--ec-page-text-muted)); font-size: 12px; }
  .ec-mcp-modal-error { margin-top: 6px; color: rgb(220 38 38); font-size: 12px; }
  .ec-mcp-modal-sent { display: flex; align-items: center; gap: 6px; margin-top: 10px; padding-top: 10px; border-top: 1px solid rgb(var(--ec-page-border)); color: rgb(22 163 74); font-size: 13px; font-weight: 500; }
  .ec-mcp-modal-sent svg { width: 14px; height: 14px; }
`;

export const architectureDiagramStyles = [visualiserStyles, styles].join('\n');
