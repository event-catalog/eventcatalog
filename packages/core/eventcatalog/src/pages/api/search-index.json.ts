import type { APIRoute } from 'astro';
import { getNestedSideBarData } from '@stores/sidebar-store/state';

const isDev = import.meta.env.DEV;

interface SearchIndexItem {
  key: string;
  title: string;
  badge?: string;
  summary?: string;
  href?: string;
}

const SKIPPED_PREFIXES = ['list:'];

export const GET: APIRoute = async () => {
  const sidebarData = await getNestedSideBarData();

  const items = Object.entries(sidebarData.nodes).reduce<SearchIndexItem[]>((acc, [key, node]) => {
    if (typeof node === 'string') return acc;
    if (SKIPPED_PREFIXES.some((prefix) => key.startsWith(prefix))) return acc;

    if (!node.title) return acc;

    acc.push({
      key,
      title: node.title,
      badge: node.badge,
      summary: node.summary,
      href: node.href,
    });

    return acc;
  }, []);

  return new Response(JSON.stringify({ items }), {
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': isDev
        ? 'no-cache, no-store, must-revalidate'
        : 'public, max-age=3600, s-maxage=3600, stale-while-revalidate=86400',
    },
  });
};

export const prerender = !isDev;
