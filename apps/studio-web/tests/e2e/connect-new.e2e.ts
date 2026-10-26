/** A connection let go of on empty canvas: a placeholder there, what it is chosen from a list beside it, and its card opened to name it */
import type { Page } from '@playwright/test';
import { canvasNodes, expect, nodeLocator, openDiagram, settled, test } from './studio';

test.beforeEach(async ({ page }) => openDiagram(page, 'orders-model.json', { level: 'messages' }));

const edgeCount = (page: Page) => page.locator('.react-flow__edge').count();

/** Drags a connection out of a node's source handle to empty canvas, away from the node, and lets go of it (or not) */
async function dragOutConnection(page: Page, id: string, { release = true } = {}) {
  const handle = nodeLocator(page, id).locator('.react-flow__handle.source').first();
  const box = (await handle.boundingBox())!;
  const from = { x: box.x + box.width / 2, y: box.y + box.height / 2 };
  let to: { x: number; y: number } | undefined;
  for (let dy = 0; dy < 400 && !to; dy += 20)
    for (const dx of [180, 220, 260, 300, 340]) {
      const at = { x: from.x + dx, y: from.y + dy };
      const onPane = await page.evaluate(({ x, y }) => !!document.elementFromPoint(x, y)?.classList.contains('react-flow__pane'), at);
      if (onPane) {
        to = at;
        break;
      }
    }
  if (!to) throw new Error(`no empty canvas beside ${id}`);
  await page.mouse.move(from.x, from.y);
  await page.mouse.down();
  await page.mouse.move(to.x, to.y, { steps: 15 });
  if (release) await page.mouse.up();
  return to;
}

test('choosing what a connection let go of on empty canvas makes adds it there, connected, its card open, in one undo', async ({ page }) => {
  const before = (await canvasNodes(page)).map((node) => node.id);
  const edgesBefore = await edgeCount(page);

  const to = await dragOutConnection(page, 'orders-service');
  const list = page.getByRole('dialog', { name: 'Connect to something new' });
  await expect(list).toBeVisible();
  // The placeholder is where it was let go of, connected to the service (dashed), suggesting what EventCatalog has words for
  const placeholder = nodeLocator(page, 'connect-placeholder');
  await expect(placeholder).toBeVisible();
  await expect(placeholder).toContainText('New node');
  // (once it's popped in: the pop-in scales where it is too)
  await expect.poll(async () => Math.abs((await placeholder.boundingBox())!.x - to.x)).toBeLessThan(2);
  const placed = (await placeholder.boundingBox())!;
  await expect(page.locator('.react-flow__edge[data-id="connect-placeholder-edge"]')).toHaveCount(1);
  await expect(list.getByRole('option', { name: /Event/ }).first()).toContainText('publishes event');

  // Picked out as it's typed: the placeholder says what it'll be
  await page.keyboard.type('event');
  await expect(placeholder).toContainText('New Event');
  await page.keyboard.press('Enter');
  await expect(list).toBeHidden();
  await expect(placeholder).toHaveCount(0);
  // Its card opens, ready to name it
  const card = page.getByRole('dialog');
  await expect(card).toBeVisible();
  const name = card.locator('input, textarea').first();
  await expect(name).toBeFocused();
  await expect(name).toHaveValue('');
  await settled(page);

  const added = (await canvasNodes(page)).filter((node) => !before.includes(node.id));
  expect(added.map((node) => node.type)).toEqual(['event']);
  // Where the placeholder was
  const shown = (await nodeLocator(page, added[0].id).boundingBox())!;
  expect(Math.abs(shown.x - placed.x)).toBeLessThan(40);
  await expect.poll(() => edgeCount(page)).toBe(edgesBefore + 1);

  // One undo takes back both the node and its connection
  await page.locator('.react-flow__pane').click({ position: { x: 5, y: 5 } });
  await expect(card).toBeHidden();
  // Nothing typed: it keeps the name it was made with
  await expect(nodeLocator(page, added[0].id)).toContainText('NewEvent');
  await page.keyboard.press('Control+z');
  await expect.poll(async () => (await canvasNodes(page)).map((node) => node.id).sort()).toEqual([...before].sort());
  await expect.poll(() => edgeCount(page)).toBe(edgesBefore);
});

test('letting go of a connection on a node makes nothing new', async ({ page }) => {
  await dragOutConnection(page, 'orders-service', { release: false });
  const over = (await nodeLocator(page, 'OrderPlaced').boundingBox())!;
  await page.mouse.move(over.x + over.width / 2, over.y + over.height - 6, { steps: 10 });
  await page.mouse.up();
  await expect(page.getByRole('dialog', { name: 'Connect to something new' })).toHaveCount(0);
  await expect(nodeLocator(page, 'connect-placeholder')).toHaveCount(0);
});

test('Escape (or a click away) leaves the canvas as it was', async ({ page }) => {
  const before = (await canvasNodes(page)).length;
  const edgesBefore = await edgeCount(page);
  await dragOutConnection(page, 'orders-service');
  await expect(page.getByRole('dialog', { name: 'Connect to something new' })).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog', { name: 'Connect to something new' })).toBeHidden();
  await expect(nodeLocator(page, 'connect-placeholder')).toHaveCount(0);

  await dragOutConnection(page, 'orders-service');
  await page.mouse.click(5, 300);
  await expect(page.getByRole('dialog', { name: 'Connect to something new' })).toBeHidden();
  expect((await canvasNodes(page)).length).toBe(before);
  expect(await edgeCount(page)).toBe(edgesBefore);
});

test('dragging the end of a connection already there onto empty canvas leaves it as it was', async ({ page }) => {
  const edgesBefore = await edgeCount(page);
  const end = page.locator('.react-flow__edgeupdater-target').first();
  const box = (await end.boundingBox())!;
  const from = { x: box.x + box.width / 2, y: box.y + box.height / 2 };
  let to: { x: number; y: number } | undefined;
  for (let dy = 0; dy < 400 && !to; dy += 20)
    for (const dx of [180, 220, 260, 300, 340]) {
      const at = { x: from.x + dx, y: from.y + dy };
      const onPane = await page.evaluate(({ x, y }) => !!document.elementFromPoint(x, y)?.classList.contains('react-flow__pane'), at);
      if (onPane) {
        to = at;
        break;
      }
    }
  if (!to) throw new Error('no empty canvas beside the connection');
  await page.mouse.move(from.x, from.y);
  await page.mouse.down();
  await page.mouse.move(to.x, to.y, { steps: 15 });
  await page.mouse.up();
  await expect(page.getByRole('dialog', { name: 'Connect to something new' })).toHaveCount(0);
  await expect(nodeLocator(page, 'connect-placeholder')).toHaveCount(0);
  expect(await edgeCount(page)).toBe(edgesBefore);
});
