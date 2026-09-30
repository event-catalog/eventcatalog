import { beforeEach, describe, expect, it, vi } from 'vitest';

const captured = vi.hoisted(() => ({
  servers: [] as Array<{ info: { name: string; version: string }; options?: { instructions?: string } }>,
  tools: [] as Array<{ name: string; config: any; handler: (params: any) => Promise<any> }>,
  resources: [] as Array<{ name: string; uri: string; read: (uri: URL, extra: any) => Promise<any> }>,
}));

// The graph builders are covered elsewhere; here we only need a diagram to exist
vi.mock('@utils/node-graphs/architecture-diagram', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@utils/node-graphs/architecture-diagram')>()),
  getArchitectureDiagramGraph: vi.fn(() =>
    Promise.resolve({ nodes: [{ id: 'payments-1.0.0', type: 'domains', data: { domain: { name: 'Payments' } } }], edges: [] })
  ),
  getArchitectureDiagramView: vi.fn(() =>
    Promise.resolve({ nodes: [{ id: 'detailed' }], edges: [], overview: { nodes: [{ id: 'overview' }], edges: [] } })
  ),
}));

const orderCreatedSchema = JSON.stringify({ type: 'object', properties: { orderId: { type: 'string' } } });

const collections: Record<string, any[]> = {
  domains: [{ id: 'payments-1.0.0', collection: 'domains', data: { id: 'payments', version: '1.0.0', name: 'Payments' } }],
  events: [
    { id: 'OrderCreated-1.0.0', collection: 'events', data: { id: 'OrderCreated', version: '1.0.0', name: 'Order Created' } },
    { id: 'OrderShipped-1.0.0', collection: 'events', data: { id: 'OrderShipped', version: '1.0.0', name: 'Order Shipped' } },
  ],
  schemas: [
    {
      id: 'order-created',
      collection: 'schemas',
      data: {
        name: 'OrderCreated',
        format: 'jsonschema',
        content: orderCreatedSchema,
        message: { collectionName: 'events', id: 'OrderCreated', version: '1.0.0' },
      },
    },
  ],
};

vi.mock('astro:content', () => ({
  getCollection: vi.fn((collection: string) => Promise.resolve(collections[collection] ?? [])),
  getEntry: vi.fn(),
}));

vi.mock('@eventcatalog/sdk', () => ({
  default: vi.fn(() => ({
    getGraph: vi.fn(() =>
      Promise.resolve({
        root: { type: 'domain', id: 'payments', version: '1.0.0' },
        resources: [{ type: 'domain', id: 'payments', version: '1.0.0' }],
      })
    ),
  })),
}));

vi.mock('@utils/collections/util', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@utils/collections/util')>()),
}));

vi.mock('@modelcontextprotocol/sdk/server/mcp.js', () => ({
  McpServer: vi.fn().mockImplementation(function (info: any, options: any) {
    captured.servers.push({ info, options });
    return {
      registerTool: vi.fn((name: string, config: any, handler: any) => captured.tools.push({ name, config, handler })),
      registerResource: vi.fn((name: string, uri: string, _config: any, read: any) =>
        captured.resources.push({ name, uri, read })
      ),
      connect: vi.fn(),
    };
  }),
}));

vi.mock('@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js', () => ({
  WebStandardStreamableHTTPServerTransport: vi.fn().mockImplementation(function () {
    return { handleRequest: vi.fn(() => new Response(JSON.stringify({ jsonrpc: '2.0', result: {} }))) };
  }),
}));

vi.mock('../mcp-auth', () => ({
  validateMcpRequest: vi.fn(() => Promise.resolve({ ok: true })),
  createMcpAuthErrorResponse: vi.fn(),
}));

const initializeRequest = (url: string) =>
  new Request(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'initialize', params: {} }),
  });

const createGlobalServer = async () => {
  const { ALL } = await import('../mcp-server');
  await ALL({ request: initializeRequest('http://localhost:4321/docs/mcp') } as any);
};

const getTool = (name: string) => captured.tools.find((tool) => tool.name === name);

