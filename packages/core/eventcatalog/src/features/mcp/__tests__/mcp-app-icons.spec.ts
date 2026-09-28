import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { inlineNodeIcons } from '../mcp-app-icons';

const svg = '<svg xmlns="http://www.w3.org/2000/svg"></svg>';
let publicDirectory: string;

beforeAll(() => {
  publicDirectory = fs.mkdtempSync(path.join(os.tmpdir(), 'ec-mcp-icons-'));
  fs.mkdirSync(path.join(publicDirectory, 'icons/languages'), { recursive: true });
  fs.writeFileSync(path.join(publicDirectory, 'icons/languages/nodejs.svg'), svg);
});

afterAll(() => fs.rmSync(publicDirectory, { recursive: true, force: true }));

const serviceNode = (icon: string) => ({
  id: 'order-service-1.0.0',
  type: 'services',
  data: { service: { id: 'order-service', name: 'Order Service', styles: { icon } } },
});

describe('inlining diagram icons for MCP App views', () => {
  it('embeds icons served by EventCatalog in the diagram, as MCP hosts cannot load them from the catalog', async () => {
    const [node] = await inlineNodeIcons([serviceNode('/icons/languages/nodejs.svg')], publicDirectory);

    expect(node.data.service.styles.icon).toBe(`data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}`);
  });

  it('does not change the graph it was given, which the Diagram page also uses', async () => {
    const original = serviceNode('/icons/languages/nodejs.svg');

    await inlineNodeIcons([original], publicDirectory);

    expect(original.data.service.styles.icon).toBe('/icons/languages/nodejs.svg');
  });

  it('leaves icons it cannot find, and icons from other sites, as they are', async () => {
    const nodes = await inlineNodeIcons(
      [serviceNode('/icons/languages/missing.svg'), serviceNode('https://cdn.example.com/icon.svg')],
      publicDirectory
    );

    expect(nodes.map((node) => node.data.service.styles.icon)).toEqual([
      '/icons/languages/missing.svg',
      'https://cdn.example.com/icon.svg',
    ]);
  });

  it('never reads files outside the public directory', async () => {
    const [node] = await inlineNodeIcons([serviceNode('/../../etc/passwd.svg')], publicDirectory);

    expect(node.data.service.styles.icon).toBe('/../../etc/passwd.svg');
  });
});
