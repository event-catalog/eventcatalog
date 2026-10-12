/** Dragging into and out of containers (domains and systems) on the canvas (L3) */
import type { Page } from '@playwright/test';
import { canvasNodes, dragOnto, expect, openDiagram, overlapping, parentsOf, select, settled, test } from './studio';

test.beforeEach(async ({ page }) => openDiagram(page));

/** A point on the canvas with nothing near it (clear of the palette, toolbar and controls) */
async function emptySpot(page: Page) {
  const boxes = await page.locator('.react-flow__node').evaluateAll((elements) => elements.map((element) => element.getBoundingClientRect().toJSON() as DOMRect));
  const viewport = page.viewportSize()!;
  for (let y = 160; y < viewport.height - 160; y += 40) {
    for (let x = viewport.width - 200; x > 420; x -= 40) {
      if (boxes.every((box) => x < box.left - 160 || x > box.right + 160 || y < box.top - 80 || y > box.bottom + 80)) return { x, y };
    }
  }
  throw new Error('no empty spot on the canvas');
}

test('a selection dropped in a container all goes in it, in free space', async ({ page }) => {
  const dropped = ['PlaceOrder', 'GetStock', 'orders-topic'];
  await select(page, dropped);
  // Only the node held is over the container: the others come with it
  await dragOnto(page, 'PlaceOrder', 'orders-service');

  expect(await parentsOf(page, dropped)).toEqual({ PlaceOrder: 'ordering', GetStock: 'ordering', 'orders-topic': 'ordering' });
  expect(overlapping(await canvasNodes(page))).toEqual([]);
});

test('one undo takes the whole drop back', async ({ page }) => {
  const dropped = ['PlaceOrder', 'GetStock', 'orders-topic'];
  await select(page, dropped);
  await dragOnto(page, 'PlaceOrder', 'orders-service');
  expect(Object.values(await parentsOf(page, dropped))).toEqual(['ordering', 'ordering', 'ordering']);

  // (Studio takes Ctrl+Z as well as ⌘Z; headless Chromium on macOS doesn't send ⌘ shortcuts on)
  await page.keyboard.press('Control+z');
  await settled(page);
  expect(await parentsOf(page, dropped)).toEqual({ PlaceOrder: null, GetStock: null, 'orders-topic': null });
});

test('a node dropped on one in a container goes beside it', async ({ page }) => {
  await dragOnto(page, 'GetStock', 'inventory-service');

  expect(await parentsOf(page, ['GetStock'])).toEqual({ GetStock: 'ordering' });
  expect(overlapping(await canvasNodes(page))).toEqual([]);
});

test('dragging the held node out of its container brings the selection out with it', async ({ page }) => {
  await select(page, ['orders-service', 'inventory-service']);
  await dragOnto(page, 'orders-service', await emptySpot(page));

  expect(await parentsOf(page, ['orders-service', 'inventory-service'])).toEqual({ 'orders-service': null, 'inventory-service': null });
});

test('moving a selection inside its container keeps it there', async ({ page }) => {
  await select(page, ['orders-service', 'inventory-service']);
  const box = (await page.locator('.react-flow__node[data-id="orders-service"]').boundingBox())!;
  await dragOnto(page, 'orders-service', { x: box.x + box.width / 2 + 20, y: box.y + box.height / 2 + 10 });

  expect(await parentsOf(page, ['orders-service', 'inventory-service'])).toEqual({ 'orders-service': 'ordering', 'inventory-service': 'ordering' });
});
