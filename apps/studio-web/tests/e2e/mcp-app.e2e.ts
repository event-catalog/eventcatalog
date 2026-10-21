/**
 * The view as a chat shows it, end to end: a host (this test, with the MCP Apps SDK's own AppBridge and a real MCP
 * client to the built server) loads the view into an iframe as Claude or ChatGPT does, hands it the agent's
 * render_architecture result, and relays its tool calls to the server. Then the agent (a second client, as the
 * model's calls come on their own connection) changes the diagram with edit_diagram, and the change has to show in
 * that same view, in place: no new view, what was there where it was, the new service inside its new domain.
 */
import { readFileSync } from 'node:fs';
import type { Page } from '@playwright/test';
import { Client, StreamableHTTPClientTransport } from '@modelcontextprotocol/client';
import { AppBridge } from '@modelcontextprotocol/ext-apps/app-bridge';
import { test, expect, type CanvasNode } from './studio';

const model = JSON.parse(readFileSync(new URL('../fixtures/orders-model.json', import.meta.url), 'utf8'));
const textOf = (result: unknown) => JSON.parse((result as { content: { text: string }[] }).content[0].text);

async function connect(baseURL: string) {
  const client = new Client({ name: 'e2e-host', version: '1.0.0' });
  await client.connect(new StreamableHTTPClientTransport(new URL('/mcp', baseURL)));
  return client;
}

/** The host: the view in an iframe on `page`, its messages relayed to and from an AppBridge on `client` */
async function hostView(page: Page, client: Client, html: string) {
  await page.goto('/health');
  await page.setContent('<iframe id="view" style="width:1400px;height:900px;border:0"></iframe>');
  type Message = Parameters<NonNullable<AppBridgeTransport['onmessage']>>[0];
  type AppBridgeTransport = Parameters<AppBridge['connect']>[0];
  const transport: AppBridgeTransport = {
    start: async () => {},
    close: async () => {},
    send: async (message: Message) => {
      await page.evaluate((sent) => document.querySelector('iframe')!.contentWindow!.postMessage(sent, '*'), message as object);
    },
  };
  await page.exposeFunction('__toHost', (message: Message) => transport.onmessage?.(message));
  await page.evaluate(() =>
    window.addEventListener('message', (event) => {
      if (event.source === document.querySelector('iframe')!.contentWindow) (window as unknown as { __toHost: (data: unknown) => void }).__toHost(event.data);
    })
  );

  const contexts: string[] = [];
  const bridge = new AppBridge(
    client,
    { name: 'e2e-host', version: '1.0.0' },
    { serverTools: {}, openLinks: {}, updateModelContext: { text: {} } },
    { hostContext: { theme: 'light', displayMode: 'inline', availableDisplayModes: ['inline', 'fullscreen'] } }
  );
  bridge.onupdatemodelcontext = async (params) => {
    contexts.push(JSON.stringify(params));
    return {};
  };
  const initialized = new Promise<void>((resolve) => (bridge.oninitialized = () => resolve()));
  await bridge.connect(transport);
  // The canvas's test hook, set up before the view loads (as the other browser tests do)
  await page.evaluate((page) => (document.querySelector('iframe')!.srcdoc = page), html.replace('<head>', '<head><script>window.__studioTest = {}</script>'));
  await initialized;
  const frame = () => page.frames().find((frame) => frame !== page.mainFrame())!;
  const nodes = () => frame().evaluate(() => ((window as unknown as { __studioTest: { nodes?: () => CanvasNode[] } }).__studioTest.nodes?.() ?? []));
  return { bridge, contexts, nodes };
}

/** Waits until nothing on the canvas moves for a moment (layouts glide things into place) */
async function settledNodes(nodes: () => Promise<CanvasNode[]>) {
  let last = '';
  await expect
    .poll(async () => {
      const now = JSON.stringify((await nodes()).map((node) => [node.id, Math.round(node.x), Math.round(node.y)]));
      const still = now === last;
      last = now;
      return still;
    }, { timeout: 20_000, intervals: [500] })
    .toBe(true);
}

const inside = (inner: CanvasNode, outer: CanvasNode) =>
  inner.x >= outer.x && inner.y >= outer.y && inner.x + inner.width <= outer.x + outer.width + 1 && inner.y + inner.height <= outer.y + outer.height + 1;

