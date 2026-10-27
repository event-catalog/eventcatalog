/** What agents write on the diagram (edit_diagram's add_note): on the level shown, by what it's about there */
import { expect, nodeLocator, openDiagram, showLevel, test } from './studio';

type Edit = (changes: unknown[]) => Promise<{ results: { ok: boolean }[] }>;

test('text and notes an agent writes on L2 go by where their resource is on L2, not on the canvas', async ({ page }) => {
  await openDiagram(page);
  await showLevel(page, 2);
  const made = await page.evaluate(() =>
    (window as unknown as { __studioTest: { edit: Edit } }).__studioTest.edit([
      { op: 'add_note', note: { text: 'Ordering', kind: 'text', fontSize: 40, resource: 'orders-service' } },
      { op: 'add_note', note: { text: 'Owns the order', resource: 'orders-service' } },
    ])
  );
  expect(made.results.every((result) => result.ok)).toBe(true);

  const service = (await nodeLocator(page, 'orders-service').boundingBox())!;
  const text = page.locator('.react-flow__node-text', { hasText: 'Ordering' });
  const note = page.locator('.react-flow__node-note', { hasText: 'Owns the order' });
  await expect(text).toBeVisible();
  await expect(note).toBeVisible();
  const [textBox, noteBox] = await Promise.all([text.boundingBox(), note.boundingBox()]);

  // The heading is just over the service as L2 shows it, and centred on it
  expect(textBox!.y + textBox!.height).toBeLessThanOrEqual(service.y + 1);
  expect(service.y - (textBox!.y + textBox!.height)).toBeLessThan(120);
  expect(Math.abs(textBox!.x + textBox!.width / 2 - (service.x + service.width / 2))).toBeLessThan(40);
  // The note is beside it, to its right
  expect(noteBox!.x).toBeGreaterThanOrEqual(service.x + service.width);
  expect(Math.abs(noteBox!.y - service.y)).toBeLessThan(200);
});