describe('MCP tool metadata', () => {
  beforeEach(() => {
    captured.servers.length = 0;
    captured.tools.length = 0;
    captured.resources.length = 0;
  });

  it('gives every built-in tool a human-readable title', async () => {
    await createGlobalServer();

    expect(captured.tools.length).toBeGreaterThan(0);
    for (const tool of captured.tools) {
      expect(tool.config.title, `${tool.name} is missing a title`).toEqual(expect.any(String));
    }
  });

  it('marks every built-in tool as read-only, non-destructive, idempotent and closed-world so clients can auto-approve them', async () => {
    await createGlobalServer();

    for (const tool of captured.tools) {
      expect(tool.config.annotations, `${tool.name} has the wrong annotations`).toEqual({
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: false,
      });
    }
  });

  it('marks every tool on a scoped server as read-only too', async () => {
    const { ALL } = await import('../mcp-server');
    await ALL({ request: initializeRequest('http://localhost:4321/docs/mcp/domains/payments') } as any);

    expect(captured.tools.length).toBeGreaterThan(0);
    for (const tool of captured.tools) {
      expect(tool.config.title).toEqual(expect.any(String));
      expect(tool.config.annotations.readOnlyHint).toBe(true);
    }
  });

  it('gives the server instructions that explain how to navigate the catalog', async () => {
    await createGlobalServer();

    const instructions = captured.servers[0].options?.instructions;
    expect(instructions).toContain('getResources');
    expect(instructions).toContain('latest');
  });

  it('reports the same server version over MCP as the health check does', async () => {
    const { ALL } = await import('../mcp-server');
    await createGlobalServer();
    const health = await (await ALL({ request: new Request('http://localhost:4321/docs/mcp') } as any)).json();

    expect(captured.servers[0].info.version).toBe(health.version);
  });

  it('exposes the data product and architecture diagram tools that were previously only available to AI Chat', async () => {
    await createGlobalServer();

    expect(getTool('getDataProductInputs')).toBeDefined();
    expect(getTool('getDataProductOutputs')).toBeDefined();
    expect(getTool('showResource')).toBeDefined();
  });

  it('offers the architecture diagram tool on domain-scoped servers too', async () => {
    const { ALL } = await import('../mcp-server');
    await ALL({ request: initializeRequest('http://localhost:4321/docs/mcp/domains/payments') } as any);

    expect(getTool('showResource')).toBeDefined();
  });

  it('lets agents ask for an overview diagram of a domain or system', async () => {
    await createGlobalServer();

    const schema = getTool('showResource')!.config.inputSchema;
    const diagram = { view: 'architecture', resourceId: 'ordering', resourceCollection: 'domains' };
    expect(schema.safeParse({ ...diagram, detail: 'overview' }).success).toBe(true);
    expect(schema.safeParse({ ...diagram, detail: 'everything' }).success).toBe(false);
  });

  it.each([
    ['getResource', { collection: 'events', id: 'OrderCreated' }],
    ['getSchemaForResource', { resourceId: 'OrderCreated', resourceCollection: 'events' }],
    ['getMessagesProducedOrConsumedByResource', { resourceId: 'OrderService' }],
    ['getProducersOfMessage', { messageId: 'OrderCreated' }],
    ['getConsumersOfMessage', { messageId: 'OrderCreated' }],
    ['analyzeChangeImpact', { messageId: 'OrderCreated' }],
    ['explainBusinessFlow', { flowId: 'OrderFlow' }],
    ['getDataProductInputs', { dataProductId: 'orders-analytics' }],
    ['getDataProductOutputs', { dataProductId: 'orders-analytics' }],
    ['showResource', { view: 'architecture', resourceId: 'OrderService', resourceCollection: 'services' }],
  ])('lets agents call %s without a version so it defaults to the latest', async (name, args) => {
    await createGlobalServer();

    const tool = getTool(name);
    expect(tool).toBeDefined();
    expect(tool!.config.inputSchema.safeParse(args).success).toBe(true);
  });

  describe('pointing the model at the interactive viewer', () => {
    it('names one tool for showing the user a resource, as a diagram or a schema', async () => {
      await createGlobalServer();

      const tool = getTool('showResource')!;
      expect(tool.config.title).toBe('Show a resource');
      expect(tool.config.description).toContain('"architecture"');
      expect(tool.config.description).toContain('"schema"');
      expect(tool.config.description).toMatch(/do not redraw the diagram or print the whole schema/i);
      expect(getTool('showArchitectureDiagram')).toBeUndefined();
      expect(getTool('showSchema')).toBeUndefined();
    });

    it('only accepts the views the viewer can show', async () => {
      await createGlobalServer();

      const schema = getTool('showResource')!.config.inputSchema;
      expect(schema.safeParse({ view: 'schema', resourceId: 'OrderCreated' }).success).toBe(true);
      expect(schema.safeParse({ view: 'table', resourceId: 'OrderCreated' }).success).toBe(false);
      expect(schema.safeParse({ resourceId: 'OrderCreated' }).success).toBe(false);
    });

    it('asks the model to show a diagram when the user wants to see how something fits together, and a schema when they want to see one', async () => {
      await createGlobalServer();

      const instructions = captured.servers[0].options?.instructions;
      expect(instructions).toContain('call showResource with view "architecture"');
      expect(instructions).toContain('call showResource with view "schema", not getSchemaForResource');
      expect(getTool('getSchemaForResource')!.config.description).toContain(
        'To show the user a schema, use showResource with view "schema"'
      );
    });
  });

  describe('interactive viewer (MCP Apps)', () => {
    const VIEW_URI = 'ui://eventcatalog/viewer.html';

    it('tells MCP hosts that support MCP Apps to show the tool result in the viewer', async () => {
      await createGlobalServer();

      expect(getTool('showResource')!.config._meta.ui).toEqual({ resourceUri: VIEW_URI });
    });

    it('only lets the viewer (not the model) call the tool that loads a resource for display', async () => {
      await createGlobalServer();

      expect(getTool('getResourceView')!.config._meta.ui).toEqual({ resourceUri: VIEW_URI, visibility: ['app'] });
    });

    it('serves the viewer as an MCP App that may load icons from the EventCatalog it came from', async () => {
      await createGlobalServer();

      const view = captured.resources.find((resource) => resource.uri === VIEW_URI);
      const { contents } = await view!.read(new URL(VIEW_URI), {});

      expect(contents[0].mimeType).toBe('text/html;profile=mcp-app');
      expect(contents[0].text).toContain('<div id="root"></div>');
      expect(contents[0]._meta.ui.csp.resourceDomains).toEqual(['http://localhost:4321']);
    });

    it('asks hosts to open the viewer full screen straight away, and lets it go inline', async () => {
      await createGlobalServer();

      const view = captured.resources.find((resource) => resource.uri === VIEW_URI);
      const { contents } = await view!.read(new URL(VIEW_URI), {});

      expect(contents[0]._meta['openai/ui']).toEqual({
        preferredDisplayMode: 'fullscreen',
        availableDisplayModes: ['inline', 'fullscreen'],
      });
    });

    it('ties every result to one viewer, so hosts update the viewer they show instead of showing another', async () => {
      await createGlobalServer();

      const diagram = await getTool('showResource')!.handler({
        view: 'architecture',
        resourceId: 'payments',
        resourceCollection: 'domains',
      });
      const schema = await getTool('showResource')!.handler({
        view: 'schema',
        resourceId: 'OrderCreated',
        resourceCollection: 'events',
      });

      expect(diagram._meta['openai/widgetSessionId']).toBe('eventcatalog');
      expect(schema._meta['openai/widgetSessionId']).toBe('eventcatalog');
    });

    it('keeps a domain-scoped server to its own viewer', async () => {
      const { ALL } = await import('../mcp-server');
      await ALL({ request: initializeRequest('http://localhost:4321/docs/mcp/domains/payments') } as any);

      const result = await getTool('showResource')!.handler({
        view: 'architecture',
        resourceId: 'payments',
        resourceCollection: 'domains',
      });

      expect(result._meta['openai/widgetSessionId']).toBe('eventcatalog:domain:payments');
    });

    describe('architecture view', () => {
      it('tells the model in the result that the user can see the diagram, so it does not draw it again', async () => {
        await createGlobalServer();

        const result = await getTool('showResource')!.handler({
          view: 'architecture',
          resourceId: 'payments',
          resourceCollection: 'domains',
        });

        expect(JSON.parse(result.content[0].text).note).toMatch(/do not (re)?draw/i);
      });

      it('gives the model the Mermaid and the viewer the diagram with its levels, which the model does not see', async () => {
        await createGlobalServer();

        const result = await getTool('showResource')!.handler({
          view: 'architecture',
          resourceId: 'payments',
          resourceCollection: 'domains',
        });

        expect(JSON.parse(result.content[0].text)).toEqual(
          expect.objectContaining({ view: 'architecture', mermaidCode: expect.stringContaining('flowchart') })
        );
        expect(result.content[0].text).not.toContain('overview');
        expect(result._meta['eventcatalog/view']).toEqual({
          view: 'architecture',
          diagram: {
            resource: { collection: 'domains', id: 'payments', version: '1.0.0', name: 'Payments' },
            catalogUrl: 'http://localhost:4321',
            visualiserPath: '/visualiser/domains/payments/1.0.0',
            view: { nodes: [{ id: 'detailed' }], edges: [], overview: { nodes: [{ id: 'overview' }], edges: [] } },
          },
        });
      });
    });

    describe('schema view', () => {
      it('gives the model the schema code and the viewer the schema parsed for its viewers', async () => {
        await createGlobalServer();

        const result = await getTool('showResource')!.handler({
          view: 'schema',
          resourceId: 'OrderCreated',
          resourceCollection: 'events',
        });
        const text = JSON.parse(result.content[0].text);

        expect(text.note).toMatch(/do not print the whole schema/i);
        expect(text).toMatchObject({ view: 'schema', resourceId: 'OrderCreated', resourceCollection: 'events' });
        expect(text.schemas).toEqual([{ format: 'jsonschema', code: orderCreatedSchema }]);
        expect(result._meta['eventcatalog/view']).toEqual({
          view: 'schema',
          schema: {
            resource: { collection: 'events', id: 'OrderCreated', version: '1.0.0', name: 'Order Created' },
            catalogUrl: 'http://localhost:4321',
            docsPath: '/docs/events/OrderCreated/1.0.0',
            schemas: [
              {
                kind: 'json',
                schema: JSON.parse(orderCreatedSchema),
                format: 'jsonschema',
                language: 'json',
                code: orderCreatedSchema,
              },
            ],
          },
        });
      });

      it('shows the schema of an event when no collection is given', async () => {
        await createGlobalServer();

        const tool = getTool('showResource')!;
        const args = tool.config.inputSchema.parse({ view: 'schema', resourceId: 'OrderCreated' });
        const result = await tool.handler(args);

        expect(result._meta['eventcatalog/view'].schema.resource.collection).toBe('events');
      });

      it('tells the model and the viewer when a resource has no schema', async () => {
        await createGlobalServer();

        const result = await getTool('showResource')!.handler({
          view: 'schema',
          resourceId: 'OrderShipped',
          resourceCollection: 'events',
        });

        expect(JSON.parse(result.content[0].text)).toMatchObject({ schemas: [], message: 'Order Shipped has no schema' });
        expect(result._meta['eventcatalog/view'].schema.schemas).toEqual([]);
      });

      it('returns an error for a resource that does not exist', async () => {
        await createGlobalServer();

        const result = await getTool('showResource')!.handler({
          view: 'schema',
          resourceId: 'Missing',
          resourceCollection: 'events',
        });

        expect(result.isError).toBe(true);
        expect(result.content[0].text).toContain('Missing');
      });
    });
  });
});
