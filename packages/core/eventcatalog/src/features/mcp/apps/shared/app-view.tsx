/**
 * Connecting the EventCatalog viewer MCP App to the host, loading the tool result's payload, following the
 * host's theme and display mode, and mounting the view.
 */
import { useEffect, useState, type ComponentType } from 'react';
import { config as configureZod } from 'zod';
import { createRoot } from 'react-dom/client';
import type { App, McpUiHostContext } from '@modelcontextprotocol/ext-apps';
import { useApp } from '@modelcontextprotocol/ext-apps/react';
import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js';

// MCP hosts block eval in views, so stop zod (used by the MCP Apps SDK) from probing for it
configureZod({ jitless: true });

/** The payload for the view: in the result's `_meta` from the model-facing tool, or `structuredContent` from the app-only tool */
export const getToolResultPayload = <Payload,>(result: CallToolResult, metaKey: string) =>
  (result._meta?.[metaKey] as Payload | undefined) ?? (result.structuredContent as Payload | undefined);

const applyTheme = (context?: McpUiHostContext) => {
  if (context?.theme) document.documentElement.setAttribute('data-theme', context.theme);
};

type McpAppViewOptions<Payload> = {
  name: string;
  /** Key of the payload in the model-facing tool result's `_meta` */
  metaKey: string;
  /** App-only tool that loads the payload when the host doesn't pass the result's `_meta` to the view */
  viewTool: string;
  /** Whether a tool result carried a complete payload */
  isPayload: (payload: Payload | undefined) => payload is Payload;
  /** The view tool's arguments, from the model-facing tool result's text */
  getViewToolArguments: (text: Record<string, any>) => Record<string, unknown>;
  loadErrorMessage: string;
};

/** The payload from a tool result, or loaded through the app-only tool when the host doesn't pass `_meta` */
async function loadPayload<Payload>(app: App, result: CallToolResult, options: McpAppViewOptions<Payload>) {
  const payload = getToolResultPayload<Payload>(result, options.metaKey);
  if (options.isPayload(payload)) return payload;

  const text = result.content?.find((item) => item.type === 'text')?.text;
  const viewResult = await app.callServerTool({
    name: options.viewTool,
    arguments: options.getViewToolArguments(JSON.parse(text ?? '{}')),
  });
  const loaded = getToolResultPayload<Payload>(viewResult, options.metaKey);
  if (!options.isPayload(loaded)) throw new Error(options.loadErrorMessage);
  return loaded;
}

/**
 * Connects the view to the MCP host and loads the payload of each tool result shown in it.
 * Also applies the host's theme (light or dark) and keeps its context (such as the display mode) up to date.
 */
export function useMcpAppView<Payload>(options: McpAppViewOptions<Payload>) {
  const [payload, setPayload] = useState<Payload | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [hostContext, setHostContext] = useState<McpUiHostContext | undefined>();

  const { app, error: connectionError } = useApp({
    appInfo: { name: options.name, version: '1.0.0' },
    // The views fit inline and have a full screen button (the server asks hosts to open them full screen)
    capabilities: { availableDisplayModes: ['inline', 'fullscreen'] },
    onAppCreated: (createdApp) => {
      createdApp.ontoolresult = (result) => {
        if (result.isError) {
          setError(result.content?.find((item) => item.type === 'text')?.text ?? options.loadErrorMessage);
          return;
        }
        loadPayload(createdApp, result, options)
          .then(setPayload)
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

  return { app, payload, error: connectionError?.message ?? error, hostContext };
}

/** Adds the view's styles and renders it */
export function mountView(View: ComponentType, styles: string) {
  const style = document.createElement('style');
  style.textContent = styles;
  document.head.appendChild(style);

  // No StrictMode: it mounts the view twice, which connects to the host twice
  createRoot(document.getElementById('root')!).render(<View />);
}
