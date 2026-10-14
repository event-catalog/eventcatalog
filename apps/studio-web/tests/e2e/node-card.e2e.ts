/** A node's card: how it's edited on the canvas */
import { expect, nodeLocator, openDiagram, screenMiddle, test } from './studio';

test.beforeEach(async ({ page }) => openDiagram(page));

test('double-clicking a node opens its card, ready to type in its first field', async ({ page }) => {
  const at = await screenMiddle(page, 'orders-service');
  await page.mouse.dblclick(at.x, at.y);

  const card = page.getByRole('dialog');
  await expect(card).toBeVisible();
  await expect(card.locator('input, textarea').first()).toBeFocused();
});

test('what is typed in the card changes the node, and it is kept when the card closes', async ({ page }) => {
  const at = await screenMiddle(page, 'orders-service');
  await page.mouse.dblclick(at.x, at.y);
  const card = page.getByRole('dialog');
  const name = card.locator('input, textarea').first();
  await expect(name).toBeFocused();

  await name.fill('Checkout Service');
  await expect(nodeLocator(page, 'orders-service')).toContainText('Checkout Service');
  // Closed by pressing anywhere else
  await page.mouse.click(page.viewportSize()!.width - 40, page.viewportSize()!.height / 2);
  await expect(card).toBeHidden();
  await expect(nodeLocator(page, 'orders-service')).toContainText('Checkout Service');
});

test('Escape in a field puts back what was there, and Escape again closes the card', async ({ page }) => {
  const at = await screenMiddle(page, 'orders-service');
  await page.mouse.dblclick(at.x, at.y);
  const card = page.getByRole('dialog');
  const name = card.locator('input, textarea').first();
  await expect(name).toBeFocused();

  await name.fill('Something else');
  await page.keyboard.press('Escape');
  await expect(nodeLocator(page, 'orders-service')).toContainText('Orders Service');
  await expect(card).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(card).toBeHidden();
});
