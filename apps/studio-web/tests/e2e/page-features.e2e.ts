/**
 * What the page does beyond the canvas, under its Content-Security-Policy (each test fails on anything it blocks):
 * exporting an image or the model, and starting a live session (the relay's WebSocket)
 */
import { expect, openDiagram, test } from './studio';

test.beforeEach(async ({ page }) => openDiagram(page));

test('the diagram exports as an image', async ({ page }) => {
  await page.getByRole('button', { name: 'Menu' }).click();
  await page.getByRole('menuitem', { name: /^Export…/ }).click();
  const download = page.waitForEvent('download');
  await page.getByRole('button', { name: /^As an image/ }).click();
  expect((await download).suggestedFilename()).toMatch(/\.png$/);
});

test("the diagram's model exports to the clipboard", async ({ page, context }) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write']);
  await page.getByRole('button', { name: 'Menu' }).click();
  await page.getByRole('menuitem', { name: /^Export…/ }).click();
  await page.getByRole('button', { name: /^Export model/ }).click();
  await expect(page.getByRole('status').filter({ hasText: 'Model copied to your clipboard' })).toBeVisible();
  const copied = JSON.parse(await page.evaluate(() => navigator.clipboard.readText()));
  expect(copied.model.resources.length).toBeGreaterThan(0);
});

test('a live session connects to the relay', async ({ page }) => {
  await page.getByRole('button', { name: 'Menu' }).click();
  await page.getByRole('menuitem', { name: /^Live collaboration/ }).click();
  const socket = page.waitForEvent('websocket', (candidate) => candidate.url().includes('/rooms/'));
  await page.getByRole('button', { name: 'Start session' }).click();
  const relay = await socket;
  expect(relay.isClosed()).toBe(false);
  await expect(page).toHaveURL(/#room=/);
});
