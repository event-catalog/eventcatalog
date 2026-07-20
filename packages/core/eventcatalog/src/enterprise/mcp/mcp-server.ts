/**
 * Licensed under the EventCatalog Commercial License.
 * See /packages/core/eventcatalog/src/enterprise/LICENSE
 */

import type { APIRoute } from 'astro';
import { Hono, type Context } from 'hono';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { WebStandardStreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js';
import { z } from 'zod';
import { join } from 'node:path';
import { isEventCatalogScaleEnabled } from '@utils/feature';
import * as catalogTools from '@enterprise/tools/catalog-tools';
import { getCollection } from 'astro:content';
import { createMcpAuthErrorResponse, validateMcpRequest } from './mcp-auth';
import { createScopedCatalogTools } from './mcp-scoped-tools';
import { McpScopeNotFoundError, resolveMcpScope, type McpScope, type McpScopeKind } from './mcp-scope';

const catalogDirectory = process.env.PROJECT_DIR || process.cwd();

// Helper to create consistent MCP tool handlers with error handling
function createToolHandler<T>(fn: (params: T) => Promise<any>, errorMessage: string) {
  return async (params: T) => {
    try {
      const result = await fn(params);

      if (result && 'error' in result) {
        return {
          content: [{ type: 'text' as const, text: JSON.stringify(result) }],
          isError: true,
        };
      }

      return {
        content: [{ type: 'text' as const, text: JSON.stringify(result, null, 2) }],
      };
    } catch (error) {
      return {
        content: [{ type: 'text' as const, text: JSON.stringify({ error: `${errorMessage}: ${error}` }) }],
        isError: true,
      };
    }
  };
}

// Load extended tools from user configuration
let extendedTools: Record<string, any> = {};
let extendedToolNames: string[] = [];

try {
  const providerConfiguration = await import(/* @vite-ignore */ join(catalogDirectory, 'eventcatalog.chat.js'));

  if (isEventCatalogScaleEnabled() && providerConfiguration.tools) {
    extendedTools = providerConfiguration.tools;
    extendedToolNames = Object.keys(extendedTools);
  }
} catch (error) {
  // No chat configuration or tools defined - this is fine
}

// Create MCP Server with tools that access Astro collections
function createMcpServer(scope?: McpScope) {
  const server = new McpServer({
    name: scope ? `EventCatalog MCP Server — ${scope.name} ${scope.ref.kind}` : 'EventCatalog MCP Server',
    version: '1.0.0',
  });

  const tools = scope ? createScopedCatalogTools(scope) : catalogTools;

  // Register all built-in tools using the helper
  server.registerTool(
    'getResources',
    {
      description: catalogTools.toolDescriptions.getResources,
      inputSchema: z.object({
        collection: catalogTools.collectionSchema.describe('The collection to get the resources from'),
        cursor: z.string().optional().describe('Pagination cursor from previous response'),
        search: z.string().optional().describe('Search term to filter resources by name, id, or summary (case-insensitive)'),
      }),
    },
    createToolHandler(tools.getResources, 'Failed to get resources')
  );

  server.registerTool(
    'getResource',
    {
      description: catalogTools.toolDescriptions.getResource,
      inputSchema: z.object({
        collection: catalogTools.collectionSchema.describe('The collection to get the resource from'),
        id: z.string().describe('The id of the resource to get'),
        version: z.string().describe('The version of the resource to get'),
      }),
    },
    createToolHandler(tools.getResource, 'Failed to get resource')
  );

  server.registerTool(
    'getMessagesProducedOrConsumedByResource',
    {
      description: catalogTools.toolDescriptions.getMessagesProducedOrConsumedByResource,
      inputSchema: z.object({
        resourceId: z.string().describe('The id of the resource to get the messages produced or consumed for'),
        resourceVersion: z.string().describe('The version of the resource to get the messages produced or consumed for'),
        resourceCollection: catalogTools.resourceCollectionSchema
          .describe('The collection of the resource to get the messages produced or consumed for')
          .default('services'),
      }),
    },
    createToolHandler(tools.getMessagesProducedOrConsumedByResource, 'Failed to get messages')
  );

  server.registerTool(
    'getSchemaForResource',
    {
      description: catalogTools.toolDescriptions.getSchemaForResource,
      inputSchema: z.object({
        resourceId: z.string().describe('The id of the resource to get the schema for'),
        resourceVersion: z.string().describe('The version of the resource to get the schema for'),
        resourceCollection: catalogTools.resourceCollectionSchema
          .describe('The collection of the resource to get the schema for')
          .default('services'),
      }),
    },
    createToolHandler(tools.getSchemaForResource, 'Failed to get schema')
  );

  server.registerTool(
    'findResourcesByOwner',
    {
      description: catalogTools.toolDescriptions.findResourcesByOwner,
      inputSchema: z.object({
        ownerId: z.string().describe('The id of the owner (team or user) to find resources for'),
      }),
    },
    createToolHandler(tools.findResourcesByOwner, 'Failed to find resources')
  );

  server.registerTool(
    'getProducersOfMessage',
    {
      description: catalogTools.toolDescriptions.getProducersOfMessage,
      inputSchema: z.object({
        messageId: z.string().describe('The id of the message to find producers for'),
        messageVersion: z.string().describe('The version of the message'),
        messageCollection: catalogTools.messageCollectionSchema
          .describe('The collection type of the message (events, commands, or queries)')
          .default('events'),
      }),
    },
    createToolHandler(tools.getProducersOfMessage, 'Failed to get producers')
  );

  server.registerTool(
    'getConsumersOfMessage',
    {
      description: catalogTools.toolDescriptions.getConsumersOfMessage,
      inputSchema: z.object({
        messageId: z.string().describe('The id of the message to find consumers for'),
        messageVersion: z.string().describe('The version of the message'),
        messageCollection: catalogTools.messageCollectionSchema
          .describe('The collection type of the message (events, commands, or queries)')
          .default('events'),
      }),
    },
    createToolHandler(tools.getConsumersOfMessage, 'Failed to get consumers')
  );

  if (!scope) {
    server.registerTool(
      'getC4Diagram',
      {
        description: catalogTools.toolDescriptions.getC4Diagram,
        inputSchema: z.object({
          viewId: z.string().describe('The id of the LikeC4 view to return source files for').optional(),
        }),
      },
      createToolHandler(catalogTools.getC4Diagram, 'Failed to get c4 diagram')
    );
  }

  server.registerTool(
    'analyzeChangeImpact',
    {
      description: catalogTools.toolDescriptions.analyzeChangeImpact,
      inputSchema: z.object({
        messageId: z.string().describe('The id of the message to analyze impact for'),
        messageVersion: z.string().describe('The version of the message'),
        messageCollection: catalogTools.messageCollectionSchema
          .describe('The collection type of the message (events, commands, or queries)')
          .default('events'),
      }),
    },
    createToolHandler(tools.analyzeChangeImpact, 'Failed to analyze impact')
  );

  server.registerTool(
    'explainBusinessFlow',
    {
      description: catalogTools.toolDescriptions.explainBusinessFlow,
      inputSchema: z.object({
        flowId: z.string().describe('The id of the flow to explain'),
        flowVersion: z.string().describe('The version of the flow'),
      }),
    },
    createToolHandler(tools.explainBusinessFlow, 'Failed to explain flow')
  );

  if (!scope) {
    server.registerTool(
      'getTeams',
      {
        description: catalogTools.toolDescriptions.getTeams,
        inputSchema: z.object({
          cursor: z.string().optional().describe('Pagination cursor from previous response'),
        }),
      },
      createToolHandler(catalogTools.getTeams, 'Failed to get teams')
    );

    server.registerTool(
      'getTeam',
      {
        description: catalogTools.toolDescriptions.getTeam,
        inputSchema: z.object({
          id: z.string().describe('The id of the team to get'),
        }),
      },
      createToolHandler(catalogTools.getTeam, 'Failed to get team')
    );

    server.registerTool(
      'getUsers',
      {
        description: catalogTools.toolDescriptions.getUsers,
        inputSchema: z.object({
          cursor: z.string().optional().describe('Pagination cursor from previous response'),
        }),
      },
      createToolHandler(catalogTools.getUsers, 'Failed to get users')
    );

    server.registerTool(
      'getUser',
      {
        description: catalogTools.toolDescriptions.getUser,
        inputSchema: z.object({
          id: z.string().describe('The id of the user to get'),
        }),
      },
      createToolHandler(catalogTools.getUser, 'Failed to get user')
    );
  }

  server.registerTool(
    'findMessageBySchemaId',
    {
      description: catalogTools.toolDescriptions.findMessageBySchemaId,
      inputSchema: z.object({
        messageId: z.string().describe('The message id (from x-eventcatalog-id in the schema)'),
        messageVersion: z
          .string()
          .optional()
          .describe(
            'The message version (from x-eventcatalog-version in the schema). If not provided, returns the latest version.'
          ),
        collection: catalogTools.messageCollectionSchema
          .optional()
          .describe('Optional hint for which collection to search (events, commands, or queries)'),
      }),
    },
    createToolHandler(tools.findMessageBySchemaId, 'Failed to find message')
  );

  if (!scope || scope.ref.kind === 'domain') {
    server.registerTool(
      'explainUbiquitousLanguageTerms',
      {
        description: catalogTools.toolDescriptions.explainUbiquitousLanguageTerms,
        inputSchema: z.object({
          domainId: z.string().describe('The id of the domain to get ubiquitous language terms for'),
          domainVersion: z.string().optional().describe('The version of the domain. If not provided, uses the latest version.'),
        }),
      },
      createToolHandler(tools.explainUbiquitousLanguageTerms, 'Failed to get ubiquitous language terms')
    );
  }

  if (!scope) {
    server.registerTool(
      'getCustomDocs',
      {
        description: catalogTools.toolDescriptions.getCustomDocs,
        inputSchema: z.object({
          cursor: z.string().optional().describe('Pagination cursor from previous response'),
          search: z.string().optional().describe('Search term to filter docs by title, id, or summary (case-insensitive)'),
        }),
      },
      createToolHandler(catalogTools.getCustomDocs, 'Failed to get custom documentation pages')
    );

    server.registerTool(
      'searchCustomDocs',
      {
        description: catalogTools.toolDescriptions.searchCustomDocs,
        inputSchema: z.object({
          query: z.string().describe('Full-text search query, e.g. keywords describing the topic to find'),
          limit: z.number().optional().describe('Maximum number of results to return (default 10)'),
        }),
      },
      createToolHandler(catalogTools.searchCustomDocs, 'Failed to search custom documentation')
    );

    server.registerTool(
      'getCustomDoc',
      {
        description: catalogTools.toolDescriptions.getCustomDoc,
        inputSchema: z.object({
          id: z.string().describe('The id or slug of the custom documentation page'),
          section: z.string().optional().describe('Optional section heading to return only that section of the page'),
        }),
      },
      createToolHandler(catalogTools.getCustomDoc, 'Failed to get custom documentation page')
    );
  }

  // Register extended tools from user configuration
  for (const [toolName, toolConfig] of Object.entries(scope ? {} : extendedTools)) {
    if (!toolConfig || typeof toolConfig !== 'object') continue;

    // Extract tool properties (Vercel AI SDK format)
    // The AI SDK tool() helper uses "inputSchema" for Zod schemas
    const { description, parameters, inputSchema, execute } = toolConfig;

    if (!description || !execute) {
      console.warn(`[MCP] Skipping invalid extended tool: ${toolName}`);
      continue;
    }

    server.registerTool(
      toolName,
      {
        description: description || `Custom tool: ${toolName}`,
        inputSchema: inputSchema || parameters || z.object({}),
      },
      async (params: any) => {
        try {
          const result = await execute(params);
          return {
            content: [{ type: 'text' as const, text: JSON.stringify(result, null, 2) }],
          };
        } catch (error) {
          return {
            content: [{ type: 'text' as const, text: JSON.stringify({ error: `Failed to execute ${toolName}: ${error}` }) }],
            isError: true,
          };
        }
      }
    );
  }

  // ============================================
  // Register MCP Resources
  // ============================================

  const resourceDefinitions = [
    {
      name: 'All Resources in EventCatalog',
      uri: 'eventcatalog://all',
      description: 'All messages, agents, domains and services in EventCatalog',
      collections: [
        'events',
        'commands',
        'queries',
        'agents',
        'services',
        'domains',
        'systems',
        'flows',
        'channels',
        'entities',
        'containers',
        'diagrams',
        'data-products',
        'adrs',
      ] as const,
    },
    {
      name: 'All Events in EventCatalog',
      uri: 'eventcatalog://events',
      description: 'All events in EventCatalog',
      collections: ['events'] as const,
    },
    {
      name: 'All Commands in EventCatalog',
      uri: 'eventcatalog://commands',
      description: 'All commands in EventCatalog',
      collections: ['commands'] as const,
    },
    {
      name: 'All Queries in EventCatalog',
      uri: 'eventcatalog://queries',
      description: 'All queries in EventCatalog',
      collections: ['queries'] as const,
    },
    {
      name: 'All Services in EventCatalog',
      uri: 'eventcatalog://services',
      description: 'All services in EventCatalog',
      collections: ['services'] as const,
    },
    {
      name: 'All Systems in EventCatalog',
      uri: 'eventcatalog://systems',
      description: 'All systems in EventCatalog',
      collections: ['systems'] as const,
    },
    {
      name: 'All Agents in EventCatalog',
      uri: 'eventcatalog://agents',
      description: 'All agents in EventCatalog',
      collections: ['agents'] as const,
    },
    {
      name: 'All Architecture Decision Records (adrs) in EventCatalog',
      uri: 'eventcatalog://adrs',
      description: 'All architecture decision records in EventCatalog',
      collections: ['adrs'] as const,
    },
    {
      name: 'All Domains in EventCatalog',
      uri: 'eventcatalog://domains',
      description: 'All domains in EventCatalog',
      collections: ['domains'] as const,
    },
    {
      name: 'All Diagrams in EventCatalog',
      uri: 'eventcatalog://diagrams',
      description: 'All diagrams in EventCatalog',
      collections: ['diagrams'] as const,
    },
    {
      name: 'All Channels in EventCatalog',
      uri: 'eventcatalog://channels',
      description: 'All channels in EventCatalog',
      collections: ['channels'] as const,
    },
    {
      name: 'All Entities in EventCatalog',
      uri: 'eventcatalog://entities',
      description: 'All entities in EventCatalog',
      collections: ['entities'] as const,
    },
    {
      name: 'All Containers  in EventCatalog',
      uri: 'eventcatalog://containers',
      description: 'All containers in EventCatalog',
      collections: ['containers'] as const,
    },
    {
      name: 'All Flows in EventCatalog',
      uri: 'eventcatalog://flows',
      description: 'All flows in EventCatalog',
      collections: ['flows'] as const,
    },
    {
      name: 'All Data Products in EventCatalog',
      uri: 'eventcatalog://data-products',
      description: 'All data products in EventCatalog',
      collections: ['data-products'] as const,
    },
    {
      name: 'All Teams in EventCatalog',
      uri: 'eventcatalog://teams',
      description: 'All teams in EventCatalog',
      collections: ['teams'] as const,
    },
    {
      name: 'All Users in EventCatalog',
      uri: 'eventcatalog://users',
      description: 'All users in EventCatalog',
      collections: ['users'] as const,
    },
  ];

  for (const resource of resourceDefinitions) {
    if (scope && resource.collections.every((collection) => collection === 'teams' || collection === 'users')) continue;

    const resourceUri = scope
      ? `${scope.uriPrefix}/resources${resource.uri === 'eventcatalog://all' ? '' : `/${resource.uri.replace('eventcatalog://', '')}`}`
      : resource.uri;
    const resourceName = scope ? resource.name.replace('in EventCatalog', `in ${scope.name} ${scope.ref.kind}`) : resource.name;
    const resourceDescription = scope
      ? resource.description.replace('in EventCatalog', `in ${scope.name} ${scope.ref.kind}`)
      : resource.description;

    server.registerResource(
      resourceName,
      resourceUri,
      { description: resourceDescription, mimeType: 'application/json' },
      async (uri: URL) => {
        const allResources: any[] = [];

        for (const collectionName of resource.collections) {
          try {
            const items = scope ? scope.list(collectionName) : await getCollection(collectionName as any);
            for (const item of items) {
              allResources.push({
                type: collectionName,
                id: (item as any).data.id,
                version: (item as any).data.version,
                name: (item as any).data.name || (item as any).data.id,
                summary: (item as any).data.summary,
              });
            }
          } catch {
            // Collection might not exist, skip it
          }
        }

        return {
          contents: [
            {
              uri: uri.href,
              text: JSON.stringify({ ...(scope && { scope: scope.ref }), resources: allResources }, null, 2),
              mimeType: 'application/json',
            },
          ],
        };
      }
    );
  }

  return server;
}

// MCP server and transport are created per-request to avoid
// "Stateless transport cannot be reused across requests" errors.

// Create Hono app for MCP routes
const app = new Hono().basePath('/docs/mcp');

const globalBuiltInTools = [
  'getResources',
  'getResource',
  'getMessagesProducedOrConsumedByResource',
  'getSchemaForResource',
  'findResourcesByOwner',
  'getProducersOfMessage',
  'getConsumersOfMessage',
  'getC4Diagram',
  'analyzeChangeImpact',
  'explainBusinessFlow',
  'getTeams',
  'getTeam',
  'getUsers',
  'getUser',
  'findMessageBySchemaId',
  'explainUbiquitousLanguageTerms',
  'getCustomDocs',
  'searchCustomDocs',
  'getCustomDoc',
];

const scopedBuiltInTools = globalBuiltInTools.filter(
  (tool) =>
    !['getC4Diagram', 'getTeams', 'getTeam', 'getUsers', 'getUser', 'getCustomDocs', 'searchCustomDocs', 'getCustomDoc'].includes(
      tool
    )
);

const getScopedBuiltInTools = (scope: McpScope) =>
  scope.ref.kind === 'system'
    ? scopedBuiltInTools.filter((tool) => tool !== 'explainUbiquitousLanguageTerms')
    : scopedBuiltInTools;

// MCP Resource URIs
const mcpResources = [
  'eventcatalog://all',
  'eventcatalog://events',
  'eventcatalog://commands',
  'eventcatalog://queries',
  'eventcatalog://agents',
  'eventcatalog://adrs',
  'eventcatalog://services',
  'eventcatalog://domains',
  'eventcatalog://systems',
  'eventcatalog://channels',
  'eventcatalog://entities',
  'eventcatalog://containers',
  'eventcatalog://diagrams',
  'eventcatalog://data-products',
  'eventcatalog://flows',
  'eventcatalog://teams',
  'eventcatalog://users',
];

const getMcpResourceUris = (scope?: McpScope) =>
  scope
    ? mcpResources
        .filter((uri) => uri !== 'eventcatalog://teams' && uri !== 'eventcatalog://users')
        .map(
          (uri) => `${scope.uriPrefix}/resources${uri === 'eventcatalog://all' ? '' : `/${uri.replace('eventcatalog://', '')}`}`
        )
    : mcpResources;

const getScopeRef = (c: Context, kind: McpScopeKind) => ({
  kind,
  id: c.req.param('id'),
  version: c.req.param('version') || 'latest',
});

const resolveRequestScope = async (c: Context, kind?: McpScopeKind) => (kind ? resolveMcpScope(getScopeRef(c, kind)) : undefined);

const createScopeNotFoundResponse = (error: McpScopeNotFoundError) =>
  new Response(JSON.stringify({ error: 'scope_not_found', message: error.message }), {
    status: 404,
    headers: { 'Content-Type': 'application/json' },
  });

const acceptsEventStream = (request: Request) =>
  request.headers.get('accept')?.toLowerCase().includes('text/event-stream') ?? false;

const createSseNotSupportedResponse = () =>
  new Response(
    JSON.stringify({
      jsonrpc: '2.0',
      error: { code: -32000, message: 'Method not allowed: this server does not provide an SSE stream.' },
      id: null,
    }),
    {
      status: 405,
      headers: { Allow: 'POST', 'Content-Type': 'application/json' },
    }
  );

const handleGetRequest = async (c: Context, kind?: McpScopeKind) => {
  const auth = await validateMcpRequest(c.req.raw);

  if (!auth.ok) {
    return createMcpAuthErrorResponse(auth);
  }

  // Streamable HTTP clients may open an optional GET SSE channel for server-initiated messages.
  // This endpoint is stateless and does not support that channel, so the MCP specification requires a 405.
  if (acceptsEventStream(c.req.raw)) return createSseNotSupportedResponse();

  try {
    const scope = await resolveRequestScope(c, kind);
    return c.json({
      name: scope ? `EventCatalog MCP Server — ${scope.name} ${scope.ref.kind}` : 'EventCatalog MCP Server',
      version: '1.2.0',
      status: 'running',
      ...(scope && { scope: scope.ref }),
      tools: scope ? getScopedBuiltInTools(scope) : [...globalBuiltInTools, ...extendedToolNames],
      extendedTools: !scope && extendedToolNames.length > 0 ? extendedToolNames : undefined,
      resources: getMcpResourceUris(scope),
    });
  } catch (error) {
    if (error instanceof McpScopeNotFoundError) return createScopeNotFoundResponse(error);
    throw error;
  }
};

const handleMcpRequest = async (c: Context, kind?: McpScopeKind) => {
  try {
    const auth = await validateMcpRequest(c.req.raw);

    if (!auth.ok) {
      return createMcpAuthErrorResponse(auth);
    }

    const scope = await resolveRequestScope(c, kind);
    const server = createMcpServer(scope);
    const transport = new WebStandardStreamableHTTPServerTransport({
      sessionIdGenerator: undefined,
    });
    await server.connect(transport);
    return await transport.handleRequest(c.req.raw);
  } catch (error) {
    if (error instanceof McpScopeNotFoundError) return createScopeNotFoundResponse(error);

    console.error('MCP request error:', error);
    return c.json(
      {
        jsonrpc: '2.0',
        error: {
          code: -32603,
          message: 'Internal server error',
        },
        id: null,
      },
      500
    );
  }
};

// Browser GETs return health metadata; MCP SSE negotiation is rejected with 405 because this server is stateless.
app.get('/', (c: Context) => handleGetRequest(c));

for (const kind of ['domain', 'system'] as const) {
  const path = `${kind}s`;
  app.get(`/${path}/:id`, (c: Context) => handleGetRequest(c, kind));
  app.get(`/${path}/:id/:version`, (c: Context) => handleGetRequest(c, kind));
  app.post(`/${path}/:id`, (c: Context) => handleMcpRequest(c, kind));
  app.post(`/${path}/:id/:version`, (c: Context) => handleMcpRequest(c, kind));
}

// MCP protocol endpoint - handles POST requests for MCP protocol
app.post('/', (c: Context) => handleMcpRequest(c));

// Astro API route handler - delegates all requests to Hono
// Note: SSR and Scale plan checks are handled at build time by the integration
// This route is only injected when isEventCatalogMCPEnabled() returns true
export const ALL: APIRoute = async ({ request }) => {
  return app.fetch(request);
};

// Disable prerendering for SSR
export const prerender = false;
