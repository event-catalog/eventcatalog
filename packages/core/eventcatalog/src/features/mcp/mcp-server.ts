import type { APIRoute } from 'astro';
import { Hono, type Context } from 'hono';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { WebStandardStreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js';
import { z } from 'zod';
import { join } from 'node:path';
import * as catalogTools from '@features/tools/catalog-tools';
import { getCollection } from 'astro:content';
import { createMcpAuthErrorResponse, validateMcpRequest } from './mcp-auth';
import { createScopedCatalogTools } from './mcp-scoped-tools';
import { McpScopeNotFoundError, resolveMcpScope, type McpScope, type McpScopeKind } from './mcp-scope';
import { getArchitectureDiagramView } from '@utils/node-graphs/architecture-diagram';
import type {
  ArchitectureDiagramCollection,
  ArchitectureDiagramView,
  Graph,
} from '@utils/node-graphs/architecture-diagram-types';
import { inlineNodeIcons } from './mcp-app-icons';
import type { ArchitectureDiagramPayload } from './apps/architecture-diagram/shared';
import type { SchemaViewerPayload } from './apps/schema-viewer/shared';
import { RESOURCE_VIEWS, VIEWER_META_KEY, VIEWER_RESOURCE_URI, VIEWER_VIEW_TOOL, type ViewerPayload } from './apps/viewer/shared';
import { toSchemaViewerSchemas } from './schema-viewer';
import { getMcpAppViewLoader, mcpAppNote, registerMcpApp } from './mcp-apps';
import { buildUrl } from '@utils/url-builder';
import { isCanvasEnabled } from '@utils/feature';
import { CANVAS_TOOL_NAMES, registerCanvasTools } from '@features/studio/server/canvas-mcp';
import { findStudioRuntime } from '@features/studio/server/runtime';

const loadViewerView = getMcpAppViewLoader('viewer');

const SHOW_RESOURCE_DESCRIPTION = [
  "Show the user a resource in EventCatalog's interactive viewer. Pick what to show with view:",
  '"architecture" shows an architecture diagram of a domain, system, service, agent, event, command, query, flow, data store or data product: what it connects to, what it publishes and consumes, and the systems and domains around it. Use it whenever the user wants to see or understand how something works or fits together, e.g. "show me how the Order Service works", "how does the Ordering domain fit together", "what does Payments talk to", or asks for a diagram, map or visual of something. Prefer it over drawing your own diagram. For domains and systems, pass detail "overview" for just the domains, systems and their relationships, or "full" (default) to include services, messages and channels.',
  '"schema" shows the schema of a message (event, command or query) or other resource: its properties, types, descriptions and which ones are required. Use it whenever the user wants to see or understand a schema or payload, e.g. "show me the schema for OrderCreated", "what fields does PlaceOrder have", "what does the OrderShipped payload look like".',
  'Clients that support MCP Apps show one viewer and switch it to each thing you show, so call this again to show the user something else. The result also contains what is shown (the diagram as Mermaid in mermaidCode, or the schema code) so you can understand it.',
  'When the client shows the viewer, do not redraw the diagram or print the whole schema again in your reply: explain it and point out what matters. Otherwise, show the user the mermaidCode or the relevant parts of the schema code.',
].join(' ');

type McpServerOptions = {
  /** Where this EventCatalog is served, for links from MCP App views back to it */
  catalogUrl: string;
  /** The MCP client's user agent, to name agents that join a canvas */
  userAgent?: string;
};

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

  if (providerConfiguration.tools) {
    extendedTools = providerConfiguration.tools;
    extendedToolNames = Object.keys(extendedTools);
  }
} catch (error) {
  // No chat configuration or tools defined - this is fine
}

const MCP_SERVER_VERSION = '1.3.0';

// Every built-in tool only reads the catalog, so clients can safely auto-approve them
const readOnlyAnnotations = {
  readOnlyHint: true,
  destructiveHint: false,
  idempotentHint: true,
  openWorldHint: false,
} as const;

const optionalVersion = (resource: string) =>
  z.string().optional().describe(`The version of the ${resource}. Omit it (or pass "latest") to use the latest version.`);

