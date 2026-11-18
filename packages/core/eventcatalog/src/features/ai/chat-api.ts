import type { APIContext } from 'astro';
import {
  convertToModelMessages,
  createUIMessageStreamResponse,
  tool,
  type LanguageModel,
  type SystemModelMessage,
  type UIMessage,
} from 'ai';
import { importCatalogModule } from '@utils/catalog-modules';
import { isCanvasEnabled, isDevMode } from '@utils/feature';
import { z } from 'astro/zod';
import {
  getResources as getResourcesImpl,
  getResource as getResourceImpl,
  getMessagesProducedOrConsumedByResource as getMessagesImpl,
  getProducersOfMessage as getProducersOfMessageImpl,
  getConsumersOfMessage as getConsumersOfMessageImpl,
  findResourcesByOwner as findResourcesByOwnerImpl,
  getTeam as getTeamImpl,
  analyzeChangeImpact as analyzeChangeImpactImpl,
  explainUbiquitousLanguageTerms as explainUbiquitousLanguageTermsImpl,
  getSchemaForResource as getSchemaImpl,
  getDataProductInputs as getDataProductInputsImpl,
  getDataProductOutputs as getDataProductOutputsImpl,
  getArchitectureDiagramAsMermaid as getArchitectureDiagramImpl,
  getCustomDocs as getCustomDocsImpl,
  searchCustomDocs as searchCustomDocsImpl,
  getCustomDoc as getCustomDocImpl,
  collectionSchema,
  resourceCollectionSchema,
  messageCollectionSchema,
  visualiserCollectionSchema,
  architectureDiagramDetailSchema,
  toolDescriptions,
} from '@features/tools/catalog-tools';
import { MAX_CANVAS_STEPS, MAX_STEPS, callSettingsFrom, streamChatAnswer } from './chat-loop';

let hasChatConfiguration = false;
// Why eventcatalog.chat.js didn't load (e.g. its model provider package isn't installed)
let chatConfigurationError: string | undefined;
let model: LanguageModel;
let modelConfiguration: any;
let extendedTools: any;

try {
  const providerConfiguration = await importCatalogModule('eventcatalog.chat.js');
  model = await providerConfiguration.default();
  modelConfiguration = providerConfiguration.configuration || {};
  hasChatConfiguration = true;

  extendedTools = providerConfiguration.tools || {};
} catch (error) {
  console.error('[Chat] Error loading chat configuration', error);
  hasChatConfiguration = false;
  chatConfigurationError = error instanceof Error ? error.message : String(error);
}

// Built-in tools metadata for client visibility
const builtInToolsMetadata = [
  {
    name: 'getResources',
    description: 'Get events, services, commands, queries, flows, domains, systems, channels, entities from EventCatalog',
  },
  { name: 'getResource', description: 'Get a specific resource by its id and version' },
  { name: 'getMessagesProducedOrConsumedByResource', description: 'Get messages produced or consumed by a resource' },
  { name: 'getProducersOfMessage', description: 'Get the producers for a message' },
  { name: 'getConsumersOfMessage', description: 'Get the consumers for a message' },
  { name: 'findResourcesByOwner', description: 'Find what a team or user owns' },
  { name: 'getTeam', description: 'Get a team, its members and how to contact them' },
  { name: 'analyzeChangeImpact', description: 'Find what a change to a message affects, and the teams that own it' },
  { name: 'explainUbiquitousLanguageTerms', description: "Explain a domain's business terms" },
  { name: 'getSchemaForResource', description: 'Get the schema or specifications (OpenAPI, AsyncAPI, GraphQL) for a resource' },
  { name: 'getDataProductInputs', description: 'Get the inputs (resources consumed) for a data product' },
  { name: 'getDataProductOutputs', description: 'Get the outputs (resources produced) for a data product with data contracts' },
  { name: 'getArchitectureDiagramAsMermaid', description: 'Get the architecture diagram for a resource as Mermaid code' },
  { name: 'getCustomDocs', description: 'List custom documentation pages (guides, runbooks, architecture notes)' },
  { name: 'searchCustomDocs', description: 'Search the full text of custom documentation pages' },
  { name: 'getCustomDoc', description: 'Get the markdown content of a custom documentation page' },
];

