/** What agents write on the diagram (edit_diagram's add_note): on the level shown, by what it's about there */
import { expect, nodeLocator, openDiagram, showLevel, test } from './studio';
import type { Locator, Page } from '@playwright/test';

type Edit = (changes: unknown[]) => Promise<{ results: { ok: boolean }[] }>;
const edit = (page: Page, changes: unknown[]) =>
  page.evaluate((changes) => (window as unknown as { __studioTest: { edit: Edit } }).__studioTest.edit(changes), changes);

test('text and notes an agent writes on L2 go by where their resource is on L2, not on the canvas', async ({ page }) => {
  await openDiagram(page);
  await showLevel(page, 2);
  const made = await edit(page, [
    { op: 'add_note', note: { text: 'Ordering', kind: 'text', fontSize: 40, resource: 'orders-service' } },
    { op: 'add_note', note: { text: 'Hot', kind: 'text', resource: 'inventory-service' } },
    { op: 'add_note', note: { text: 'Owns the order', resource: 'orders-service' } },
  ]);
  expect(made.results.every((result) => result.ok)).toBe(true);

  const text = page.locator('.react-flow__node-text', { hasText: 'Ordering' });
  const label = page.locator('.react-flow__node-text', { hasText: 'Hot' });
  const note = page.locator('.react-flow__node-note', { hasText: 'Owns the order' });
  await expect(text).toBeVisible();
  await expect(note).toBeVisible();
  // How far text is from centred over a node, and how far over it it is (once it's drawn: it fades in)
  const offOver = async (written: Locator, id: string) => {
    const [box, over] = await Promise.all([written.boundingBox(), nodeLocator(page, id).boundingBox()]);
    return { across: Math.round(Math.abs(box!.x + box!.width / 2 - (over!.x + over!.width / 2))), gap: Math.round(over!.y - (box!.y + box!.height)) };
  };

  // The heading is just over the service as L2 shows it, and centred on it, and so is a short label (text is as big
  // as what's written, not as wide as a new text box)
  for (const [written, id] of [[text, 'orders-service'], [label, 'inventory-service']] as const) {
    await expect.poll(async () => (await offOver(written, id)).across).toBeLessThan(8);
    const { gap } = await offOver(written, id);
    expect(gap).toBeGreaterThanOrEqual(0);
    expect(gap).toBeLessThan(60);
  }
  // The note is beside it, to its right
  const [service, noteBox] = await Promise.all([nodeLocator(page, 'orders-service').boundingBox(), note.boundingBox()]);
  expect(noteBox!.x).toBeGreaterThanOrEqual(service!.x + service!.width);
  expect(Math.abs(noteBox!.y - service!.y)).toBeLessThan(200);
});

test("a note an agent writes about something the level shown doesn't show is still about it", async ({ page }) => {
  await openDiagram(page);
  await showLevel(page, 2);
  // L2 shows services, not their events: the note goes in the middle of the canvas
  expect((await edit(page, [{ op: 'add_note', note: { text: 'Too chatty', resource: 'OrderPlaced' } }])).results[0].ok).toBe(true);
  const note = page.locator('.react-flow__node-note', { hasText: 'Too chatty' });
  await expect(note).toBeVisible();

  // Still about the event: it goes with it
  expect((await edit(page, [{ op: 'remove_resource', id: 'OrderPlaced' }])).results[0].ok).toBe(true);
  await expect(note).toHaveCount(0);
});