function getServerInstructions(scope?: McpScope) {
  return [
    'EventCatalog documents an event-driven architecture: domains, systems, services, agents, the messages they exchange (events, commands, queries), channels, flows, entities, data products, schemas, owners (teams and users) and custom documentation.',
    ...(scope
      ? [
          `This server is scoped to the ${scope.name} ${scope.ref.kind} (version ${scope.ref.version}). Only resources inside this ${scope.ref.kind} are available.`,
        ]
      : []),
    'Resources are identified by an id and a version. Versions are optional on every tool: omit the version to use the latest version.',
    'To find something, call getResources with a collection and a search term, then fetch the details with getResource. Use getSchemaForResource when you need a schema or OpenAPI/AsyncAPI specification for yourself, not to show it to the user.',
    'When the user wants to see or understand how something works or fits together (e.g. "show me how the Order Service works"), call showResource with view "architecture": it shows them an interactive diagram. Do not draw your own diagram of the architecture.',
    'When the user wants to see a schema, payload or the fields of a message (e.g. "show me the schema for OrderCreated"), call showResource with view "schema", not getSchemaForResource: it shows them an interactive schema viewer. Do not print the schema yourself.',
    'For relationships use getMessagesProducedOrConsumedByResource, getProducersOfMessage and getConsumersOfMessage. Before changing a message, call analyzeChangeImpact to find the affected services, agents and owning teams.',
    ...(scope
      ? []
      : [
          'Use findResourcesByOwner, getTeam and getUser to find who owns something and how to contact them. Guides, runbooks and architecture notes live in custom documentation: use searchCustomDocs, then getCustomDoc.',
        ]),
  ].join('\n');
}

