import type { APIRoute } from 'astro';
import { Hono } from 'hono';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { WebStandardStreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js';
import { z } from 'zod';
import { join } from 'node:path';
import { isEventCatalogScaleEnabled, isSSR } from '@utils/feature';
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
  collectionSchema,
  resourceCollectionSchema,
  messageCollectionSchema,
  toolDescriptions,
} from '@enterprise/tools/catalog-tools';

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
      async (params) => {
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

// Health check endpoint
app.get('/', async (c) => {
  return c.json({
    name: 'EventCatalog MCP Server',
    version: '1.0.0',
    status: 'running',
    tools: [...builtInTools, ...extendedToolNames],
    extendedTools: extendedToolNames.length > 0 ? extendedToolNames : undefined,
  });
});

// MCP protocol endpoint - handles POST requests for MCP protocol
app.post('/', async (c) => {
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
export const ALL: APIRoute = async ({ request }) => {
  // Check if SSR mode is enabled
  if (!isSSR()) {
    return new Response(
      JSON.stringify({
        error: 'ssr_required',
        message: 'MCP Server requires SSR mode. Set output: "server" in your eventcatalog.config.js',
      }),
      {
        status: 501,
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-store',
        },
      }
    );
  }

  // Check if Scale plan is enabled
  if (!isEventCatalogScaleEnabled()) {
    return new Response(
      JSON.stringify({
        error: 'feature_not_available',
        message:
          'MCP Server is only available with EventCatalog Scale. Visit https://eventcatalog.dev/pricing for more information.',
      }),
      {
        status: 501,
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-store',
        },
      }
    );
  }

  return app.fetch(request);
};

// Disable prerendering for SSR
export const prerender = false;