test('the agent changes the diagram the user has open, in place', async ({ page, baseURL }) => {
  test.setTimeout(90_000);
  const host = await connect(baseURL!);
  const agent = await connect(baseURL!);

  // The agent shows a diagram; the chat shows it in the view
  const rendered = await agent.callTool({ name: 'render_architecture', arguments: { model } });
  const { diagramId } = textOf(rendered);
  expect(diagramId).toMatch(/^[0-9a-f]{32}$/);
  const resource = await host.readResource({ uri: 'ui://eventcatalog/architecture' });
  const { bridge, contexts, nodes } = await hostView(page, host, (resource.contents[0] as { text: string }).text);
  await bridge.sendToolInput({ arguments: { model } });
  await bridge.sendToolResult(rendered as Parameters<AppBridge['sendToolResult']>[0]);

  // Drawn, its build played (the agent's pointer building it up, over the canvas) and tidied: every resource on the
  // canvas, measured, and nothing moving
  const view = page.frameLocator('#view');
  await expect.poll(async () => (await nodes()).filter((node) => node.measured).length, { timeout: 30_000 }).toBeGreaterThanOrEqual(model.resources.length);
  await expect(view.locator('.ec-build-skip')).toHaveCount(0, { timeout: 60_000 });
  await settledNodes(nodes);
  const before = new Map((await nodes()).map((node) => [node.id, node]));
  // How far the canvas is zoomed (the viewport's scale)
  const zoom = async () => Number((await view.locator('.react-flow__viewport').getAttribute('style'))?.match(/scale\(([\d.]+)\)/)?.[1] ?? 1);
  const zoomBefore = await zoom();

  // The agent adds a domain with a service in it, receiving an event, by its id, with just the changes
  const event = model.resources.find((resource: { type: string }) => resource.type === 'event');
  const edited = textOf(
    await agent.callTool({
      name: 'edit_diagram',
      arguments: {
        diagramId,
        changes: [
          { op: 'add_resource', resource: { id: 'billing', type: 'domain', name: 'Billing' } },
          { op: 'add_resource', resource: { id: 'invoice-service', type: 'service', name: 'Invoice Service', parent: 'billing', summary: 'Invoices orders.' } },
          { op: 'add_relation', relation: { from: 'invoice-service', to: event.id, kind: 'receives' } },
          { op: 'add_relation', relation: { from: 'nowhere', to: 'billing', kind: 'connects' } },
        ],
      },
    })
  );
  expect(edited.note).toContain('Made 3 of 4 changes');
  expect(edited.failed).toEqual([expect.objectContaining({ index: 3, op: 'add_relation' })]);

  // In the same view: the new service inside its new domain, and what was there where it was
  await expect.poll(async () => (await nodes()).some((node) => node.id === 'invoice-service' && node.measured), { timeout: 10_000 }).toBe(true);
  await settledNodes(nodes);
  // Shown on the canvas itself (no build played over it for an edit)
  await expect(view.locator('.ec-build-skip')).toHaveCount(0);
  await expect(view.locator('.react-flow__node[data-id="invoice-service"]')).toBeVisible();
  // With their icons (the view's build keeps only the icons it uses: scripts/build-view.mjs)
  await expect(view.locator('.react-flow__node[data-id="invoice-service"] svg').first()).toBeVisible();
  await expect(view.locator('.react-flow__node[data-id="billing"] svg').first()).toBeVisible();
  const after = new Map((await nodes()).map((node) => [node.id, node]));
  const service = after.get('invoice-service')!;
  expect(service.parentId).toBe('billing');
  expect(inside(service, after.get('billing')!)).toBe(true);
  for (const [id, node] of before) {
    if (node.parentId) continue; // things in containers move with them
    expect({ id, x: Math.round(after.get(id)!.x), y: Math.round(after.get(id)!.y) }).toEqual({ id, x: Math.round(node.x), y: Math.round(node.y) });
  }
  expect(page.frames()).toHaveLength(2);
  // The new domain fits what's in it (not a big, mostly empty box), and the agent's change took nobody's selection
  // or zoomed in on it
  const domain = after.get('billing')!;
  // (from its default size it was 720 × 460, around one service)
  expect(domain.width).toBeLessThan(service.width + 200);
  expect(domain.height).toBeLessThan(service.height + 200);
  await expect(view.locator('.react-flow__node.selected')).toHaveCount(0);
  expect(await zoom()).toBeLessThanOrEqual(zoomBefore + 0.01);

  // The agent reads it as it is now, from the view (without where things are)
  const read = textOf(await agent.callTool({ name: 'read_diagram', arguments: { diagramId } }));
  expect(read.model.resources.some((resource: { id: string }) => resource.id === 'invoice-service')).toBe(true);
  expect(read.model.layout).toBeUndefined();

  // And the model's context names the diagram, to change it by
  await expect.poll(() => contexts.some((context) => context.includes(diagramId) && context.includes('edit_diagram'))).toBe(true);

  await host.close();
  await agent.close();
});
