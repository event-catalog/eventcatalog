/** A channel's card: its type, and making it a dead letter channel */
import { expect, nodeLocator, openDiagram, screenMiddle, test } from './studio';

test.beforeEach(async ({ page }) => openDiagram(page, 'orders-model.json', { level: 'messages' }));

test("picking a channel's type and making it a dead letter channel shows on the channel", async ({ page }) => {
  const channel = nodeLocator(page, 'orders-topic');
  await expect(channel).toBeVisible();
  const at = await screenMiddle(page, 'orders-topic');
  await page.mouse.dblclick(at.x, at.y);
  const card = page.getByRole('dialog');
  await expect(card).toBeVisible();

  await card.getByRole('radio', { name: 'Stream' }).click();
  await expect(card.getByRole('radio', { name: 'Stream' })).toHaveAttribute('aria-checked', 'true');
  await expect(channel).toContainText('Stream');

  await card.getByRole('checkbox', { name: /Dead letter channel/ }).check();
  await expect(channel).toContainText('Dead Letter Stream');

  // Kept when the card closes
  await page.keyboard.press('Escape');
  await expect(card).toBeHidden();
  await expect(channel).toContainText('Dead Letter Stream');
});
