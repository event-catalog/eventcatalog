import { generateText, type CoreMessage, type Message } from 'ai';
import { EventCatalogVectorStore, type Resource } from '@enterprise/eventcatalog-chat/EventCatalogVectorStore';
import fs from 'fs';
import path from 'path';
import config from '@config';
import { anthropic } from '@ai-sdk/anthropic';
import { getProvider } from '@enterprise/eventcatalog-chat/providers';

const AI_EMBEDDINGS_PATH = path.join(process.env.PROJECT_DIR || process.cwd(), 'public/ai');
const documents = JSON.parse(fs.readFileSync(path.join(AI_EMBEDDINGS_PATH, 'documents.json'), 'utf8'));
const embeddings = JSON.parse(fs.readFileSync(path.join(AI_EMBEDDINGS_PATH, 'embeddings.json'), 'utf8'));

export const getResources = async (question: string) => {
  const vectorStore = await EventCatalogVectorStore.create(documents, embeddings);
  const resources = await vectorStore.getEventCatalogResources(question);
  return resources;
};

export async function askQuestion(
  question: string = 'Tell me more about the Payment domain',
  historicMessages: Message[] = [],
  systemPromptOverride?: string
) {
  const resources = await getResources(question);

  const baseSystemPrompt = `You are an expert in event-driven architecture and domain-driven design, specializing in documentation for EventCatalog.

You assist developers, architects, and business stakeholders who need information about their event-driven system catalog. You help with questions about:
- Events (asynchronous messages that notify about something that has happened)
- Commands (requests to perform an action)
- Queries (requests for information)
- Services (bounded contexts or applications that produce/consume events)
- Domains (business capabilities or functional areas)

Your primary goal is to help users understand their event-driven system through accurate documentation interpretation.

IMPORTANT RULES:
1. Resources will be provided to you in <resource> tags. ONLY use these resources to answer questions.
2. NEVER include ANY <resource> tags in your responses. This is a strict requirement.
3. ALWAYS refer to resources by their name/ID/title attributes only.
4. If asked about specific resource types (e.g., "What domains do we have?"), simply list their names without elaboration.
5. NEVER invent or make up resources that aren't provided to you.
6. When you return code examples, make sure you always return them in markdown code blocks.

RESPONSE FORMAT EXAMPLES:
✓ CORRECT: "The SubscriptionService produces the UserSubscribed event."
✗ INCORRECT: "<resource id="SubscriptionService">...</resource> produces events."

When responding:
1. Use only information from the provided resources.
2. Explain connections between resources when relevant.
3. Use appropriate technical terminology.
4. Use clear formatting with headings and bullet points when helpful.
5. State clearly when information is missing rather than making assumptions.
6. Don't provide code examples unless specifically requested.

Your primary goal is to help users understand their event-driven system through accurate documentation interpretation.

If you have additional context, use it to answer the question.`;

  const resourceStrings = resources.map((resource: Resource) => {
    const attributes = Object.entries(resource)
      .filter(([key, value]) => key !== 'markdown' && key !== 'loc' && value !== undefined && value !== null)
      .map(([key, value]) => `${key}="${String(value).replace(/"/g, '&quot;')}"`) // Escape quotes in values
      .join(' ');
    return `<resource ${attributes} />`;
  });

  const resourceContext = `==========
${resourceStrings.join('\n')}
==========`;

  let systemPrompt = systemPromptOverride ? systemPromptOverride : baseSystemPrompt;
  systemPrompt += `\n\n${resourceContext}`;

  // add 1 more rule
  systemPrompt += `\n\n1. When you return code examples, make sure you always return them in markdown code blocks.`;
  const messages = [
    {
      role: 'system',
      content: systemPrompt, // Fixed: Was qaPrompt
    },
    ...historicMessages,
    {
      role: 'user',
      content: question,
    },
  ] as CoreMessage[];

  const modelId = config?.chat?.model;

  // setup the model and provider
  const aiProvider = getProvider(config?.chat?.provider || 'openai', {
    modelId,
    temperature: config?.chat?.temperature,
    topP: config?.chat?.topP,
    topK: config?.chat?.topK,
    frequencyPenalty: config?.chat?.frequencyPenalty,
    presencePenalty: config?.chat?.presencePenalty,
  });

  const { isValidModel, listOfModels } = await aiProvider.validateModel(modelId);

  if (!isValidModel) {
    throw new Error(`Invalid model: "${modelId}", please use a valid model from the following list: ${listOfModels.join(', ')}`);
  }

  return await aiProvider.streamText(messages);
}
