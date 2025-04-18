import type { APIContext } from 'astro';
import { askQuestion } from '@enterprise/eventcatalog-chat/utils/ai';
import config from '@config';
const output = config.output || 'static';

// Map the Keys to use in the SDK, astro exports as import.meta.env
process.env.OPENAI_API_KEY = import.meta.env.OPENAI_API_KEY || '';

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
  if (!process.env.OPENAI_API_KEY || process.env.OPENAI_API_KEY === '' || process.env.OPENAI_API_KEY === undefined) {
    return new Response(JSON.stringify({ error: 'OPENAI_API_KEY is not set' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    const { question, messages, additionalContext } = await request.json();

    if (!question) {
      return new Response(JSON.stringify({ error: 'Question is required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Assuming askQuestion returns a ReadableStream
    const answerStream = await askQuestion(question, messages, additionalContext);

    return answerStream.toTextStreamResponse({
      headers: {
        'Content-Encoding': 'none',
      },
    });
  } catch (error: any) {
    console.error('Error processing POST request:', error);
    return new Response(JSON.stringify({ error: 'Failed to process request: ' + error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};

export const prerender = false;
