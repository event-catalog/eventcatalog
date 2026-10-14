/**
 * Helpers for the browser tests: open a diagram from a fixture, read the canvas (through the hook StudioCanvas sets
 * up when `window.__studioTest` exists before the page loads), and work it with the real mouse and keyboard.
 */
import { readFileSync } from 'node:fs';
import { test as base, expect, type Page } from '@playwright/test';
import LZString from 'lz-string';

/**
 * Playwright's test, failing any test where the page broke its Content-Security-Policy (something it does was
 * blocked: the policy is too tight, or something ran that shouldn't)
 */
export const test = base.extend<{ contentSecurityPolicy: void }>({
  contentSecurityPolicy: [
    async ({ page }, use) => {
      const violations: string[] = [];
      page.on('console', (message) => /Content.Security.Policy/i.test(message.text()) && violations.push(message.text()));
      await use();
      expect(violations).toEqual([]);
    },
    { auto: true },
  ],
});
export { expect };

export type CanvasNode = { id: string; type?: string; parentId?: string; measured: boolean; x: number; y: number; width: number; height: number };
type Hook = { level?: () => number; nodes?: () => CanvasNode[] };

const fixture = (name: string) => JSON.parse(readFileSync(new URL(`../fixtures/${name}`, import.meta.url), 'utf8'));

/** Opens a diagram of a fixture's model (at a level: overview, services or messages), once it's drawn and still */
export async function openDiagram(page: Page, name = 'orders-model.json', { level }: { level?: 'overview' | 'services' | 'messages' } = {}) {
  await page.addInitScript(() => {
    (window as { __studioTest?: Hook }).__studioTest = {};
  });
  const params = new URLSearchParams({ m: LZString.compressToEncodedURIComponent(JSON.stringify(fixture(name))) });
  if (level) params.set('l', level);
  await page.goto(`/view#${params}`);
  await settled(page);
  // Opening a link plays the agent building it, over the canvas: done when the canvas is what's under the pointer
  await expect
    .poll(
      () =>
        page.evaluate(() => {
          const node = document.querySelector('.react-flow__node');
          const box = node?.getBoundingClientRect();
          return !!box && !!document.elementFromPoint(box.x + box.width / 2, box.y + box.height / 2)?.closest('.react-flow__node');
        }),
      { timeout: 20_000 }
    )
    .toBe(true);
  await settled(page);
}

/** What's on the level shown, placed on the canvas */
export const canvasNodes = (page: Page) => page.evaluate(() => (window as { __studioTest?: Hook }).__studioTest?.nodes?.() ?? []);

export const nodeById = async (page: Page, id: string) => {
  const node = (await canvasNodes(page)).find((candidate) => candidate.id === id);
  if (!node) throw new Error(`${id} isn't on the canvas`);
  return node;
};

/** Waits until everything's drawn and nothing's moved for a moment (a build playing, a glide, a layout) */
export async function settled(page: Page) {
  let previous = '';
  await expect
    .poll(
      async () => {
        const nodes = await canvasNodes(page);
        // As drawn too: after a layout they glide there, while the canvas already has them where they end up
        const drawn = await page.evaluate(() => ({
          gliding: !!document.querySelector('.is-layout-transition'),
          boxes: [...document.querySelectorAll('.react-flow__node')].map((element) => {
            const box = element.getBoundingClientRect();
            return [Math.round(box.x), Math.round(box.y), Math.round(box.width), Math.round(box.height)];
          }),
        }));
        const now = JSON.stringify([nodes.map(({ id, parentId, x, y, width, height }) => [id, parentId, Math.round(x), Math.round(y), Math.round(width), Math.round(height)]), drawn.boxes]);
        const still = nodes.length > 0 && nodes.every((node) => node.measured) && !drawn.gliding && now === previous;
        previous = now;
        return still;
      },
      { intervals: [250], timeout: 15_000 }
    )
    .toBe(true);
}

export const nodeLocator = (page: Page, id: string) => page.locator(`.react-flow__node[data-id="${id}"]`);

/** Where to hold a node: a container by its header, anything else in its middle */
async function grabPoint(page: Page, id: string) {
  const box = (await nodeLocator(page, id).boundingBox())!;
  const node = await nodeById(page, id);
  const isContainer = node.type?.endsWith('-group');
  return { box, at: isContainer ? { x: box.x + Math.min(60, box.width / 2), y: box.y + 14 } : { x: box.x + box.width / 2, y: box.y + box.height / 2 } };
}

/** Selects nodes the way people do: a click on the first, shift-click on the rest */
export async function select(page: Page, ids: string[]) {
  for (const [index, id] of ids.entries()) {
    const { at } = await grabPoint(page, id);
    if (index) await page.keyboard.down('Shift');
    await page.mouse.click(at.x, at.y);
    if (index) await page.keyboard.up('Shift');
  }
  await expect(page.locator('.react-flow__node.selected')).toHaveCount(ids.length);
}

/** Drags a node (with whatever's selected with it) so its middle ends on another node's middle (or a screen point) */
export async function dragOnto(page: Page, id: string, onto: string | { x: number; y: number }) {
  const { box, at } = await grabPoint(page, id);
  const middle = { x: box.x + box.width / 2, y: box.y + box.height / 2 };
  const target = typeof onto === 'string' ? await screenMiddle(page, onto) : onto;
  const end = { x: at.x + target.x - middle.x, y: at.y + target.y - middle.y };
  await page.mouse.move(at.x, at.y);
  await page.mouse.down();
  await page.mouse.move(end.x, end.y, { steps: 20 });
  await page.mouse.up();
  await settled(page);
}

export async function screenMiddle(page: Page, id: string) {
  const box = (await nodeLocator(page, id).boundingBox())!;
  return { x: box.x + box.width / 2, y: box.y + box.height / 2 };
}

/** Pairs of nodes drawn on top of each other (not a container and what's in it) */
export function overlapping(nodes: CanvasNode[]) {
  const lookup = new Map(nodes.map((node) => [node.id, node]));
  const within = (node: CanvasNode, ancestor: string) => {
    for (let id = node.parentId; id; id = lookup.get(id)?.parentId) if (id === ancestor) return true;
    return false;
  };
  const pairs: string[] = [];
  nodes.forEach((a, index) =>
    nodes.slice(index + 1).forEach((b) => {
      if (within(a, b.id) || within(b, a.id)) return;
      if (a.x < b.x + b.width && b.x < a.x + a.width && a.y < b.y + b.height && b.y < a.y + a.height) pairs.push(`${a.id} / ${b.id}`);
    })
  );
  return pairs;
}

/** Goes to a level with its button in the toolbar */
export async function showLevel(page: Page, level: 1 | 2 | 3) {
  await page.getByRole('group', { name: 'Level of detail' }).getByRole('button', { name: new RegExp(`^Level ${level}:`) }).click();
  await expect.poll(() => page.evaluate(() => (window as { __studioTest?: Hook }).__studioTest?.level?.())).toBe(level);
  await settled(page);
}

export const parentsOf = async (page: Page, ids: string[]) => {
  const nodes = await canvasNodes(page);
  return Object.fromEntries(ids.map((id) => [id, nodes.find((node) => node.id === id)?.parentId ?? null]));
};
