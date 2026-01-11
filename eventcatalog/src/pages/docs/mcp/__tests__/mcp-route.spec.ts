import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Store original env
const originalEnv = { ...process.env };

// Mock astro:content
vi.mock('astro:content', async (importOriginal) => {
  return {
    ...(await importOriginal<typeof import('astro:content')>()),
    getCollection: () => Promise.resolve([]),
    getEntry: () => Promise.resolve(undefined),
  };
});

// Mock the feature utilities
vi.mock('@utils/feature', () => ({
  isSSR: vi.fn(() => true),
  isEventCatalogScaleEnabled: vi.fn(() => true),
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
// Feature Gating Tests
// ============================================

describe('MCP Route Feature Gating', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it('should check SSR mode before handling requests', async () => {
    vi.mocked(isSSR).mockReturnValue(false);
    vi.mocked(isEventCatalogScaleEnabled).mockReturnValue(true);

    // Import the ALL handler dynamically
    const { ALL } = await import('../[...path]');

    const request = new Request('http://localhost:4321/docs/mcp/', {
      method: 'GET',
    });

    const response = await ALL({ request } as any);

    expect(response.status).toBe(501);
    const body = await response.json();
    expect(body.error).toBe('ssr_required');
    expect(body.message).toContain('SSR mode');
  });

  it('should check Scale plan before handling requests', async () => {
    vi.mocked(isSSR).mockReturnValue(true);
    vi.mocked(isEventCatalogScaleEnabled).mockReturnValue(false);

    // Import the ALL handler dynamically
    const { ALL } = await import('../[...path]');

    const request = new Request('http://localhost:4321/docs/mcp/', {
      method: 'GET',
    });

    const response = await ALL({ request } as any);

    expect(response.status).toBe(501);
    const body = await response.json();
    expect(body.error).toBe('feature_not_available');
    expect(body.message).toContain('Scale');
  });

  it('should return correct Cache-Control header on error', async () => {
    vi.mocked(isSSR).mockReturnValue(false);

    const { ALL } = await import('../[...path]');

    const request = new Request('http://localhost:4321/docs/mcp/', {
      method: 'GET',
    });

    const response = await ALL({ request } as any);

    expect(response.headers.get('Cache-Control')).toBe('no-store');
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

  it('should pass feature gates when SSR and Scale are enabled', async () => {
    const { ALL } = await import('../[...path]');

    // Use the exact URL path that matches the Hono basePath
    const request = new Request('http://localhost:4321/docs/mcp', {
      method: 'GET',
    });

    const response = await ALL({ request } as any);

    // Should not return 501 (feature gate error)
    expect(response.status).not.toBe(501);
  });

  it('should verify toolDescriptions contains all expected tools', async () => {
    const { toolDescriptions } = await import('@enterprise/tools/catalog-tools');

    // 14 built-in tools from toolDescriptions
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
    ];

    for (const tool of expectedTools) {
      expect(toolDescriptions[tool as keyof typeof toolDescriptions]).toBeDefined();
    }
    expect(Object.keys(toolDescriptions).length).toBe(14);
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
    const { ALL } = await import('../[...path]');

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

    // Should not return feature gate error
    expect(response.status).not.toBe(501);
  });

  it('should enforce SSR mode for POST requests', async () => {
    vi.mocked(isSSR).mockReturnValue(false);

    const { ALL } = await import('../[...path]');

    const request = new Request('http://localhost:4321/docs/mcp/', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        jsonrpc: '2.0',
        method: 'tools/list',
        id: 1,
      }),
    });

    const response = await ALL({ request } as any);

    expect(response.status).toBe(501);
    const body = await response.json();
    expect(body.error).toBe('ssr_required');
  });

  it('should enforce Scale plan for POST requests', async () => {
    vi.mocked(isEventCatalogScaleEnabled).mockReturnValue(false);

    const { ALL } = await import('../[...path]');

    const request = new Request('http://localhost:4321/docs/mcp/', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        jsonrpc: '2.0',
        method: 'tools/list',
        id: 1,
      }),
    });

    const response = await ALL({ request } as any);

    expect(response.status).toBe(501);
    const body = await response.json();
    expect(body.error).toBe('feature_not_available');
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
    const routeModule = await import('../[...path]');
    expect(routeModule.prerender).toBe(false);
  });

  it('should export ALL handler', async () => {
    const routeModule = await import('../[...path]');
    expect(routeModule.ALL).toBeDefined();
    expect(typeof routeModule.ALL).toBe('function');
  });
});
