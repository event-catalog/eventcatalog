import { afterEach, describe, it, expect, vi } from 'vitest';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';
import { addToolIcons, type ToolIcon } from '../server/tool-icons';

const icon: ToolIcon = { src: 'data:image/svg+xml;base64,PHN2Zy8+', mimeType: 'image/svg+xml', sizes: ['any'] };

afterEach(() => {
  vi.restoreAllMocks();
});

describe('addToolIcons', () => {
  it('lists icons on the tools given them, and only those', async () => {
    const server = new McpServer({ name: 'canvas', version: '1.0.0' });
    server.registerTool('openCanvas', { description: 'Opens a canvas' }, async () => ({ content: [] }));
    server.registerTool('readCanvas', { description: 'Reads a canvas' }, async () => ({ content: [] }));

    expect(addToolIcons(server, { openCanvas: [icon] })).toBe(true);

    const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
    await server.connect(serverTransport);
    const client = new Client({ name: 'test-client', version: '1.0.0' });
    await client.connect(clientTransport);

    try {
      const { tools } = await client.listTools();
      const byName = new Map(tools.map((tool) => [tool.name, tool]));
      expect(byName.get('openCanvas')?.icons).toEqual([icon]);
      expect(byName.get('openCanvas')?.description).toBe('Opens a canvas');
      expect(byName.get('readCanvas')).not.toHaveProperty('icons');
    } finally {
      await client.close();
      await server.close();
    }
  });

  it('says so, and lists tools without icons, when the SDK does not expose its handlers', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const server = { server: {} } as unknown as McpServer;

    expect(addToolIcons(server, { openCanvas: [icon] })).toBe(false);
    expect(warn).toHaveBeenCalledWith(expect.stringContaining('Could not add tool icons'));
  });

  it('says so when no tools have been registered yet (no tools/list handler)', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const server = new McpServer({ name: 'canvas', version: '1.0.0' });

    expect(addToolIcons(server, { openCanvas: [icon] })).toBe(false);
    expect(warn).toHaveBeenCalledTimes(1);
  });
});
