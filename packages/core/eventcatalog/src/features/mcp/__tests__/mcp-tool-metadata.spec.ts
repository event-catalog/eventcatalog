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

vi.mock('astro:content', () => ({
  getCollection: vi.fn((collection: string) =>
    Promise.resolve(
      collection === 'domains'
        ? [{ id: 'payments-1.0.0', collection: 'domains', data: { id: 'payments', version: '1.0.0', name: 'Payments' } }]
        : []
    )
  ),
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
    expect(getTool('showArchitectureDiagram')).toBeDefined();
  });

  it('offers the architecture diagram tool on domain-scoped servers too', async () => {
    const { ALL } = await import('../mcp-server');
    await ALL({ request: initializeRequest('http://localhost:4321/docs/mcp/domains/payments') } as any);

    expect(getTool('showArchitectureDiagram')).toBeDefined();
  });

  it('lets agents ask for an overview diagram of a domain or system', async () => {
    await createGlobalServer();

    const schema = getTool('showArchitectureDiagram')!.config.inputSchema;
    expect(schema.safeParse({ resourceId: 'ordering', resourceCollection: 'domains', detail: 'overview' }).success).toBe(true);
    expect(schema.safeParse({ resourceId: 'ordering', resourceCollection: 'domains', detail: 'everything' }).success).toBe(false);
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
    ['showArchitectureDiagram', { resourceId: 'OrderService', resourceCollection: 'services' }],
  ])('lets agents call %s without a version so it defaults to the latest', async (name, args) => {
    await createGlobalServer();

    const tool = getTool(name);
    expect(tool).toBeDefined();
    expect(tool!.config.inputSchema.safeParse(args).success).toBe(true);
  });

  describe('pointing the model at the interactive architecture diagram', () => {
    it('names the diagram tool for what the user gets, an architecture diagram shown to them', async () => {
      await createGlobalServer();

      const tool = getTool('showArchitectureDiagram')!;
      expect(tool.config.title).toBe('Show an architecture diagram');
      expect(tool.config.description).toContain('how');
      expect(tool.config.description).toMatch(/do not (re)?draw/i);
    });

    it('tells the model in the result that the user can see the diagram, so it does not draw it again', async () => {
      await createGlobalServer();

      const result = await getTool('showArchitectureDiagram')!.handler({ resourceId: 'payments', resourceCollection: 'domains' });

      expect(JSON.parse(result.content[0].text).note).toMatch(/do not (re)?draw/i);
    });

    it('asks the model to show the diagram when the user wants to see how something works or fits together', async () => {
      await createGlobalServer();

      expect(captured.servers[0].options?.instructions).toContain('showArchitectureDiagram');
    });
  });

  describe('interactive architecture diagram (MCP Apps)', () => {
    const VIEW_URI = 'ui://eventcatalog/architecture-diagram.html';

    it('tells MCP hosts that support MCP Apps to show the diagram tool result in the architecture diagram view', async () => {
      await createGlobalServer();

      expect(getTool('showArchitectureDiagram')!.config._meta.ui).toEqual({ resourceUri: VIEW_URI });
    });

    it('only lets the view (not the model) call the tool that loads a diagram for display', async () => {
      await createGlobalServer();

      expect(getTool('getArchitectureDiagramView')!.config._meta.ui).toEqual({ resourceUri: VIEW_URI, visibility: ['app'] });
    });

    it('serves the view as an MCP App that may load icons from the EventCatalog it came from', async () => {
      await createGlobalServer();

      const view = captured.resources.find((resource) => resource.uri === VIEW_URI);
      const { contents } = await view!.read(new URL(VIEW_URI), {});

      expect(contents[0].mimeType).toBe('text/html;profile=mcp-app');
      expect(contents[0].text).toContain('<div id="root"></div>');
      expect(contents[0]._meta.ui.csp.resourceDomains).toEqual(['http://localhost:4321']);
    });

    it('gives the model the Mermaid and the view the diagram with its levels, which the model does not see', async () => {
      await createGlobalServer();

      const result = await getTool('showArchitectureDiagram')!.handler({
        resourceId: 'payments',
        resourceCollection: 'domains',
      });

      expect(JSON.parse(result.content[0].text)).toEqual(
        expect.objectContaining({ mermaidCode: expect.stringContaining('flowchart') })
      );
      expect(result.content[0].text).not.toContain('overview');
      expect(result._meta['eventcatalog/architectureDiagram']).toEqual({
        resource: { collection: 'domains', id: 'payments', version: '1.0.0', name: 'Payments' },
        catalogUrl: 'http://localhost:4321',
        visualiserPath: '/visualiser/domains/payments/1.0.0',
        view: { nodes: [{ id: 'detailed' }], edges: [], overview: { nodes: [{ id: 'overview' }], edges: [] } },
      });
    });
  });
});
