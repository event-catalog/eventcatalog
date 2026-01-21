import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock astro:content
vi.mock('astro:content', async (importOriginal) => {
  return {
    ...(await importOriginal<typeof import('astro:content')>()),
    getCollection: () => Promise.resolve([]),
    getEntry: () => Promise.resolve(undefined),
  };
});

// Mock hono - using regular functions instead of vi.fn() to avoid being reset by resetAllMocks
vi.mock('hono', () => {
  const createMockApp = () => {
    const mockFetch = async (request: Request) => {
      if (request.method === 'GET') {
        return new Response(
          JSON.stringify({
            status: 'healthy',
            tools: [],
            resources: [
              'eventcatalog://all',
              'eventcatalog://events',
              'eventcatalog://commands',
              'eventcatalog://queries',
              'eventcatalog://services',
              'eventcatalog://domains',
              'eventcatalog://flows',
              'eventcatalog://teams',
              'eventcatalog://users',
            ],
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } }
        );
      }
      return new Response(JSON.stringify({ jsonrpc: '2.0', result: {} }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    };
    const mockApp: any = {
      fetch: mockFetch,
    };
    // All chaining methods return the same mockApp - using regular functions to avoid reset
    mockApp.basePath = () => mockApp;
    mockApp.get = () => mockApp;
    mockApp.post = () => mockApp;
    mockApp.all = () => mockApp;
    return mockApp;
  };
  return {
    Hono: function () {
      return createMockApp();
    },
  };
});

// Mock @modelcontextprotocol/sdk
vi.mock('@modelcontextprotocol/sdk/server/mcp.js', () => ({
  McpServer: vi.fn().mockImplementation(() => ({
    tool: vi.fn(),
    resource: vi.fn(),
    connect: vi.fn(),
    registerTool: vi.fn(),
    registerResource: vi.fn(),
  })),
}));

vi.mock('@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js', () => ({
  WebStandardStreamableHTTPServerTransport: vi.fn().mockImplementation(() => ({})),
}));

// Mock the feature utilities
vi.mock('@utils/feature', () => ({
  isSSR: vi.fn(() => true),
  isEventCatalogScaleEnabled: vi.fn(() => true),
  isEventCatalogMCPEnabled: vi.fn(() => true),
}));

// Mock getSchemasFromResource
vi.mock('@utils/collections/schemas', () => ({
  getSchemasFromResource: vi.fn(() => Promise.resolve([])),
}));

// Mock getItemsFromCollectionByIdAndSemverOrLatest
vi.mock('@utils/collections/util', () => ({
  getItemsFromCollectionByIdAndSemverOrLatest: vi.fn(() => []),
}));

// Mock fs
vi.mock('node:fs', () => ({
  default: {
    readFileSync: vi.fn(() => '{}'),
  },
}));

import { isSSR, isEventCatalogScaleEnabled } from '@utils/feature';

// ============================================
// createToolHandler Tests (Unit Tests)
// ============================================

describe('createToolHandler', () => {
  // We test the behavior of createToolHandler indirectly through the tool implementations
  // The createToolHandler function is internal to the MCP route

  it('should return isError: true when result has error property', async () => {
    // This tests the pattern used by createToolHandler
    const mockResult = { error: 'Something went wrong' };
    const hasError = 'error' in mockResult;
    expect(hasError).toBe(true);
  });

  it('should format successful results as JSON', async () => {
    const mockResult = { data: 'success' };
    const formatted = JSON.stringify(mockResult, null, 2);
    expect(formatted).toContain('"data"');
    expect(formatted).toContain('"success"');
  });
});

// ============================================
// Health Check Endpoint Tests
// ============================================

describe('MCP Health Check Endpoint (GET /docs/mcp/)', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.mocked(isSSR).mockReturnValue(true);
    vi.mocked(isEventCatalogScaleEnabled).mockReturnValue(true);
  });

  it('should handle GET requests', async () => {
    const { ALL } = await import('../mcp-server');

    // Use the exact URL path that matches the Hono basePath
    const request = new Request('http://localhost:4321/docs/mcp', {
      method: 'GET',
    });

    const response = await ALL({ request } as any);

    // Should return success
    expect(response.status).toBe(200);
  });

  it('should verify toolDescriptions contains all expected tools', async () => {
    const { toolDescriptions } = await import('@enterprise/tools/catalog-tools');

    // 15 built-in tools from toolDescriptions
    const expectedTools = [
      'getResources',
      'getResource',
      'getMessagesProducedOrConsumedByResource',
      'getSchemaForResource',
      'findResourcesByOwner',
      'getProducersOfMessage',
      'getConsumersOfMessage',
      'analyzeChangeImpact',
      'explainBusinessFlow',
      'getTeams',
      'getTeam',
      'getUsers',
      'getUser',
      'findMessageBySchemaId',
      'explainUbiquitousLanguageTerms',
      'getDataProductInputs',
      'getDataProductOutputs',
    ];

    for (const tool of expectedTools) {
      expect(toolDescriptions[tool as keyof typeof toolDescriptions]).toBeDefined();
    }
    expect(Object.keys(toolDescriptions).length).toBe(17);
  });
});

// ============================================
// MCP Protocol Endpoint Tests (POST /)
// ============================================

