import type { APIRoute } from 'astro';
import { Hono, type Context } from 'hono';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { WebStandardStreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js';
import { z } from 'zod';
import { join } from 'node:path';
import { isEventCatalogScaleEnabled } from '@utils/feature';
import {
  getResources,
  getResource,
  getMessagesProducedOrConsumedByResource,
  getSchemaForResource,
  findResourcesByOwner,
  getProducersOfMessage,
  getConsumersOfMessage,
  analyzeChangeImpact,
  explainBusinessFlow,
  getTeams,
  getTeam,
  getUsers,
  getUser,
  findMessageBySchemaId,
  explainUbiquitousLanguageTerms,
  collectionSchema,
  resourceCollectionSchema,
  messageCollectionSchema,
  toolDescriptions,
} from '@enterprise/tools/catalog-tools';
import { getCollection } from 'astro:content';

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
function createMcpServer() {
  const server = new McpServer({
    name: 'EventCatalog MCP Server',
    version: '1.0.0',
  });

  // Register all built-in tools using the helper
  server.registerTool(
    'getResources',
    {
      description: toolDescriptions.getResources,
      inputSchema: z.object({
        collection: collectionSchema.describe('The collection to get the resources from'),
        cursor: z.string().optional().describe('Pagination cursor from previous response'),
        search: z.string().optional().describe('Search term to filter resources by name, id, or summary (case-insensitive)'),
      }),
    },
    createToolHandler(getResources, 'Failed to get resources')
  );

  server.registerTool(
    'getResource',
    {
      description: toolDescriptions.getResource,
      inputSchema: z.object({
        collection: collectionSchema.describe('The collection to get the resource from'),
        id: z.string().describe('The id of the resource to get'),
        version: z.string().describe('The version of the resource to get'),
      }),
    },
    createToolHandler(getResource, 'Failed to get resource')
  );

  server.registerTool(
    'getMessagesProducedOrConsumedByResource',
    {
      description: toolDescriptions.getMessagesProducedOrConsumedByResource,
      inputSchema: z.object({
        resourceId: z.string().describe('The id of the resource to get the messages produced or consumed for'),
        resourceVersion: z.string().describe('The version of the resource to get the messages produced or consumed for'),
        resourceCollection: resourceCollectionSchema
          .describe('The collection of the resource to get the messages produced or consumed for')
          .default('services'),
      }),
    },
    createToolHandler(getMessagesProducedOrConsumedByResource, 'Failed to get messages')
  );

  server.registerTool(
    'getSchemaForResource',
    {
      description: toolDescriptions.getSchemaForResource,
      inputSchema: z.object({
        resourceId: z.string().describe('The id of the resource to get the schema for'),
        resourceVersion: z.string().describe('The version of the resource to get the schema for'),
        resourceCollection: resourceCollectionSchema
          .describe('The collection of the resource to get the schema for')
          .default('services'),
      }),
    },
    createToolHandler(getSchemaForResource, 'Failed to get schema')
  );

  server.registerTool(
    'findResourcesByOwner',
    {
      description: toolDescriptions.findResourcesByOwner,
      inputSchema: z.object({
        ownerId: z.string().describe('The id of the owner (team or user) to find resources for'),
      }),
    },
    createToolHandler(findResourcesByOwner, 'Failed to find resources')
  );

  server.registerTool(
    'getProducersOfMessage',
    {
      description: toolDescriptions.getProducersOfMessage,
      inputSchema: z.object({
        messageId: z.string().describe('The id of the message to find producers for'),
        messageVersion: z.string().describe('The version of the message'),
        messageCollection: messageCollectionSchema
          .describe('The collection type of the message (events, commands, or queries)')
          .default('events'),
      }),
    },
    createToolHandler(getProducersOfMessage, 'Failed to get producers')
  );

  server.registerTool(
    'getConsumersOfMessage',
    {
      description: toolDescriptions.getConsumersOfMessage,
      inputSchema: z.object({
        messageId: z.string().describe('The id of the message to find consumers for'),
        messageVersion: z.string().describe('The version of the message'),
        messageCollection: messageCollectionSchema
          .describe('The collection type of the message (events, commands, or queries)')
          .default('events'),
      }),
    },
    createToolHandler(getConsumersOfMessage, 'Failed to get consumers')
  );

  server.registerTool(
    'analyzeChangeImpact',
    {
      description: toolDescriptions.analyzeChangeImpact,
      inputSchema: z.object({
        messageId: z.string().describe('The id of the message to analyze impact for'),
        messageVersion: z.string().describe('The version of the message'),
        messageCollection: messageCollectionSchema
          .describe('The collection type of the message (events, commands, or queries)')
          .default('events'),
      }),
    },
    createToolHandler(analyzeChangeImpact, 'Failed to analyze impact')
  );

  server.registerTool(
    'explainBusinessFlow',
    {
      description: toolDescriptions.explainBusinessFlow,
      inputSchema: z.object({
        flowId: z.string().describe('The id of the flow to explain'),
        flowVersion: z.string().describe('The version of the flow'),
      }),
    },
    createToolHandler(explainBusinessFlow, 'Failed to explain flow')
  );

  server.registerTool(
    'getTeams',
    {
      description: toolDescriptions.getTeams,
      inputSchema: z.object({
        cursor: z.string().optional().describe('Pagination cursor from previous response'),
      }),
    },
    createToolHandler(getTeams, 'Failed to get teams')
  );

  server.registerTool(
    'getTeam',
    {
      description: toolDescriptions.getTeam,
      inputSchema: z.object({
        id: z.string().describe('The id of the team to get'),
      }),
    },
    createToolHandler(getTeam, 'Failed to get team')
  );

  server.registerTool(
    'getUsers',
    {
      description: toolDescriptions.getUsers,
      inputSchema: z.object({
        cursor: z.string().optional().describe('Pagination cursor from previous response'),
      }),
    },
    createToolHandler(getUsers, 'Failed to get users')
  );

  server.registerTool(
    'getUser',
    {
      description: toolDescriptions.getUser,
      inputSchema: z.object({
        id: z.string().describe('The id of the user to get'),
      }),
    },
    createToolHandler(getUser, 'Failed to get user')
  );

  server.registerTool(
    'findMessageBySchemaId',
    {
      description: toolDescriptions.findMessageBySchemaId,
      inputSchema: z.object({
        messageId: z.string().describe('The message id (from x-eventcatalog-id in the schema)'),
        messageVersion: z
          .string()
          .optional()
          .describe(
            'The message version (from x-eventcatalog-version in the schema). If not provided, returns the latest version.'
          ),
        collection: messageCollectionSchema
          .optional()
          .describe('Optional hint for which collection to search (events, commands, or queries)'),
      }),
    },
    createToolHandler(findMessageBySchemaId, 'Failed to find message')
  );

  server.registerTool(
    'explainUbiquitousLanguageTerms',
    {
      description: toolDescriptions.explainUbiquitousLanguageTerms,
      inputSchema: z.object({
        domainId: z.string().describe('The id of the domain to get ubiquitous language terms for'),
        domainVersion: z.string().optional().describe('The version of the domain. If not provided, uses the latest version.'),
      }),
    },
    createToolHandler(explainUbiquitousLanguageTerms, 'Failed to get ubiquitous language terms')
  );

  // Register extended tools from user configuration
  for (const [toolName, toolConfig] of Object.entries(extendedTools)) {
    if (!toolConfig || typeof toolConfig !== 'object') continue;

    // Extract tool properties (Vercel AI SDK format)
    const { description, parameters, execute } = toolConfig;

    if (!description || !execute) {
      console.warn(`[MCP] Skipping invalid extended tool: ${toolName}`);
      continue;
    }

    server.registerTool(
      toolName,
      {
        description: description || `Custom tool: ${toolName}`,
        inputSchema: parameters || z.object({}),
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
      description: 'All messages, domains and services in EventCatalog',
      collections: ['events', 'commands', 'queries', 'services', 'domains', 'flows', 'channels', 'entities'] as const,
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
    server.registerResource(
      resource.name,
      resource.uri,
      { description: resource.description, mimeType: 'application/json' },
      async (uri: URL) => {
        const allResources: any[] = [];

        for (const collectionName of resource.collections) {
          try {
            const items = await getCollection(collectionName as any);
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
              text: JSON.stringify({ resources: allResources }, null, 2),
              mimeType: 'application/json',
            },
          ],
        };
      }
    );
  }

  return server;
}

// Create a single MCP server instance
const mcpServer = createMcpServer();

// Create transport for handling requests
const transport = new WebStandardStreamableHTTPServerTransport({
  sessionIdGenerator: undefined, // Stateless mode
});

// Connect the server to the transport
let isConnected = false;

// Create Hono app for MCP routes
const app = new Hono().basePath('/docs/mcp');

// Built-in tool names derived from toolDescriptions
const builtInTools = Object.keys(toolDescriptions);

// MCP Resource URIs
const mcpResources = [
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

// Health check endpoint
app.get('/', async (c: Context) => {
  return c.json({
    name: 'EventCatalog MCP Server',
    version: '1.0.0',
    status: 'running',
    tools: [...builtInTools, ...extendedToolNames],
    extendedTools: extendedToolNames.length > 0 ? extendedToolNames : undefined,
    resources: mcpResources,
  });
});

// MCP protocol endpoint - handles POST requests for MCP protocol
app.post('/', async (c: Context) => {
  try {
    // Connect server to transport if not already connected
    if (!isConnected) {
      await mcpServer.connect(transport);
      isConnected = true;
    }

    // Handle the MCP request using the web standard transport
    return await transport.handleRequest(c.req.raw);
  } catch (error) {
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
});

// Astro API route handler - delegates all requests to Hono
// Note: SSR and Scale plan checks are handled at build time by the integration
// This route is only injected when isEventCatalogMCPEnabled() returns true
export const ALL: APIRoute = async ({ request }) => {
  return app.fetch(request);
};

// Disable prerendering for SSR
export const prerender = false;
