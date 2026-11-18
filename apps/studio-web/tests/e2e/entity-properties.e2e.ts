/** An entity's properties, edited in its card: the node shows them, and its connections stay drawn */
import type { Page } from '@playwright/test';
import { canvasEdges, expect, nodeLocator, openDiagram, screenMiddle, test } from './studio';

test.beforeEach(async ({ page }) => openDiagram(page, 'orders-entities-model.json', { level: 'messages' }));

/** Where Order's connection to Customer starts (its handle), and whether it's drawn */
const connection = async (page: Page) => {
  const [edge] = await canvasEdges(page);
  const drawn = await page.evaluate(
    (id) => !!document.querySelector(`.react-flow__edge[data-id="${id}"] path`)?.getAttribute('d'),
    edge?.id ?? ''
  );
  return { from: edge?.sourceHandle, drawn };
};

const openCard = async (page: Page) => {
  const at = await screenMiddle(page, 'order');
  await page.mouse.dblclick(at.x, at.y);
  const card = page.getByRole('dialog');
  await expect(card.getByText('Properties', { exact: true })).toBeVisible();
  return card;
};

test('properties are renamed, retyped, added and removed from the card, and shown on the node', async ({ page }) => {
  const card = await openCard(page);
  const order = nodeLocator(page, 'order');

  await card.getByLabel('Property type').nth(1).fill('uuid');
  await expect(order).toContainText('uuid');

  await card.getByRole('button', { name: 'Add property' }).click();
  await expect(card.getByLabel('Property name')).toHaveCount(3);
  await expect(order.locator('[data-handleid="property3-source"]')).toHaveCount(1);

  await card.getByRole('button', { name: 'Remove id' }).click();
  await expect(card.getByLabel('Property name')).toHaveCount(2);
  await expect(order.locator('[data-handleid="id-source"]')).toHaveCount(0);
});

test("a connection from a property follows it when it's renamed, and the entity when it's removed", async ({ page }) => {
  const order = nodeLocator(page, 'order');
  await expect.poll(() => connection(page)).toEqual({ from: 'customerId-source', drawn: true });
  const card = await openCard(page);

  await card.getByLabel('Property name').nth(1).fill('buyerId');
  await expect(order.locator('[data-handleid="buyerId-source"]')).toHaveCount(1);
  await expect.poll(() => connection(page)).toEqual({ from: 'buyerId-source', drawn: true });

  await card.getByRole('button', { name: 'Remove buyerId' }).click();
  await expect(order.locator('[data-handleid="buyerId-source"]')).toHaveCount(0);
  await expect.poll(() => connection(page)).toEqual({ from: '__entity-source', drawn: true });
});

test("a property can't be renamed to a name another property has", async ({ page }) => {
  const order = nodeLocator(page, 'order');
  const card = await openCard(page);
  const name = card.getByLabel('Property name').nth(1);

  await name.fill('id');
  await page.waitForTimeout(600);
  await expect(order.locator('[data-handleid="customerId-source"]')).toHaveCount(1);
  await expect.poll(() => connection(page)).toEqual({ from: 'customerId-source', drawn: true });
  // Left, it goes back to what it was
  await name.blur();
  await expect(name).toHaveValue('customerId');
});