// Create MCP Server with tools that access Astro collections
function createMcpServer(scope: McpScope | undefined, { catalogUrl, userAgent }: McpServerOptions) {
  const server = new McpServer(
    {
      name: scope ? `EventCatalog MCP Server — ${scope.name} ${scope.ref.kind}` : 'EventCatalog MCP Server',
      version: MCP_SERVER_VERSION,
    },
    { instructions: getServerInstructions(scope) }
  );

  const tools = scope ? createScopedCatalogTools(scope) : catalogTools;

  // Register all built-in tools using the helper
  server.registerTool(
    'getResources',
    {
      title: 'List catalog resources',
      description: catalogTools.toolDescriptions.getResources,
      inputSchema: z.object({
        collection: catalogTools.collectionSchema.describe('The collection to get the resources from'),
        cursor: z.string().optional().describe('Pagination cursor from previous response'),
        search: z.string().optional().describe('Search term to filter resources by name, id, or summary (case-insensitive)'),
      }),
      annotations: readOnlyAnnotations,
    },
    createToolHandler(tools.getResources, 'Failed to get resources')
  );

  server.registerTool(
    'getResource',
    {
      title: 'Get a catalog resource',
      description: catalogTools.toolDescriptions.getResource,
      inputSchema: z.object({
        collection: catalogTools.collectionSchema.describe('The collection to get the resource from'),
        id: z.string().describe('The id of the resource to get'),
        version: optionalVersion('resource'),
      }),
      annotations: readOnlyAnnotations,
    },
    createToolHandler(tools.getResource, 'Failed to get resource')
  );

  server.registerTool(
    'getMessagesProducedOrConsumedByResource',
    {
      title: 'Get messages a resource sends and receives',
      description: catalogTools.toolDescriptions.getMessagesProducedOrConsumedByResource,
      inputSchema: z.object({
        resourceId: z.string().describe('The id of the resource to get the messages produced or consumed for'),
        resourceVersion: optionalVersion('resource'),
        resourceCollection: catalogTools.resourceCollectionSchema
          .describe('The collection of the resource to get the messages produced or consumed for')
          .default('services'),
      }),
      annotations: readOnlyAnnotations,
    },
    createToolHandler(tools.getMessagesProducedOrConsumedByResource, 'Failed to get messages')
  );

  server.registerTool(
    'getSchemaForResource',
    {
      title: 'Get schemas and specifications',
      description: `${catalogTools.toolDescriptions.getSchemaForResource}. To show the user a schema, use showResource with view "schema" instead: it shows them an interactive schema viewer.`,
      inputSchema: z.object({
        resourceId: z.string().describe('The id of the resource to get the schema for'),
        resourceVersion: optionalVersion('resource'),
        resourceCollection: catalogTools.resourceCollectionSchema
          .describe('The collection of the resource to get the schema for')
          .default('services'),
      }),
      annotations: readOnlyAnnotations,
    },
    createToolHandler(tools.getSchemaForResource, 'Failed to get schema')
  );

  server.registerTool(
    'findResourcesByOwner',
    {
      title: 'Find resources by owner',
      description: catalogTools.toolDescriptions.findResourcesByOwner,
      inputSchema: z.object({
        ownerId: z.string().describe('The id of the owner (team or user) to find resources for'),
      }),
      annotations: readOnlyAnnotations,
    },
    createToolHandler(tools.findResourcesByOwner, 'Failed to find resources')
  );

  server.registerTool(
    'getProducersOfMessage',
    {
      title: 'Find producers of a message',
      description: catalogTools.toolDescriptions.getProducersOfMessage,
      inputSchema: z.object({
        messageId: z.string().describe('The id of the message to find producers for'),
        messageVersion: optionalVersion('message'),
        messageCollection: catalogTools.messageCollectionSchema
          .describe('The collection type of the message (events, commands, or queries)')
          .default('events'),
      }),
      annotations: readOnlyAnnotations,
    },
    createToolHandler(tools.getProducersOfMessage, 'Failed to get producers')
  );

  server.registerTool(
    'getConsumersOfMessage',
    {
      title: 'Find consumers of a message',
      description: catalogTools.toolDescriptions.getConsumersOfMessage,
      inputSchema: z.object({
        messageId: z.string().describe('The id of the message to find consumers for'),
        messageVersion: optionalVersion('message'),
        messageCollection: catalogTools.messageCollectionSchema
          .describe('The collection type of the message (events, commands, or queries)')
          .default('events'),
      }),
      annotations: readOnlyAnnotations,
    },
    createToolHandler(tools.getConsumersOfMessage, 'Failed to get consumers')
  );

  if (!scope) {
    server.registerTool(
      'getC4Diagram',
      {
        title: 'Get C4 (LikeC4) diagrams',
        description: catalogTools.toolDescriptions.getC4Diagram,
        inputSchema: z.object({
          viewId: z.string().describe('The id of the LikeC4 view to return source files for').optional(),
        }),
        annotations: readOnlyAnnotations,
      },
      createToolHandler(catalogTools.getC4Diagram, 'Failed to get c4 diagram')
    );
  }

  server.registerTool(
    'analyzeChangeImpact',
    {
      title: 'Analyze the impact of changing a message',
      description: catalogTools.toolDescriptions.analyzeChangeImpact,
      inputSchema: z.object({
        messageId: z.string().describe('The id of the message to analyze impact for'),
        messageVersion: optionalVersion('message'),
        messageCollection: catalogTools.messageCollectionSchema
          .describe('The collection type of the message (events, commands, or queries)')
          .default('events'),
      }),
      annotations: readOnlyAnnotations,
    },
    createToolHandler(tools.analyzeChangeImpact, 'Failed to analyze impact')
  );

  server.registerTool(
    'explainBusinessFlow',
    {
      title: 'Explain a business flow',
      description: catalogTools.toolDescriptions.explainBusinessFlow,
      inputSchema: z.object({
        flowId: z.string().describe('The id of the flow to explain'),
        flowVersion: optionalVersion('flow'),
      }),
      annotations: readOnlyAnnotations,
    },
    createToolHandler(tools.explainBusinessFlow, 'Failed to explain flow')
  );

  if (!scope) {
    server.registerTool(
      'getTeams',
      {
        title: 'List teams',
        description: catalogTools.toolDescriptions.getTeams,
        inputSchema: z.object({
          cursor: z.string().optional().describe('Pagination cursor from previous response'),
        }),
        annotations: readOnlyAnnotations,
      },
      createToolHandler(catalogTools.getTeams, 'Failed to get teams')
    );

    server.registerTool(
      'getTeam',
      {
        title: 'Get a team',
        description: catalogTools.toolDescriptions.getTeam,
        inputSchema: z.object({
          id: z.string().describe('The id of the team to get'),
        }),
        annotations: readOnlyAnnotations,
      },
      createToolHandler(catalogTools.getTeam, 'Failed to get team')
    );

    server.registerTool(
      'getUsers',
      {
        title: 'List users',
        description: catalogTools.toolDescriptions.getUsers,
        inputSchema: z.object({
          cursor: z.string().optional().describe('Pagination cursor from previous response'),
        }),
        annotations: readOnlyAnnotations,
      },
      createToolHandler(catalogTools.getUsers, 'Failed to get users')
    );

    server.registerTool(
      'getUser',
      {
        title: 'Get a user',
        description: catalogTools.toolDescriptions.getUser,
        inputSchema: z.object({
          id: z.string().describe('The id of the user to get'),
        }),
        annotations: readOnlyAnnotations,
      },
      createToolHandler(catalogTools.getUser, 'Failed to get user')
    );
  }

  // Icons served by EventCatalog don't load in the host's sandbox, so they are embedded in the diagram
  const withInlineIcons = async ({ overview, hiddenMessages, ...graph }: ArchitectureDiagramView) => {
    const publicDirectory = join(catalogDirectory, 'public');
    const inline = async (level: Graph) => ({ ...level, nodes: await inlineNodeIcons(level.nodes, publicDirectory) });
    return {
      ...(await inline(graph)),
      ...(overview && { overview: await inline(overview) }),
      ...(hiddenMessages && { hiddenMessages: await inline(hiddenMessages) }),
    };
  };

  const getResourceName = async (diagram: { resourceCollection: string; resourceId: string; resourceVersion: string }) => {
    const resource = await catalogTools.getResource({
      collection: diagram.resourceCollection,
      id: diagram.resourceId,
      version: diagram.resourceVersion,
    });
    return ('data' in resource && resource.data.name) || diagram.resourceId;
  };

  // The diagram with its levels for the MCP App view, as the resource's Diagram page shows it
  const getArchitectureDiagramPayload = async (diagram: {
    resourceCollection: ArchitectureDiagramCollection;
    resourceId: string;
    resourceVersion: string;
    visualiserUrl: string;
  }): Promise<ArchitectureDiagramPayload> => ({
    resource: {
      collection: diagram.resourceCollection,
      id: diagram.resourceId,
      version: diagram.resourceVersion,
      name: await getResourceName(diagram),
    },
    catalogUrl,
    visualiserPath: diagram.visualiserUrl,
    view: await withInlineIcons(
      await getArchitectureDiagramView({
        collection: diagram.resourceCollection,
        id: diagram.resourceId,
        version: diagram.resourceVersion,
      })
    ),
  });

  // The resource's schemas, parsed for the view's JSON Schema, Avro and Protobuf viewers
  const getSchemaViewerPayload = async (params: {
    resourceId: string;
    resourceVersion?: string;
    resourceCollection: string;
  }): Promise<SchemaViewerPayload | { error: string }> => {
    const resource = await tools.getResource({
      collection: params.resourceCollection,
      id: params.resourceId,
      version: params.resourceVersion,
    });
    if (resource.error !== undefined) return { error: resource.error };

    const schemas = await tools.getSchemaForResource({ ...params, resourceVersion: resource.version });
    if ('error' in schemas) return schemas;

    return {
      resource: {
        collection: params.resourceCollection,
        id: resource.id,
        version: resource.version,
        name: resource.data.name || resource.id,
      },
      catalogUrl,
      docsPath: buildUrl(`/docs/${params.resourceCollection}/${resource.id}/${resource.version}`),
      schemas: Array.isArray(schemas) ? toSchemaViewerSchemas(schemas) : [],
    };
  };

  // Every collection that has an architecture diagram or a schema
  const viewCollectionSchema = z.enum([
    ...new Set([...catalogTools.resourceCollectionSchema.options, ...catalogTools.visualiserCollectionSchema.options]),
  ] as [string, ...string[]]);

  const resourceViewInput = {
    view: z
      .enum(RESOURCE_VIEWS)
      .describe('What to show: "architecture" for an architecture diagram, "schema" for the schema of a message'),
    resourceId: z.string().describe('The id of the resource to show'),
    resourceVersion: optionalVersion('resource'),
    resourceCollection: viewCollectionSchema.describe('The collection of the resource (defaults to events)').default('events'),
  };

  type ResourceViewParams = {
    view: (typeof RESOURCE_VIEWS)[number];
    resourceId: string;
    resourceVersion?: string;
    resourceCollection: string;
    detail?: 'overview' | 'full';
  };

  const loadArchitectureView = async ({ view, ...params }: ResourceViewParams) => {
    const result = await tools.getArchitectureDiagramAsMermaid(params);
    if (result.error !== undefined) return { error: result.error };
    return {
      forModel: {
        note: mcpAppNote('diagram', 'redraw it as Mermaid or ASCII', 'show the user the mermaidCode'),
        view,
        ...result,
      },
      label: `the architecture diagram for ${result.resourceCollection}/${result.resourceId}`,
      getPayload: async (): Promise<ViewerPayload> => ({
        view: 'architecture',
        diagram: await getArchitectureDiagramPayload(result),
      }),
    };
  };

  const loadSchemaView = async ({ view, ...params }: ResourceViewParams) => {
    const payload = await getSchemaViewerPayload(params);
    if ('error' in payload) return payload;
    const { resource, schemas } = payload;
    return {
      // The model reads the schema code; the view gets it parsed for its Properties tab
      forModel: {
        note: mcpAppNote('schema', 'print the whole schema again', 'show the user the relevant parts of the code'),
        view,
        resourceId: resource.id,
        resourceVersion: resource.version,
        resourceCollection: resource.collection,
        resource,
        schemas: schemas.map(({ name, format, code }) => ({ name, format, code })),
        ...(schemas.length === 0 && { message: `${resource.name} has no schema` }),
      },
      label: `the schema for ${resource.collection}/${resource.id}`,
      getPayload: async (): Promise<ViewerPayload> => ({ view: 'schema', schema: payload }),
    };
  };

  registerMcpApp(server, {
    loadView: loadViewerView,
    resource: {
      name: 'EventCatalog viewer',
      uri: VIEWER_RESOURCE_URI,
      description:
        'Interactive EventCatalog viewer (architecture diagrams and schemas), shown by MCP hosts that support MCP Apps',
      // Diagram nodes show icons (languages, databases...) served by this EventCatalog
      csp: { resourceDomains: [catalogUrl] },
      // Diagrams and schemas need the room, so hosts that can open the viewer full screen straight away
      displayModes: { preferred: 'fullscreen', available: ['inline', 'fullscreen'] },
    },
    // One viewer per server: each result updates the viewer the host already shows
    sessionId: scope ? `eventcatalog:${scope.ref.kind}:${scope.ref.id}` : 'eventcatalog',
    metaKey: VIEWER_META_KEY,
    tool: {
      name: 'showResource',
      title: 'Show a resource',
      description: SHOW_RESOURCE_DESCRIPTION,
      input: {
        ...resourceViewInput,
        detail: z
          .enum(['overview', 'full'])
          .optional()
          .describe(
            'For view "architecture" of domains and systems: "overview" shows only domains, systems and their relationships; "full" (default) also shows services, messages and channels'
          ),
      },
    },
    viewTool: {
      name: VIEWER_VIEW_TOOL,
      title: 'Load a resource for the viewer',
      description:
        'Loads the architecture diagram or schema shown by the EventCatalog viewer. To show the user a resource, use showResource instead.',
      input: resourceViewInput,
    },
    annotations: readOnlyAnnotations,
    errorMessage: 'Failed to show resource',
    load: (params) => (params.view === 'schema' ? loadSchemaView(params) : loadArchitectureView(params)),
  });

  server.registerTool(
    'findMessageBySchemaId',
    {
      title: 'Find a message from a schema',
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
      annotations: readOnlyAnnotations,
    },
    createToolHandler(tools.findMessageBySchemaId, 'Failed to find message')
  );

  if (!scope || scope.ref.kind === 'domain') {
    server.registerTool(
      'explainUbiquitousLanguageTerms',
      {
        title: 'Explain ubiquitous language terms',
        description: catalogTools.toolDescriptions.explainUbiquitousLanguageTerms,
        inputSchema: z.object({
          domainId: z.string().describe('The id of the domain to get ubiquitous language terms for'),
          domainVersion: optionalVersion('domain'),
        }),
        annotations: readOnlyAnnotations,
      },
      createToolHandler(tools.explainUbiquitousLanguageTerms, 'Failed to get ubiquitous language terms')
    );
  }

  if (!scope) {
    server.registerTool(
      'getDataProductInputs',
      {
        title: 'Get data product inputs',
        description: catalogTools.toolDescriptions.getDataProductInputs,
        inputSchema: z.object({
          dataProductId: z.string().describe('The id of the data product'),
          dataProductVersion: optionalVersion('data product'),
        }),
        annotations: readOnlyAnnotations,
      },
      createToolHandler(catalogTools.getDataProductInputs, 'Failed to get data product inputs')
    );

    server.registerTool(
      'getDataProductOutputs',
      {
        title: 'Get data product outputs and contracts',
        description: catalogTools.toolDescriptions.getDataProductOutputs,
        inputSchema: z.object({
          dataProductId: z.string().describe('The id of the data product'),
          dataProductVersion: optionalVersion('data product'),
        }),
        annotations: readOnlyAnnotations,
      },
      createToolHandler(catalogTools.getDataProductOutputs, 'Failed to get data product outputs')
    );

    server.registerTool(
      'getCustomDocs',
      {
        title: 'List custom documentation',
        description: catalogTools.toolDescriptions.getCustomDocs,
        inputSchema: z.object({
          cursor: z.string().optional().describe('Pagination cursor from previous response'),
          search: z.string().optional().describe('Search term to filter docs by title, id, or summary (case-insensitive)'),
        }),
        annotations: readOnlyAnnotations,
      },
      createToolHandler(catalogTools.getCustomDocs, 'Failed to get custom documentation pages')
    );

    server.registerTool(
      'searchCustomDocs',
      {
        title: 'Search custom documentation',
        description: catalogTools.toolDescriptions.searchCustomDocs,
        inputSchema: z.object({
          query: z.string().describe('Full-text search query, e.g. keywords describing the topic to find'),
          limit: z.number().optional().describe('Maximum number of results to return (default 10)'),
        }),
        annotations: readOnlyAnnotations,
      },
      createToolHandler(catalogTools.searchCustomDocs, 'Failed to search custom documentation')
    );

    server.registerTool(
      'getCustomDoc',
      {
        title: 'Get a custom documentation page',
        description: catalogTools.toolDescriptions.getCustomDoc,
        inputSchema: z.object({
          id: z.string().describe('The id or slug of the custom documentation page'),
          section: z.string().optional().describe('Optional section heading to return only that section of the page'),
        }),
        annotations: readOnlyAnnotations,
      },
      createToolHandler(catalogTools.getCustomDoc, 'Failed to get custom documentation page')
    );
  }

  // Register extended tools from user configuration
  for (const [toolName, toolConfig] of Object.entries(scope ? {} : extendedTools)) {
    if (!toolConfig || typeof toolConfig !== 'object') continue;

    // Extract tool properties (Vercel AI SDK format)
    // The AI SDK tool() helper uses "inputSchema" for Zod schemas
    const { title, description, parameters, inputSchema, annotations, execute } = toolConfig;

    if (!description || !execute) {
      console.warn(`[MCP] Skipping invalid extended tool: ${toolName}`);
      continue;
    }

    server.registerTool(
      toolName,
      {
        ...(title && { title }),
        description: description || `Custom tool: ${toolName}`,
        inputSchema: inputSchema || parameters || z.object({}),
        ...(annotations && { annotations }),
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

  // Collaborative canvases (when the collaboration server runs in this process)
  if (!scope && isCanvasEnabled()) registerCanvasTools(server, { catalogUrl, userAgent });

  return server;
}

// MCP server and transport are created per-request to avoid
// "Stateless transport cannot be reused across requests" errors.

// Create Hono app for MCP routes
// Not strict, so /docs/mcp/ works too: MCP clients are often configured with a trailing slash
const app = new Hono({ strict: false }).basePath('/docs/mcp');

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
  'getDataProductInputs',
  'getDataProductOutputs',
  'showResource',
  'getCustomDocs',
  'searchCustomDocs',
  'getCustomDoc',
];

const globalOnlyTools = [
  'getC4Diagram',
  'getTeams',
  'getTeam',
  'getUsers',
  'getUser',
  'getDataProductInputs',
  'getDataProductOutputs',
  'getCustomDocs',
  'searchCustomDocs',
  'getCustomDoc',
];

const scopedBuiltInTools = globalBuiltInTools.filter((tool) => !globalOnlyTools.includes(tool));

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
  id: c.req.param('id') ?? '',
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
      version: MCP_SERVER_VERSION,
      status: 'running',
      ...(scope && { scope: scope.ref }),
      tools: scope
        ? getScopedBuiltInTools(scope)
        : [...globalBuiltInTools, ...(isCanvasEnabled() && findStudioRuntime() ? CANVAS_TOOL_NAMES : []), ...extendedToolNames],
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
    const server = createMcpServer(scope, {
      catalogUrl: new URL(c.req.url).origin,
      userAgent: c.req.header('user-agent'),
    });
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
// Note: SSR checks are handled at build time by the integration
// This route is only injected when isEventCatalogMCPEnabled() or isCanvasEnabled() returns true
export const ALL: APIRoute = async ({ request }) => {
  return app.fetch(request);
};

// Disable prerendering for SSR
export const prerender = false;
