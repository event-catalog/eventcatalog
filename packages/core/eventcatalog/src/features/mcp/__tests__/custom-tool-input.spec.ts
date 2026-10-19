import { describe, it, expect } from 'vitest';
import { Client } from '@modelcontextprotocol/client';
import { McpServer, InMemoryTransport } from '@modelcontextprotocol/server';
import { jsonSchema } from 'ai';
import { z } from 'zod';
import { z as z3 } from 'zod/v3';
import { toCustomToolInput } from '../custom-tool-input';

// Registers a custom tool the way the MCP server does, and calls it through a real client
const serveTool = async (schema: unknown) => {
  const input = await toCustomToolInput(schema);
  const server = new McpServer({ name: 'test', version: '1.0.0' });
  server.registerTool('customTool', { description: 'A custom tool', inputSchema: input.inputSchema }, async (params: any) => {
    const parsed = input.parse ? await input.parse(params) : { success: true as const, value: params };
    if (!parsed.success) return { content: [{ type: 'text' as const, text: 'invalid' }], isError: true };
    return { content: [{ type: 'text' as const, text: JSON.stringify(parsed.value) }] };
  });

  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
  await server.connect(serverTransport);
  const client = new Client({ name: 'test-client', version: '1.0.0' });
  await client.connect(clientTransport);
  return {
    listed: async () => (await client.listTools()).tools.find((tool) => tool.name === 'customTool'),
    call: async (args: Record<string, unknown>) => {
      const result = await client.callTool({ name: 'customTool', arguments: args });
      const [content] = result.content as { text: string }[];
      return { isError: result.isError, value: result.isError ? undefined : JSON.parse(content.text) };
    },
    close: async () => {
      await client.close();
      await server.close();
    },
  };
};

describe('custom tool inputs', () => {
  it.each([
    ['zod 4', z.object({ eventId: z.string().describe('The event'), timeRange: z.enum(['1h', '24h']).default('24h') })],
    ['zod 3', z3.object({ eventId: z3.string().describe('The event'), timeRange: z3.enum(['1h', '24h']).default('24h') })],
  ])('lists and calls tools with %s schemas, applying their defaults', async (_, schema) => {
    const tool = await serveTool(schema);
    try {
      expect((await tool.listed())?.inputSchema).toMatchObject({
        type: 'object',
        properties: { eventId: { type: 'string', description: 'The event' } },
        required: ['eventId'],
      });
      expect(await tool.call({ eventId: 'OrderCreated' })).toEqual({
        isError: undefined,
        value: { eventId: 'OrderCreated', timeRange: '24h' },
      });
      expect((await tool.call({ eventId: 1 })).isError).toBe(true);
    } finally {
      await tool.close();
    }
  });

  it("lists and calls tools with the AI SDK's jsonSchema()", async () => {
    const tool = await serveTool(jsonSchema({ type: 'object', properties: { name: { type: 'string' } }, required: ['name'] }));
    try {
      expect((await tool.listed())?.inputSchema).toMatchObject({ properties: { name: { type: 'string' } } });
      expect((await tool.call({ name: 'x' })).value).toEqual({ name: 'x' });
      expect((await tool.call({ name: 1 })).isError).toBe(true);
    } finally {
      await tool.close();
    }
  });

  it('takes no arguments when the tool has no schema', async () => {
    const tool = await serveTool(undefined);
    try {
      expect((await tool.listed())?.inputSchema).toMatchObject({ type: 'object' });
      expect((await tool.call({})).value).toEqual({});
    } finally {
      await tool.close();
    }
  });
});