// Get extended tools metadata from user configuration
const getExtendedToolsMetadata = () => {
  if (!extendedTools || typeof extendedTools !== 'object') return [];
  return Object.entries(extendedTools).map(([name, toolConfig]: [string, any]) => ({
    name,
    description: toolConfig?.description || 'Custom tool',
    isCustom: true,
  }));
};

// The same on every request, so providers can cache it: the page the user is on goes in a message after it
const getBaseSystemPrompt = (
  maxSteps: number
) => `You are an expert in software architecture and domain-driven design, specializing in the open source tool EventCatalog.

You assist developers, architects, and business stakeholders who need information about their software architecture catalog.

There are many different resource types in EventCatalog, including:
- Events (collection name 'events') (asynchronous messages that notify about something that has happened)
  - example docs url: /docs/events/MyEvent/1.0.0
- Commands (collection name 'commands') (requests to perform an action)
  - example docs url: /docs/commands/MyCommand/1.0.0
- Queries (collection name 'queries') (requests for information)
  - example docs url: /docs/queries/MyQuery/1.0.0
- Services (collection name 'services') (bounded contexts or applications that produce/consume events)
  - example docs url: /docs/services/MyService/1.0.0
- Domains (collection name 'domains') (business capabilities or functional areas)
  - example docs url: /docs/domains/MyDomain/1.0.0
- Systems (collection name 'systems') (groups of services, data stores and other resources that work together, inside a domain)
  - example docs url: /docs/systems/MySystem/1.0.0
- Flows (collection name 'flows') (state machines)
  - example docs url: /docs/flows/MyFlow/1.0.0
- Channels (collection name 'channels') (communication channels)
  - example docs url: /docs/channels/MyChannel/1.0.0
- Entities (collection name 'entities') (data objects)
  - example docs url: /docs/entities/MyEntity/1.0.0
- Containers (collection name 'containers') (at the moment these are data stores (databases))
  - example docs url: /docs/containers/MyContainer/1.0.0
- Data Products (collection name 'data-products') (data products that have inputs and outputs, and may have data contracts)
  - example docs url: /docs/data-products/MyDataProduct/1.0.0

The user will ask you some questions about the software architecture catalog, you should use the tools provided to you to get the information they need.

You are told the URL of the page the user is on at the end of these instructions. Use it to help you answer the question:
you may be able to get the resource from the URL
  - Example if the url is like /docs|visualiser/{collection}/{id}/{version} 
    - (e.g /docs/events/MyEvent/1.0.0) in this case the id is MyEvent and the version is 1.0.0 and collection is events.
    - (e.g /visualiser/domains/MyDomain/1.0.0) in this case the id is MyDomain and the version is 1.0.0 and collection is domains.
    - (e.g /docs/services/MyService/1.0.0/resources) in this case the id is MyService and the version is 1.0.0 and collection is services; the user is looking at the resources the service uses.

IMPORTANT: When the user is on a visualiser page (/visualiser/*) or asks about architecture, dependencies, data flow, or connections:
- Use the getArchitectureDiagramAsMermaid tool to fetch the architecture diagram
- The mermaid code shows all the connections between resources (services, events, channels, etc.), with domains and systems as subgraphs around what's in them
- For a high-level answer about a domain or system, pass detail "overview" (domains, systems and their relationships) or "services" (services and data stores) instead of the full diagram
- Use this to provide accurate, contextual answers about the architecture

Sometimes the user will be on the specification page (openapi, asyncapi, graphql) for a resource too 
- /docs/services/OrdersService/0.0.3/asyncapi/order-service-asyncapi -> id: OrdersService, version: 0.0.3, collection: services, schema (specification): asyncapi
- /docs/services/OrdersService/0.0.3/spec/openapi-v2 -> id: OrdersService, version: 0.0.3, collection: services, schema (specification): openapi

Your primary goal is to help users understand their software architecture through accurate documentation interpretation.

Use the tools provided to get the context you need to answer the question. Be quick and economical: the user is waiting, and every lookup re-reads the whole conversation.
- Make lookups that don't depend on each other at the same time (several tool calls in one response), not one after another.
- For the messages a domain or system sends and receives, call getMessagesProducedOrConsumedByResource on the domain or system once: it includes everything inside it, and lists who sends or receives each message. Don't look up each service or message one by one.
- To find a resource by name, use getResources with a search term. If an id isn't found, the error lists the resources you may have meant (didYouMean): use one of those rather than guessing other ids.
- Stop looking things up as soon as you can answer. You can look things up at most ${maxSteps - 1} times, then you have to answer with what you found.

When responding:
1. Explain connections between resources when relevant.
2. Use appropriate technical terminology.
3. Use clear formatting with headings and bullet points when helpful.
4. State clearly when information is missing rather than making assumptions.
5. Don't provide code examples unless specifically requested.
6. When you refer to a resource in EventCatalog, try and create a link to the resource in the response
    - Example, if you return a message in the text, rather than just the id or version you should return a markdown link to the resource e.g [MyEvent - 1.0.0](/docs/events/MyEvent/1.0.0)
    - CRITICAL: NEVER use "latest" in any URL or link. Always use the actual semantic version number (e.g., 1.0.0, 2.1.3). The word "latest" is not a valid version and will result in broken links.
    - The link options are:
        - If you want to get the documentation for a resource use the /docs/ prefix (e.g /docs/{collection}/{id}/{version})
        - If you want to let the user know they can visualize a resource use the /visualiser/ prefix (e.g /visualiser/{collection}/{id}/{version})
        - If you want to show the user everything a domain, system, service, flow, channel or message (event, command, query) contains, uses or connects to, link its Resources page (e.g /docs/{collection}/{id}/{version}/resources). Only those collections have a Resources page.
    - If you don't know the version, use the getResource tool to fetch the resource and get the actual version number before creating the link.
    - Build links only from ids that tools gave you. A Mermaid diagram's node ids and labels are not resource ids: use the \`links\` that come with it.
7. When you return a schema, use code blocks to render the schema to the user too, for example if the schema is in JSON format use \`\`\`json and if the schema is in YAML format use \`\`\`yaml
8. When a picture helps the user see how things connect (who produces and consumes a message, what a change affects, the steps of a flow), add one small Mermaid diagram in a \`\`\`mermaid code block. Draw it yourself from what you found, rather than pasting a diagram from getArchitectureDiagramAsMermaid:
    - \`flowchart TD\` (the chat is a narrow column), at most 12 nodes, with short labelled edges, e.g. \`OS["Order Service"] -->|publishes| OC["Order Created"]\`
    - Node ids are short and plain (letters and numbers only); the label is just the resource's name, with details (owners, versions) in the text
    - No styles, classes or click handlers
    - No diagram for definitions, schemas, documentation or plain lists

If you have additional context, use it to answer the question.`;