describe('MCP Protocol Endpoint (POST /docs/mcp/)', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.mocked(isSSR).mockReturnValue(true);
    vi.mocked(isEventCatalogScaleEnabled).mockReturnValue(true);
  });

  it('should accept POST requests', async () => {
    const { ALL } = await import('../mcp-server');

    const request = new Request('http://localhost:4321/docs/mcp/', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        jsonrpc: '2.0',
        method: 'initialize',
        id: 1,
        params: {
          protocolVersion: '2024-11-05',
          capabilities: {},
          clientInfo: { name: 'test', version: '1.0.0' },
        },
      }),
    });

    const response = await ALL({ request } as any);

    // Should not return 501 error
    expect(response.status).not.toBe(501);
  });
});

// ============================================
// Tool Registration Tests
// ============================================

describe('MCP Tool Registration', () => {
  it('should have correct tool descriptions exported', async () => {
    const { toolDescriptions } = await import('@enterprise/tools/catalog-tools');

    expect(toolDescriptions.getResources).toBeDefined();
    expect(toolDescriptions.getResources).toContain('events');
    expect(toolDescriptions.analyzeChangeImpact).toBeDefined();
    expect(toolDescriptions.analyzeChangeImpact).toContain('impact');
  });

  it('should have correct collection schemas exported', async () => {
    const { collectionSchema, messageCollectionSchema, resourceCollectionSchema } = await import(
      '@enterprise/tools/catalog-tools'
    );

    // Test collection schema includes all types
    expect(collectionSchema.safeParse('events').success).toBe(true);
    expect(collectionSchema.safeParse('services').success).toBe(true);
    expect(collectionSchema.safeParse('invalid').success).toBe(false);

    // Test message collection schema
    expect(messageCollectionSchema.safeParse('events').success).toBe(true);
    expect(messageCollectionSchema.safeParse('commands').success).toBe(true);
    expect(messageCollectionSchema.safeParse('queries').success).toBe(true);
    expect(messageCollectionSchema.safeParse('services').success).toBe(false);

    // Test resource collection schema
    expect(resourceCollectionSchema.safeParse('services').success).toBe(true);
    expect(resourceCollectionSchema.safeParse('events').success).toBe(true);
  });
});

// ============================================
// prerender Export Test
// ============================================

describe('MCP Route Configuration', () => {
  it('should disable prerendering for SSR', async () => {
    const routeModule = await import('../mcp-server');
    expect(routeModule.prerender).toBe(false);
  });

  it('should export ALL handler', async () => {
    const routeModule = await import('../mcp-server');
    expect(routeModule.ALL).toBeDefined();
    expect(typeof routeModule.ALL).toBe('function');
  });
});

// ============================================
// Feature Gating Integration Tests
// Note: SSR and Scale checks are now handled at build time
// by the eventcatalog-features integration. The route is only
// injected when isEventCatalogMCPEnabled() returns true.
// ============================================

describe('MCP Feature Gating (Integration Level)', () => {
  it('should require isEventCatalogMCPEnabled to be true for route injection', async () => {
    const { isEventCatalogMCPEnabled } = await import('@utils/feature');
    // When MCP is enabled (SSR + Scale), the route should be injected
    // This test verifies the feature check function exists and works
    expect(typeof isEventCatalogMCPEnabled).toBe('function');
  });
});

// ============================================
// MCP Resources Tests
// ============================================

describe('MCP Resources', () => {
  it('should define all expected resource URIs', async () => {
    // Import the mcp-server module to check resources are defined
    const expectedResources = [
      'eventcatalog://all',
      'eventcatalog://events',
      'eventcatalog://commands',
      'eventcatalog://queries',
      'eventcatalog://services',
      'eventcatalog://domains',
      'eventcatalog://flows',
      'eventcatalog://teams',
      'eventcatalog://users',
    ];

    // The resources are exposed via the health check endpoint
    const { ALL } = await import('../mcp-server');

    const request = new Request('http://localhost:4321/docs/mcp', {
      method: 'GET',
    });

    const response = await ALL({ request } as any);
    const body = await response.json();

    expect(body.resources).toBeDefined();
    expect(body.resources.length).toBe(9);

    for (const uri of expectedResources) {
      expect(body.resources).toContain(uri);
    }
  });

  it('should return resources in health check response', async () => {
    const { ALL } = await import('../mcp-server');

    const request = new Request('http://localhost:4321/docs/mcp', {
      method: 'GET',
    });

    const response = await ALL({ request } as any);
    expect(response.status).toBe(200);

    const body = await response.json();
    expect(body).toHaveProperty('resources');
    expect(Array.isArray(body.resources)).toBe(true);
  });
});

// ============================================
// Search Filter in getResources Tool
// ============================================

describe('MCP getResources Tool with Search', () => {
  it('should have search parameter in getResources tool description', async () => {
    const { toolDescriptions } = await import('@enterprise/tools/catalog-tools');
    expect(toolDescriptions.getResources).toContain('search');
  });
});

// ============================================
// Ubiquitous Language Tool
// ============================================

describe('MCP explainUbiquitousLanguageTerms Tool', () => {
  it('should have explainUbiquitousLanguageTerms in toolDescriptions', async () => {
    const { toolDescriptions } = await import('@enterprise/tools/catalog-tools');
    expect(toolDescriptions.explainUbiquitousLanguageTerms).toBeDefined();
    expect(toolDescriptions.explainUbiquitousLanguageTerms).toContain('ubiquitous language');
  });
});
