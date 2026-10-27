/** The canvas's right-click menu */
import type { Page } from '@playwright/test';
import { expect, openDiagram, test } from './studio';

test.beforeEach(async ({ page }) => openDiagram(page));

/**
 * Empty canvas (what's under the pointer) near a point by an edge: along the edge from it (`step`), and a little in
 * from the edge (`inward`) where connections run along it
 */
async function emptyCanvasNear(page: Page, from: { x: number; y: number }, step: { x: number; y: number }, inward: { x: number; y: number }) {
  for (let depth = 0; depth < 8; depth++) {
    for (let i = 0; i < 40; i++) {
      const at = { x: from.x + step.x * i + inward.x * depth, y: from.y + step.y * i + inward.y * depth };
      const onPane = await page.evaluate(({ x, y }) => !!document.elementFromPoint(x, y)?.classList.contains('react-flow__pane'), at);
      if (onPane) return at;
    }
  }
  throw new Error(`no empty canvas near ${JSON.stringify(from)}`);
}

test('the menu opens inside the window, wherever the canvas is right clicked', async ({ page }) => {
  const { width, height } = page.viewportSize()!;
  // By the right edge, the bottom edge, and the bottom right corner (left of the legend)
  for (const at of [
    await emptyCanvasNear(page, { x: width - 12, y: height / 2 }, { x: 0, y: 8 }, { x: -6, y: 0 }),
    await emptyCanvasNear(page, { x: width / 2, y: height - 12 }, { x: 8, y: 0 }, { x: 0, y: -6 }),
    await emptyCanvasNear(page, { x: width - 240, y: height - 12 }, { x: -8, y: 0 }, { x: 0, y: -6 }),
  ]) {
    await page.mouse.click(at.x, at.y, { button: 'right' });
    const menu = page.getByRole('menu');
    await expect(menu).toBeVisible();
    const box = (await menu.boundingBox())!;
    expect(box.x).toBeGreaterThanOrEqual(0);
    expect(box.y).toBeGreaterThanOrEqual(0);
    expect(box.x + box.width).toBeLessThanOrEqual(width);
    expect(box.y + box.height).toBeLessThanOrEqual(height);
    await page.keyboard.press('Escape');
    await expect(menu).toBeHidden();
  }
});
