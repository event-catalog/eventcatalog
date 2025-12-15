import type { APIContext } from 'astro';
import { convertToModelMessages, stepCountIs, streamText, tool, type LanguageModel, type ModelMessage, type UIMessage } from 'ai';
import { join } from 'node:path';
import { isEventCatalogScaleEnabled } from '@utils/feature';
import { z, getCollection, getEntry } from 'astro:content';
import { getConsumersOfMessage, getProducersOfMessage } from '@utils/collections/services';
import { getSchemasFromResource } from '@utils/collections/schemas';
import fs from 'fs';

const catalogDirectory = process.env.PROJECT_DIR || process.cwd();

export const defaultConfiguration = {
  temperature: 0.4,
  topP: 0.9,
  topK: 40,
  frequencyPenalty: 0.1,
  presencePenalty: 0.0,
  maxTokens: 1000,
};

let hasChatConfiguration = false;
let model: LanguageModel;
let modelConfiguration: any;

try {
  const providerConfiguration = await import(/* @vite-ignore */ join(catalogDirectory, 'eventcatalog.chat.js'));
  model = await providerConfiguration.default();
  modelConfiguration = providerConfiguration.configuration || defaultConfiguration;
  hasChatConfiguration = true;
} catch (error) {
  hasChatConfiguration = false;
}

const getBaseSystemPrompt = (
  referrer: string
) => `You are an expert in software architecture and domain-driven design, specializing in the open source tool EventCatalog.

You assist developers, architects, and business stakeholders who need information about their software architecture catalog.

There are many different resource types in EventCatalog, including:
- Events (collection name 'events') (asynchronous messages that notify about something that has happened)
- Commands (collection name 'commands') (requests to perform an action)
- Queries (collection name 'queries') (requests for information)
- Services (collection name 'services') (bounded contexts or applications that produce/consume events)
- Domains (collection name 'domains') (business capabilities or functional areas)
- Flows (collection name 'flows') (state machines)
- Channels (collection name 'channels') (communication channels)
- Entities (collection name 'entities') (data objects)
- Containers (collection name 'containers') (at the moment these are data stores (databases))

The user will ask you some questions about the software architecture catalog, you should use the tools provided to you to get the information they need.

At point the referer url will be the URL of the page the user is on, you should use this to help you answer the question,
You may be able to get the resource from the URL, example if the URL is /docs/events/MyEvent/1.0.0 you can get the resource from the URL, in this case the id is MyEvent and the version is 1.0.0 and collection is events.

The referer URL is ${referrer}

Some other examples

- /docs/events/MyEvent/1.0.0 -> id: MyEvent, version: 1.0.0, collection: events
- /architecture/domains/E-Commerce/1.0.0 -> id: E-Commerce, version: 1.0.0, collection: domains
- /visualiser/domains/E-Commerce/1.0.0

Sometimes the user will be on the specification page (openapi, asyncapi, graphql) for a resource too 
- /docs/services/OrdersService/0.0.3/asyncapi/order-service-asyncapi -> id: OrdersService, version: 0.0.3, collection: services, schema (specification): asyncapi
- /docs/services/OrdersService/0.0.3/spec/openapi-v2 -> id: OrdersService, version: 0.0.3, collection: services, schema (specification): openapi

Your primary goal is to help users understand their software architecture through accurate documentation interpretation.
Use the tools provided to get the context you need to an answer the question.

When responding:
1. Explain connections between resources when relevant.
2.. Use appropriate technical terminology.
3.. Use clear formatting with headings and bullet points when helpful.
4. State clearly when information is missing rather than making assumptions.
5. Don't provide code examples unless specifically requested.
6. When you refer to a resource in EventCatalog, try and create a link to the resource in the response
    - Example, if you return a message in the text, rather than than just the id or version you should return a markdown link to the resource e.g [MyEvent - 1.0.0](/docs/events/MyEvent/1.0.0)
    - NEVER return "latest" in the markdown link, always use the specific version
    - The link options are:
        - If you want to get the documentation for a resource use the /docs/ prefix (e.g /docs/{collection}/{id}/{version})
        - If you want to let the user know they can visualize a resource use the /visualiser/ prefix (e.g /visualiser/{collection}/{id}/{version})
        - If you want to let the user know they can see the architecture of a resource use the /architecture/ prefix (e.g /architecture/{collection}/{id}/{version})
7. When you return a schema, use code blocks to render the schema to the user too, for example if the schema is in JSON format use \`\`\`json and if the schema is in YAML format use \`\`\`yaml

If you have additional context, use it to answer the question.`;

interface Message {
  content: string;
}

export const GET = async ({ request }: APIContext<{ question: string; messages: Message[]; additionalContext?: string }>) => {
  // return 404
  return new Response(JSON.stringify({ error: 'Not found' }), {
    status: 404,
    headers: { 'Content-Type': 'application/json' },
  });
};

