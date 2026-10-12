/** Levels of detail: L1 and L2 are arranged on their own, and what's done there changes the canvas (L3) */
import type { Page } from '@playwright/test';
import { canvasNodes, dragOnto, expect, openDiagram, overlapping, parentsOf, select, settled, showLevel, test } from './studio';

/** How far anything moves when the level shown is reordered (its layout run again) */
async function reorderMoves(page: Page) {
  const before = new Map((await canvasNodes(page)).map((node) => [node.id, node]));
  await page.getByRole('button', { name: /^Reorder/ }).click();
  await settled(page);
  return Math.max(
    0,
    ...(await canvasNodes(page)).map((node) => {
      const was = before.get(node.id);
      return was ? Math.hypot(node.x - was.x, node.y - was.y) : 0;
    })
  );
}

test('a diagram opened at L1 shows L3 tidy the first time it goes there', async ({ page }) => {
  await openDiagram(page, 'orders-model.json', { level: 'overview' });
  await showLevel(page, 3);
  // Already laid out: reordering it moves nothing much
  expect(await reorderMoves(page)).toBeLessThan(40);
});

test('L1 and L2 are laid out as they are drawn the first time they are shown', async ({ page }) => {
  await openDiagram(page);
  for (const level of [1, 2] as const) {
    await showLevel(page, level);
    expect(await reorderMoves(page)).toBeLessThan(40);
  }
});

test('on L2, a system dragged into another container with a service selected takes both there, on the canvas too', async ({ page }) => {
  await openDiagram(page);
  await showLevel(page, 2);
  await select(page, ['payments', 'billing-service']);
  await dragOnto(page, 'payments', 'sales');

  const onLevel = await parentsOf(page, ['payments', 'billing-service']);
  expect(onLevel.payments).not.toBe('finance');
  expect(onLevel['billing-service']).toBe(onLevel.payments);
  expect(overlapping(await canvasNodes(page))).toEqual([]);

  await showLevel(page, 3);
  expect(await parentsOf(page, ['payments', 'billing-service'])).toEqual(onLevel);
  expect(overlapping(await canvasNodes(page))).toEqual([]);
});
