import type { APIRoute } from 'astro';
import { getNestedSideBarData } from '@stores/sidebar-store/state';

const isDev = import.meta.env.DEV;

interface SearchIndexItemCompact {
  k: string;
  t: string;
  b?: string;
  s?: string;
  h?: string;
}

const SKIPPED_PREFIXES = ['list:'];

export const GET: APIRoute = async () => {
  const sidebarData = await getNestedSideBarData();

  const items = Object.entries(sidebarData.nodes).reduce<SearchIndexItemCompact[]>((acc, [key, node]) => {
    if (typeof node === 'string') return acc;
    if (SKIPPED_PREFIXES.some((prefix) => key.startsWith(prefix))) return acc;
    if (!node.title) return acc;

    acc.push({
      k: key,
      t: node.title,
      ...(node.badge ? { b: node.badge } : {}),
      ...(node.summary ? { s: node.summary } : {}),
      ...(node.href ? { h: node.href } : {}),
    });

    return acc;
  }, []);

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
