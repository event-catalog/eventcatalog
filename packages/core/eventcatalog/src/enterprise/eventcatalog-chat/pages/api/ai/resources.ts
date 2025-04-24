import type { APIContext } from 'astro';
import { getResources } from '@enterprise/eventcatalog-chat/utils/ai';

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

export const POST = async ({ request }: APIContext<{ question: string; messages: Message[] }>) => {
  try {
    const { question } = await request.json();

    if (!question) {
      return new Response(JSON.stringify({ error: 'Question is required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }
    // // Assuming askQuestion returns a ReadableStream
    const resources = await getResources(question);

    return new Response(JSON.stringify({ resources }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error processing POST request:', error);
    return new Response(JSON.stringify({ error: 'Failed to process request' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};

export const prerender = false;