export const POST = async ({ request }: APIContext<{ question: string; messages: Message[]; additionalContext?: string }>) => {
  const { messages }: { messages: UIMessage[] } = await request.json();

  if (!isEventCatalogScaleEnabled()) {
    return new Response(JSON.stringify({ error: 'Chat is not enabled, please upgrade to the scale plan to use this feature' }), {
      status: 403,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  if (!hasChatConfiguration) {
    return new Response(JSON.stringify({ error: 'No chat configuration found' }), {
      status: 404,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // Get the URL of the request
  const referrer = request.headers.get('referer');

  const result = await streamText({
    model,
    system: getBaseSystemPrompt(referrer ?? ''),
    messages: convertToModelMessages(messages) as ModelMessage[],
    temperature: modelConfiguration?.temperature ?? 0.7,
    stopWhen: stepCountIs(5),
    // maxTokens: 4000, // Increased to handle large tool results
    onError: (error) => {
      console.error('[Chat] On error', error);
    },
    // maxOutputTokens: 40000,
    // tools: tools,
    tools: {
      getResources: tool({
        description:
          'Use this tool to get events, services, commands, queries, flows, domains, channels, entities from EventCatalog',
        inputSchema: z.object({
          collection: z
            .enum(['events', 'services', 'commands', 'queries', 'flows', 'domains', 'channels', 'entities'])
            .describe('The collection to get the events from'),
        }),
        execute: async ({ collection }) => {
          const resources = await getCollection(collection as any);
          return resources.map((resource: any) => ({
            id: resource.data.id,
            version: resource.data.version,
            name: resource.data.name,
          }));
        },
      }),
      getResource: tool({
        description: 'Use this tool to get a specific resource from EventCatalog by its id and version',
        inputSchema: z.object({
          collection: z
            .enum(['events', 'services', 'commands', 'queries', 'flows', 'domains', 'channels', 'entities'])
            .describe('The collection to get the events from'),
          id: z.string().describe('The id of the resource to get'),
          version: z.string().describe('The version of the resource to get'),
        }),
        execute: async ({ collection, id, version }) => {
          const resource = await getEntry(collection as any, `${id}-${version}`);
          return resource;
        },
      }),
      getMessagesProducedOrConsumedByResource: tool({
        description:
          'Use this tool to get the messages produced or consumed by a resource by its id and version. Look at the `sends` and `receives` properties to get the messages produced or consumed by the resource',
        inputSchema: z.object({
          resourceId: z.string().describe('The id of the resource to get the messages produced or consumed for'),
          resourceVersion: z.string().describe('The version of the resource to get the messages produced or consumed for'),
          resourceCollection: z
            .enum(['services', 'events', 'commands', 'queries', 'flows', 'domains', 'channels', 'entities'])
            .describe('The collection of the resource to get the messages produced or consumed for')
            .default('services'),
        }),
        execute: async ({ resourceId, resourceVersion, resourceCollection }) => {
          const resource = await getEntry(resourceCollection as any, `${resourceId}-${resourceVersion}`);
          if (!resource) {
            return {
              error: `Resource not found with id ${resourceId} and version ${resourceVersion} and collection ${resourceCollection}`,
            };
          }
          return resource;
        },
      }),
      getProducerAndConsumerForMessage: tool({
        description: 'Use this tool to get the producers and consumers for a message by its id and version',
        inputSchema: z.object({
          messageId: z.string().describe('The id of the message to get the producers and consumers for'),
          messageVersion: z.string().describe('The version of the message to get the producers and consumers for'),
          messageCollection: z
            .enum(['events', 'commands', 'queries'])
            .describe('The collection of the message to get the producers and consumers for')
            .default('events'),
        }),
        execute: async ({ messageId, messageVersion, messageCollection }) => {
          const services = await getCollection('services');
          const message = await getEntry(messageCollection as any, `${messageId}-${messageVersion}`);
          const consumers = await getProducersOfMessage(services, message as any);
          return consumers;
        },
      }),
      getConsumersOfMessage: tool({
        description: 'Use this tool to get the consumers for a message by its id and version',
        inputSchema: z.object({
          messageId: z.string().describe('The id of the message to get the consumers for'),
          messageVersion: z.string().describe('The version of the message to get the consumers for'),
          messageCollection: z
            .enum(['events', 'commands', 'queries'])
            .describe('The collection of the message to get the consumers for')
            .default('events'),
        }),
        execute: async ({ messageId, messageVersion, messageCollection }) => {
          const services = await getCollection('services');
          const message = await getEntry(messageCollection as any, `${messageId}-${messageVersion}`);
          const consumers = await getConsumersOfMessage(services, message as any);
          return consumers;
        },
      }),
      getSchemaForResource: tool({
        description:
          'Use this tool to get the schema or specifications (openapi or asyncapi or graphql) for a resource by its id and version, you will use code blocks to render the schema to the user too',
        inputSchema: z.object({
          resourceId: z.string().describe('The id of the resource to get the schema for'),
          resourceVersion: z.string().describe('The version of the resource to get the schema for'),
          resourceCollection: z
            .enum(['services', 'events', 'commands', 'queries', 'flows', 'domains', 'channels', 'entities'])
            .describe('The collection of the resource to get the schema for')
            .default('services'),
        }),
        execute: async ({ resourceId, resourceVersion, resourceCollection }) => {
          const resource = await getEntry(resourceCollection as any, `${resourceId}-${resourceVersion}`);

          if (!resource) {
            return {
              error: `Resource not found with id ${resourceId} and version ${resourceVersion} and collection ${resourceCollection}`,
            };
          }

          const schema = await getSchemasFromResource(resource);

          // If we have any schemas back then read them and return them
          if (schema.length > 0) {
            return schema.map((schemaItem) => ({
              url: schemaItem.url,
              format: schemaItem.format,
              code: fs.readFileSync(schemaItem.url, 'utf-8'),
            }));
          }

          return [];
        },
      }),
    },
  });
  return result.toUIMessageStreamResponse({
    headers: {
      'Content-Type': 'text/event-stream',
    },
  });
};

export const prerender = false;
