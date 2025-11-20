import { streamText, tool, type LanguageModel, type UIMessage, stepCountIs, convertToModelMessages } from 'ai';
import { z } from 'astro/zod';
import config from '@config';

const getBaseURL = () => {
  if (import.meta.env.MODE === 'development') {
    return `http://localhost:${config.port || 3000}`;
  }
  return config.homepageLink || 'https://eventcatalog.dev/';
};

export const getEventCatalogResources = async () => {
  const baseUrl = process.env.EVENTCATALOG_URL || getBaseURL();
  const url = new URL('/docs/llm/llms.txt', baseUrl);
  const response = await fetch(url.toString());
  const text = await response.text();
  return text;
};

export const getResourceInformation = async (type: string, id: string, version: string) => {
  const baseUrl = process.env.EVENTCATALOG_URL || getBaseURL();
  const url = new URL(`/docs/${type}/${id}/${version}.mdx`, baseUrl);
  const response = await fetch(url.toString());
  const text = await response.text();
  return text;
};

// base class for AI providers
export interface AIProviderOptions {
  modelId: string;
  model?: LanguageModel;
  temperature?: number;
  topP?: number | undefined;
  topK?: number | undefined;
  frequencyPenalty?: number | undefined;
  presencePenalty?: number | undefined;
}

export class AIProvider {
  private model?: string | LanguageModel;
  private modelId: string;
  private temperature: number;
  private topP: number | undefined;
  private topK: number | undefined;
  private frequencyPenalty: number | undefined;
  private presencePenalty: number | undefined;
  public models: string[];

  constructor({ modelId, model, temperature, topP, topK, frequencyPenalty, presencePenalty }: AIProviderOptions) {
    this.modelId = modelId;
    this.temperature = temperature ?? 0.2;
    this.topP = topP;
    this.topK = topK;
    this.frequencyPenalty = frequencyPenalty;
    this.presencePenalty = presencePenalty;
    this.models = [];

    if (model) {
      this.model = model;
    }
  }

  async validateModel(model: string): Promise<{ isValidModel: boolean; listOfModels: string[] }> {
    const isValidModel = this.models.includes(model);
    return { isValidModel, listOfModels: this.models };
  }

  async streamText(system: string, messages: Array<UIMessage> | Array<Omit<UIMessage, 'id'>>) {
    if (!this.model) {
      throw new Error('Model not set');
    }

    return await streamText({
      model: this.model,
      system: system ?? '',
      messages: convertToModelMessages(messages),
      stopWhen: stepCountIs(5),
      temperature: this.temperature,
      ...(this.topP && { topP: this.topP }),
      ...(this.topK && { topK: this.topK }),
      ...(this.frequencyPenalty && { frequencyPenalty: this.frequencyPenalty }),
      ...(this.presencePenalty && { presencePenalty: this.presencePenalty }),
      tools: {
        findResources: tool({
          description: [
            'Find resources that are available in EventCatalog',
            '',
            'Use this tool when you need to:',
            '- Get a list of resources in EventCatalog including services, domains, events, commands, queries and flows, ubiquitous language terms and entities',
            "- Find a resource's id and version to aid other tool requests",
            '- Just return the list of matched resources in EventCatalog with a short description of each resource',
            "- Don't return bullet points, just return the list of resources in a readable format",
            '- Include the resource name, description, and a link to the resource',
            '- When you return a link, remove the .mdx from the end of the url',
            '- Return a list of messages the resource produces and consumes, these are marked as sends and receives',
            '- If the resource has a domain, include it in the response',
            '- Ask the user if they would like more information about a specific resource',
            '- When you return a message, in brackets let me know if its a query, command or event',
            `- The host URL is ${process.env.EVENTCATALOG_URL}`,
          ].join('\n'),
          inputSchema: z.object({}),
          execute: async () => {
            const text = await getEventCatalogResources();
            return text;
          },
        }),
        findResource: tool({
          description: [
            'Get more information about a service, domain, event, command, query or flow in EventCatalog using its id and version',
            'Use this tool when you need to:',
            '- Get more details/information about a service, domain, event, command, query, flow or entity in EventCatalog',
            '- Use the id to find more information about a service, domain, event, command, query, flow or entity',
            '- Return everything you know about this resource',
            '- If the resource has a specification return links to the specification file',
            '- When you find owners the url would look something like /docs/users/{id} if its a user or /docs/teams/{id} if its a team',
            '- When you return the producers and consumers (the messages the service produces and consumes) make sure they include the url to the documentation, the url would look something like /docs/{type}/{id}, e.g /docs/events/MyEvent/1.0.0 or /docs/commands/MyCommand/1.0.0',
            '- When you return owners make sure they include the url to the documentation',
            '- If the resource has a domain, include it in the response',
            '- Ask the user if they would like more information about a specific resource',
            '- When you return a message, in brackets let me know if its a query, command or event',
            `- If you are returning a flow (state machine) try and return the result in mermaid to the user, visualizing how the business logic flows`,
            `- If you return any URLS make sure to include the host URL ${process.env.EVENTCATALOG_URL}`,
            '- You will ALWAYS return the visualizer URL in an IFRAME in the given response - example <iframe src="http://localhost:3000/visualiser/{type}/{id}/{version}?embed=true"></iframe>',
          ].join('\n'),
          inputSchema: z.object({
            id: z.string().describe('The id of the resource to find'),
            version: z.string().describe('The version of the resource to find'),
            type: z
              .enum(['services', 'domains', 'events', 'commands', 'queries', 'flows', 'entities'])
              .describe('The type of resource to find'),
          }),
          execute: async ({ id, version, type }) => {
            const text = await getResourceInformation(type, id, version);
            return text;
          },
        }),
      },
    });
  }
}
