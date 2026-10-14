/**
 * What the page does beyond the canvas, under its Content-Security-Policy (each test fails on anything it blocks):
 * exporting an image, and starting a live session (the relay's WebSocket)
 */
import { expect, openDiagram, test } from './studio';

test.beforeEach(async ({ page }) => openDiagram(page));

test('the diagram exports as an image', async ({ page }) => {
  await page.getByRole('button', { name: 'Menu' }).click();
  const download = page.waitForEvent('download');
  await page.getByRole('menuitem', { name: /^Export image/ }).click();
  expect((await download).suggestedFilename()).toMatch(/\.png$/);
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
