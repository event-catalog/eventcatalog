import type { APIRoute } from 'astro';
import { getNestedSideBarData } from '@stores/sidebar-store/state';
import { getSearchIndexNodeEntries } from '@stores/sidebar-store/search-index';
import { isLastUpdatedEnabled } from '@utils/feature';
import { getDashboard, type DashboardCollection } from '@utils/homepage-dashboard';

const isDev = import.meta.env.DEV;

interface SearchIndexItemCompact {
  k: string;
  t: string;
  b?: string;
  s?: string;
  h?: string;
  i?: string;
  li?: string;
}

const SKIPPED_PREFIXES = ['list:'];

// A collection's resources as the sidebar keys them, e.g. `event:order-placed:1.0.0`
const NODE_TYPE: Record<DashboardCollection, string> = {
  domains: 'domain',
  services: 'service',
  events: 'event',
  commands: 'command',
  queries: 'query',
  flows: 'flow',
};

/**
 * The resources changed most recently (with lastUpdated on, as the dates come from git), which search shows before
 * anything's typed. A schema or specification changing counts as its resource changing.
 */
const getRecentlyUpdatedKeys = async (): Promise<string[]> => {
  if (!isLastUpdatedEnabled()) return [];
  const { recentlyUpdated } = await getDashboard();
  return [...new Set(recentlyUpdated.map(({ collection, id, version }) => `${NODE_TYPE[collection]}:${id}:${version}`))];
};

export const GET: APIRoute = async () => {
  const sidebarData = await getNestedSideBarData();

  const items = getSearchIndexNodeEntries(sidebarData.nodes).reduce<SearchIndexItemCompact[]>((acc, [key, node]) => {
    if (typeof node === 'string') return acc;
    if (SKIPPED_PREFIXES.some((prefix) => key.startsWith(prefix))) return acc;
    if (!node.title) return acc;

    acc.push({
      k: key,
      t: node.title,
      ...(node.badge ? { b: node.badge } : {}),
      ...(node.summary ? { s: node.summary } : {}),
      ...(node.href ? { h: node.href } : {}),
      ...(node.icon ? { i: node.icon } : {}),
      ...(node.leftIcon ? { li: node.leftIcon } : {}),
    });

    return acc;
  }, []);

  const recent = await getRecentlyUpdatedKeys();

  return new Response(JSON.stringify({ i: items, ...(recent.length > 0 ? { r: recent } : {}) }), {
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
