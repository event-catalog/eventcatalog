/**
 * The open diagram's end of the bridge (src/mcp/bridge.ts): it waits for what the agent asks of it (edit_diagram,
 * read_diagram), does it on what's on screen and answers. It waits with the diagram's view token (the server's, from
 * the tool result; nothing is kept here): only its views can take and answer those requests. While the page is hidden
 * it doesn't wait: what's asked meanwhile is done when it's back.
 */
import type { App } from '@modelcontextprotocol/ext-apps';
import type { Changes } from '../src/model/changes';

const WAIT_TOOL = 'wait_for_diagram_requests';
const ANSWER_TOOL = 'answer_diagram_request';

type Request = { id: string; kind: 'edit'; changes: Changes; reorder?: boolean } | { id: string; kind: 'read' };
export type DiagramBridgeHandlers = {
  edit: (changes: Changes, options?: { reorder?: boolean }) => Promise<Record<string, unknown>>;
  read: () => Record<string, unknown>;
};

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
const shown = () =>
  document.visibilityState !== 'hidden'
    ? Promise.resolve()
    : new Promise<void>((resolve) => {
        const onChange = () => {
          if (document.visibilityState === 'hidden') return;
          document.removeEventListener('visibilitychange', onChange);
          resolve();
        };
        document.addEventListener('visibilitychange', onChange);
      });

/** Waits for, does and answers what the agent asks of diagram `diagramId`, until stopped */
export function serveDiagram(app: App, diagramId: string, token: string, handlers: () => DiagramBridgeHandlers) {
  let stopped = false;
  let retryMs = 2000;

  const handle = async (request: Request) => {
    let answer: Record<string, unknown>;
    try {
      answer = request.kind === 'edit' ? await handlers().edit(request.changes, { reorder: request.reorder }) : handlers().read();
    } catch (error) {
      answer = { error: String((error as Error)?.message ?? error) };
    }
    await app.callServerTool({ name: ANSWER_TOOL, arguments: { diagramId, token, requestId: request.id, answer } }).catch(() => {});
  };

  void (async () => {
    while (!stopped) {
      await shown();
      if (stopped) break;
      try {
        const result = await app.callServerTool({ name: WAIT_TOOL, arguments: { diagramId, token } });
        // Refused (a server restarted with another key, or too many diagrams open): tried again, less often
        if (result.isError) throw new Error('Refused');
        const requests = (result.structuredContent as { requests?: Request[] } | undefined)?.requests ?? [];
        for (const request of requests) await handle(request);
        retryMs = 2000;
      } catch {
        // The server or the chat couldn't be reached (or an older server without the tool): tried again, less often
        await sleep(retryMs);
        retryMs = Math.min(retryMs * 2, 60_000);
      }
    }
  })();
  return () => {
    stopped = true;
  };
}
