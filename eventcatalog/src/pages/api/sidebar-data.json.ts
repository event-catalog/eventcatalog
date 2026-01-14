import type { APIRoute } from 'astro';
import { getNestedSideBarData } from '@stores/sidebar-store/state';

const isDev = import.meta.env.DEV;

/**
 * API route that returns the sidebar navigation data as JSON.
 * This is pre-rendered in static mode to avoid embedding the data in every HTML page.
 * The data is fetched once and cached by the browser.
 */
export const GET: APIRoute = async () => {
  const sidebarData = await getNestedSideBarData();

  return new Response(JSON.stringify(sidebarData), {
    headers: {
      'Content-Type': 'application/json',
      // In dev mode, disable caching to ensure fresh data. In production, cache for 1 hour.
      'Cache-Control': isDev
        ? 'no-cache, no-store, must-revalidate'
        : 'public, max-age=3600, s-maxage=3600, stale-while-revalidate=86400',
    },
  });
};

// Pre-render this route in static mode so it becomes a static JSON file
// In dev mode, don't pre-render to allow dynamic updates
export const prerender = !isDev;
