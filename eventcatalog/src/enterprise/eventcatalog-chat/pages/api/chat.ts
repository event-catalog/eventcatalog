import type { APIContext } from 'astro';
import { type UIMessage } from 'ai';
import config from '@config';
import { getProvider } from '@enterprise/eventcatalog-chat/providers';

// Map the Keys to use in the SDK, astro exports as import.meta.env
process.env.OPENAI_API_KEY = import.meta.env.OPENAI_API_KEY || '';

const baseSystemPrompt = `You are an expert in event-driven architecture and domain-driven design, specializing in documentation for EventCatalog.

You assist developers, architects, and business stakeholders who need information about their event-driven system catalog. You help with questions about:
- Events (asynchronous messages that notify about something that has happened)
- Commands (requests to perform an action)
- Queries (requests for information)
- Services (bounded contexts or applications that produce/consume events)
- Domains (business capabilities or functional areas)

Your primary goal is to help users understand their event-driven system through accurate documentation interpretation.

When responding:
2. Explain connections between resources when relevant.
3. Use appropriate technical terminology.
4. Use clear formatting with headings and bullet points when helpful.
5. State clearly when information is missing rather than making assumptions.
6. Don't provide code examples unless specifically requested.

Your primary goal is to help users understand their event-driven system through accurate documentation interpretation.

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

  const provider = getProvider(config?.chat?.provider || 'openai', {
    modelId: config?.chat?.model || 'gpt-3.5-turbo-0125',
    temperature: config?.chat?.temperature,
    topP: config?.chat?.topP,
    topK: config?.chat?.topK,
    frequencyPenalty: config?.chat?.frequencyPenalty,
    presencePenalty: config?.chat?.presencePenalty,
  });

  const result = await provider.streamText(baseSystemPrompt, messages);
  return result.toUIMessageStreamResponse();
};

export const prerender = false;
