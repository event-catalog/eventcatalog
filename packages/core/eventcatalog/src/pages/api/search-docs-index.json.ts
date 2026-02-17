import type { APIRoute } from 'astro';
import { getCollection } from 'astro:content';

const isDev = import.meta.env.DEV;

interface DocsSearchItemCompact {
  i: string;
  t: string;
  u: string;
  c: string;
}

const MAX_CONTENT_LENGTH = 5000;

const stripMarkdown = (value: string) => {
  return value
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/`[^`]*`/g, ' ')
    .replace(/!\[[^\]]*\]\([^)]*\)/g, ' ')
    .replace(/\[[^\]]*\]\([^)]*\)/g, ' ')
    .replace(/^#{1,6}\s+/gm, '')
    .replace(/[>*_~#-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
};

const toDocsItem = (entry: any): DocsSearchItemCompact | null => {
  const id = entry?.id as string | undefined;
  if (!id) return null;

  const body = typeof entry?.body === 'string' ? entry.body : '';
  const content = stripMarkdown(body).slice(0, MAX_CONTENT_LENGTH);
  if (!content) return null;

  const title = (entry?.data?.title as string | undefined) || id.split('/').pop() || id;

  return {
    i: id,
    t: title,
    u: `/docs/${id}`,
    c: content,
  };
};

export const GET: APIRoute = async () => {
  const [customPages, pages] = await Promise.all([getCollection('customPages'), getCollection('pages')]);

  const items = [...customPages, ...pages].map(toDocsItem).filter((item): item is DocsSearchItemCompact => Boolean(item));

  return new Response(JSON.stringify({ i: items }), {
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': isDev
        ? 'no-cache, no-store, must-revalidate'
        : 'public, max-age=3600, s-maxage=3600, stale-while-revalidate=86400',
      Vary: 'Accept-Encoding',
    },
  });
};

export const prerender = !isDev;
