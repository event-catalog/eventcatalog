import { describe, expect, it } from 'vitest';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';
import { createMcpServer } from '../../src/mcp/server';
import { Model, validateModel } from '@eventcatalog/visualiser/model';

const connect = async () => {
  const server = createMcpServer({ baseUrl: 'https://studio.example' });
  const client = new Client({ name: 'test', version: '0.0.0' });
  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
  await Promise.all([server.connect(serverTransport), client.connect(clientTransport)]);
  return client;
};

const textOf = (result: Awaited<ReturnType<Client['callTool']>>) => (result.content as { type: string; text: string }[])[0].text;

describe('the MCP server', () => {
  it('has every tool its instructions and descriptions name', async () => {
    const client = await connect();
    const names = (await client.listTools()).tools.map((tool) => tool.name);
    expect(names).toEqual(expect.arrayContaining(['get_architecture_schema', 'render_architecture', 'show_on_diagram', 'read_diagram']));
    // Agents are told to call tools by name: each one named must exist
    const instructions = client.getInstructions() ?? '';
    const descriptions = (await client.listTools()).tools.map((tool) => tool.description ?? '').join('\n');
    const named = new Set([...`${instructions}\n${descriptions}`.matchAll(/\b(get_[a-z_]+|render_[a-z_]+|show_[a-z_]+|read_[a-z_]+)\b/g)].map((match) => match[1]));
    for (const name of named) expect(names).toContain(name);
  });

  it('teaches the model, with an example that is a valid model', async () => {
    const client = await connect();
    const guide = textOf(await client.callTool({ name: 'get_architecture_schema', arguments: {} }));
    expect(guide).toContain('## Resource types');
    expect(guide).toContain('## JSON schema of the model');
    const example = JSON.parse(guide.slice(guide.indexOf('## Example') + '## Example'.length));
    const model = Model.parse(example);
    expect(validateModel(model).errors).toEqual([]);
  });
});
