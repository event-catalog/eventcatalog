import { describe, it, expect } from 'vitest';
import { Client } from '@modelcontextprotocol/client';
import { McpServer, InMemoryTransport } from '@modelcontextprotocol/server';
import { z } from 'zod';
import { registerMcpApp } from '../mcp-apps';

const icon = { src: 'data:image/svg+xml;base64,PHN2Zy8+', mimeType: 'image/svg+xml', sizes: ['any'] };

const tool = (name: string) => ({ name, title: name, description: `Shows ${name}`, input: { id: z.string() } });

const registerApp = (server: McpServer, icons?: (typeof icon)[]) =>
  registerMcpApp(server, {
    loadView: async () => '<html></html>',
    resource: { name: 'Viewer', uri: 'ui://test/viewer', description: 'A viewer', prefersBorder: false },
    metaKey: 'test/payload',
    tool: { ...tool('showThing'), ...(icons && { icons }) },
    viewTool: tool('loadThing'),
    annotations: { readOnlyHint: true },
    load: async () => ({ forModel: {}, label: 'a thing', getPayload: async () => ({}) }),
    errorMessage: 'Failed',
  });

// Through a real client, so what hosts are sent is checked (not just what is registered)
const withClient = async <T>(server: McpServer, use: (client: Client) => Promise<T>) => {
  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
  await server.connect(serverTransport);
  const client = new Client({ name: 'test-client', version: '1.0.0' });
  await client.connect(clientTransport);
  try {
    return await use(client);
  } finally {
    await client.close();
    await server.close();
  }
};
const listTools = (server: McpServer) =>
  withClient(server, async (client) => new Map((await client.listTools()).tools.map((listed) => [listed.name, listed])));

describe('registerMcpApp', () => {
  it('lists icons on the tool given them, and not on its app-only tool', async () => {
    const server = new McpServer({ name: 'test', version: '1.0.0' });
    registerApp(server, [icon]);

    const tools = await listTools(server);

    expect(tools.get('showThing')?.icons).toEqual([icon]);
    expect(tools.get('loadThing')?.icons).toBeUndefined();
  });

  it('lists the tool without icons when it has none', async () => {
    const server = new McpServer({ name: 'test', version: '1.0.0' });
    registerApp(server);

    const tools = await listTools(server);

    expect(tools.get('showThing')?.icons).toBeUndefined();
    expect(tools.get('showThing')?._meta).toMatchObject({ ui: { resourceUri: 'ui://test/viewer' } });
  });

  it("tells hosts whether to frame the view, on the view's resource", async () => {
    const server = new McpServer({ name: 'test', version: '1.0.0' });
    registerApp(server);

    const read = await withClient(server, (client) => client.readResource({ uri: 'ui://test/viewer' }));

    expect(read.contents[0]._meta).toMatchObject({ ui: { prefersBorder: false } });
  });
});
