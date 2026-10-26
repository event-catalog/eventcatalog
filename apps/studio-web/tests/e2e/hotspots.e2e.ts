/** Hotspots: flagged on the canvas, opened from their marker, closed by clicking anywhere else */
import type { Page } from '@playwright/test';
import { expect, openDiagram, screenMiddle, test } from './studio';

test.beforeEach(async ({ page }) => openDiagram(page));

/** Somewhere on the canvas with nothing on it */
const emptySpot = (page: Page) => ({ x: page.viewportSize()!.width - 60, y: page.viewportSize()!.height / 2 });

/** Flags a hotspot at an empty spot on the canvas, and returns its marker */
async function flagHotspot(page: Page) {
  await page.keyboard.press('a');
  const at = emptySpot(page);
  await page.mouse.click(at.x, at.y);
  await page.getByPlaceholder('What should people know? e.g. Single point of failure').fill('Single point of failure');
  await page.getByRole('button', { name: 'Add hotspot' }).click();
  const marker = page.locator('button[aria-expanded][title*="Single point of failure"]');
  await expect(marker).toBeVisible();
  return marker;
}

test('an open hotspot closes when the canvas is clicked anywhere else', async ({ page }) => {
  const marker = await flagHotspot(page);
  // Flagging it leaves it closed: open it
  if ((await marker.getAttribute('aria-expanded')) !== 'true') await marker.click();
  await expect(marker).toHaveAttribute('aria-expanded', 'true');

  const elsewhere = { x: emptySpot(page).x, y: emptySpot(page).y + 200 };
  await page.mouse.click(elsewhere.x, elsewhere.y);
  await expect(marker).toHaveAttribute('aria-expanded', 'false');
});

test('an open hotspot closes when a node is clicked', async ({ page }) => {
  const marker = await flagHotspot(page);
  if ((await marker.getAttribute('aria-expanded')) !== 'true') await marker.click();
  await expect(marker).toHaveAttribute('aria-expanded', 'true');

  const node = await screenMiddle(page, 'orders-service');
  await page.mouse.click(node.x, node.y);
  await expect(marker).toHaveAttribute('aria-expanded', 'false');
});