/**
 * The instructions: what's the same on every request first, marked for Anthropic's prompt cache (other providers cache
 * a repeated prefix themselves, or ignore it), then the page the user is on.
 */
const getInstructions = (maxSteps: number, extraInstructions: string, referrer: string): SystemModelMessage[] => [
  {
    role: 'system',
    content: getBaseSystemPrompt(maxSteps) + extraInstructions,
    providerOptions: { anthropic: { cacheControl: { type: 'ephemeral' } } },
  },
  { role: 'system', content: `The URL of the page the user is on: ${referrer}` },
];

interface Message {
  content: string;
}

/**
 * eventcatalog.chat.js exists (or the chat would be off) but didn't load. The chat panel shows how
 * to fix it; the reason is only shared in dev mode, where it's the catalog owner asking.
 */
const chatConfigurationErrorResponse = () =>
  new Response(
    JSON.stringify({
      error: 'The EventCatalog Assistant could not load eventcatalog.chat.js',
      code: 'CHAT_CONFIGURATION_ERROR',
      ...(isDevMode() && chatConfigurationError ? { reason: chatConfigurationError } : {}),
    }),
    { status: 503, headers: { 'Content-Type': 'application/json' } }
  );

export const GET = async ({ request }: APIContext<{ question: string; messages: Message[]; additionalContext?: string }>) => {
  if (!hasChatConfiguration) {
    return chatConfigurationErrorResponse();
  }

  // Return available tools metadata
  const tools = [...builtInToolsMetadata, ...getExtendedToolsMetadata()];
  return new Response(JSON.stringify({ tools }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
};

export const POST = async ({ request }: APIContext<{ question: string; messages: Message[]; additionalContext?: string }>) => {
  // canvasId: the Studio canvas the assistant was opened on, which it can draw on
  const { messages, canvasId }: { messages: UIMessage[]; canvasId?: string } = await request.json();

  if (!hasChatConfiguration) {
    return chatConfigurationErrorResponse();
  }

  // Get the URL of the request
  const referrer = request.headers.get('referer');

  try {
    const canvas =
      canvasId && isCanvasEnabled()
        ? (await import('@features/studio/server/assistant-tools')).getCanvasAssistant(canvasId)
        : undefined;
    const maxSteps = canvas ? MAX_CANVAS_STEPS : MAX_STEPS;

    const tools = {
      getResources: tool({
        description: toolDescriptions.getResources,
        inputSchema: z.object({
          collection: collectionSchema.describe('The collection to get the resources from'),
          search: z.string().optional().describe('Only resources whose id, name or summary contains this (case-insensitive)'),
          cursor: z.string().optional().describe('The nextCursor from the previous page, to get the next page'),
        }),
        execute: async ({ collection, search, cursor }) => {
          return await getResourcesImpl({ collection, search, cursor });
        },
      }),
      getResource: tool({
        description: toolDescriptions.getResource,
        inputSchema: z.object({
          collection: collectionSchema.describe('The collection to get the resource from'),
          id: z.string().describe('The id of the resource to get'),
          version: z.string().describe('The version of the resource to get'),
        }),
        execute: async ({ collection, id, version }) => {
          return await getResourceImpl({ collection, id, version });
        },
      }),
      getMessagesProducedOrConsumedByResource: tool({
        description: toolDescriptions.getMessagesProducedOrConsumedByResource,
        inputSchema: z.object({
          resourceId: z.string().describe('The id of the resource to get the messages produced or consumed for'),
          resourceVersion: z.string().describe('The version of the resource to get the messages produced or consumed for'),
          resourceCollection: resourceCollectionSchema
            .describe('The collection of the resource to get the messages produced or consumed for')
            .default('services'),
        }),
        execute: async ({ resourceId, resourceVersion, resourceCollection }) => {
          return await getMessagesImpl({ resourceId, resourceVersion, resourceCollection });
        },
      }),
      getProducersOfMessage: tool({
        description: toolDescriptions.getProducersOfMessage,
        inputSchema: z.object({
          messageId: z.string().describe('The id of the message to get the producers for'),
          messageVersion: z.string().optional().describe('The version of the message (omit for the latest)'),
          messageCollection: messageCollectionSchema.describe('The collection of the message').default('events'),
        }),
        execute: async ({ messageId, messageVersion, messageCollection }) => {
          return await getProducersOfMessageImpl({ messageId, messageVersion, messageCollection });
        },
      }),
      getConsumersOfMessage: tool({
        description: toolDescriptions.getConsumersOfMessage,
        inputSchema: z.object({
          messageId: z.string().describe('The id of the message to get the consumers for'),
          messageVersion: z.string().optional().describe('The version of the message (omit for the latest)'),
          messageCollection: messageCollectionSchema.describe('The collection of the message').default('events'),
        }),
        execute: async ({ messageId, messageVersion, messageCollection }) => {
          return await getConsumersOfMessageImpl({ messageId, messageVersion, messageCollection });
        },
      }),
      findResourcesByOwner: tool({
        description: toolDescriptions.findResourcesByOwner,
        inputSchema: z.object({
          ownerId: z.string().describe('The id of the owner (team or user) to find resources for'),
        }),
        execute: async ({ ownerId }) => {
          return await findResourcesByOwnerImpl({ ownerId });
        },
      }),
      getTeam: tool({
        description: toolDescriptions.getTeam,
        inputSchema: z.object({
          id: z.string().describe('The id of the team to get'),
        }),
        execute: async ({ id }) => {
          return await getTeamImpl({ id });
        },
      }),
      analyzeChangeImpact: tool({
        description: toolDescriptions.analyzeChangeImpact,
        inputSchema: z.object({
          messageId: z.string().describe('The id of the message to analyze impact for'),
          messageVersion: z.string().optional().describe('The version of the message (omit for the latest)'),
          messageCollection: messageCollectionSchema.describe('The collection of the message').default('events'),
        }),
        execute: async ({ messageId, messageVersion, messageCollection }) => {
          return await analyzeChangeImpactImpl({ messageId, messageVersion, messageCollection });
        },
      }),
      explainUbiquitousLanguageTerms: tool({
        description: toolDescriptions.explainUbiquitousLanguageTerms,
        inputSchema: z.object({
          domainId: z.string().optional().describe('The id of the domain to get terms for. Omit it to look across every domain.'),
          domainVersion: z.string().optional().describe('The version of the domain (omit for the latest)'),
          term: z.string().optional().describe('Only return terms whose name or id contains this text (case-insensitive)'),
          cursor: z.string().optional().describe('The nextCursor from the previous page, when looking across every domain'),
        }),
        execute: async (params) => {
          return await explainUbiquitousLanguageTermsImpl(params);
        },
      }),
      getSchemaForResource: tool({
        description: toolDescriptions.getSchemaForResource,
        inputSchema: z.object({
          resourceId: z.string().describe('The id of the resource to get the schema for'),
          resourceVersion: z.string().describe('The version of the resource to get the schema for'),
          resourceCollection: resourceCollectionSchema
            .describe('The collection of the resource to get the schema for')
            .default('services'),
        }),
        execute: async ({ resourceId, resourceVersion, resourceCollection }) => {
          return await getSchemaImpl({ resourceId, resourceVersion, resourceCollection });
        },
      }),
      getDataProductInputs: tool({
        description: toolDescriptions.getDataProductInputs,
        inputSchema: z.object({
          dataProductId: z.string().describe('The id of the data product to get the inputs for'),
          dataProductVersion: z.string().describe('The version of the data product to get the inputs for'),
        }),
        execute: async ({ dataProductId, dataProductVersion }) => {
          return await getDataProductInputsImpl({ dataProductId, dataProductVersion });
        },
      }),
      getDataProductOutputs: tool({
        description: toolDescriptions.getDataProductOutputs,
        inputSchema: z.object({
          dataProductId: z.string().describe('The id of the data product to get the outputs for'),
          dataProductVersion: z.string().describe('The version of the data product to get the outputs for'),
        }),
        execute: async ({ dataProductId, dataProductVersion }) => {
          return await getDataProductOutputsImpl({ dataProductId, dataProductVersion });
        },
      }),
      getArchitectureDiagramAsMermaid: tool({
        description: toolDescriptions.getArchitectureDiagramAsMermaid,
        inputSchema: z.object({
          resourceId: z.string().describe('The id of the resource to get the architecture diagram for'),
          resourceVersion: z.string().describe('The version of the resource to get the architecture diagram for'),
          resourceCollection: visualiserCollectionSchema
            .describe(
              'The collection of the resource (events, commands, queries, services, domains, systems, flows, containers, data-products)'
            )
            .default('services'),
          detail: architectureDiagramDetailSchema.optional(),
        }),
        execute: async ({ resourceId, resourceVersion, resourceCollection, detail }) => {
          return await getArchitectureDiagramImpl({ resourceId, resourceVersion, resourceCollection, detail });
        },
      }),
      getCustomDocs: tool({
        description: toolDescriptions.getCustomDocs,
        inputSchema: z.object({
          cursor: z.string().optional().describe('Pagination cursor from previous response'),
          search: z.string().optional().describe('Search term to filter docs by title, id, or summary (case-insensitive)'),
        }),
        execute: async ({ cursor, search }) => {
          return await getCustomDocsImpl({ cursor, search });
        },
      }),
      searchCustomDocs: tool({
        description: toolDescriptions.searchCustomDocs,
        inputSchema: z.object({
          query: z.string().describe('Full-text search query, e.g. keywords describing the topic to find'),
          limit: z.number().optional().describe('Maximum number of results to return (default 10)'),
        }),
        execute: async ({ query, limit }) => {
          return await searchCustomDocsImpl({ query, limit });
        },
      }),
      getCustomDoc: tool({
        description: toolDescriptions.getCustomDoc,
        inputSchema: z.object({
          id: z.string().describe('The id or slug of the custom documentation page'),
          section: z.string().optional().describe('Optional section heading to return only that section of the page'),
        }),
        execute: async ({ id, section }) => {
          return await getCustomDocImpl({ id, section });
        },
      }),
      ...canvas?.tools,
      ...extendedTools,
    };

    const stream = streamChatAnswer({
      model,
      instructions: getInstructions(maxSteps, canvas?.instructions ?? '', referrer ?? ''),
      messages: await convertToModelMessages(messages),
      ...callSettingsFrom(modelConfiguration),
      // The provider's own options (e.g. { anthropic: { effort: 'low' } }), from eventcatalog.chat.js's configuration
      providerOptions: modelConfiguration?.providerOptions,
      maxSteps,
      // Model calls and tokens for each answer, read by the evals (packages/core/evals/chat)
      includeStats: isDevMode(),
      onError: (error) => {
        console.error('[Chat] On error', error);
      },
      // On a canvas: shown planning while it writes what to add, and what it drew tidied once it's finished
      ...(canvas && {
        onChunk: ({ chunk }) => {
          if (chunk.type === 'tool-input-start') canvas.startedWriting(chunk.toolName);
        },
        onEnd: () => canvas.finished().catch((error) => console.error('[Chat] Could not tidy the canvas', error)),
      }),
      tools,
    });

    return createUIMessageStreamResponse({ stream });
  } catch (err: any) {
    console.error('[Chat] Error during streaming:', err);

    // Extract a user-friendly error message
    let errorMessage = 'An unexpected error occurred while processing your request.';

    if (err?.message) {
      // Check for common error patterns and provide friendlier messages
      if (err.message.includes('API key') || err.message.includes('authentication') || err.message.includes('401')) {
        errorMessage = 'Authentication error: Please check your API key configuration.';
      } else if (err.message.includes('rate limit') || err.message.includes('429')) {
        errorMessage = 'Rate limit exceeded. Please wait a moment and try again.';
      } else if (err.message.includes('timeout') || err.message.includes('ETIMEDOUT')) {
        errorMessage = 'Request timed out. Please try again.';
      } else if (err.message.includes('model') || err.message.includes('not found')) {
        errorMessage = 'Model configuration error: ' + err.message;
      } else {
        // Use the original message if it's not too technical
        errorMessage = err.message.length < 200 ? err.message : 'An error occurred while processing your request.';
      }
    }

    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};

export const prerender = false;
