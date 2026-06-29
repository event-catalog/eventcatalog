import { HybridPage } from '@utils/page-loaders/hybrid-page';
import { isAuthEnabled, isVisualiserEnabled } from '@utils/feature';
import { getSystems } from '@utils/collections/systems';

/**
 * A system participates in the System Diagram if it declares relationships
 * (to other systems) or actors, or if another system declares a relationship
 * pointing at it. Systems with nothing on any side have nothing to show, so we
 * don't generate a page for them.
 */
const buildSystemsInContextGraph = (systems: Awaited<ReturnType<typeof getSystems>>) => {
  const referenced = new Set<string>();

  for (const system of systems) {
    const relationships = (system.data.relationships || []) as { id: string }[];
    const actors = (system.data.actors || []) as { id: string }[];
    if (relationships.length > 0 || actors.length > 0) referenced.add(system.data.id);
    for (const relationship of relationships) {
      referenced.add(relationship.id);
    }
  }

  return systems.filter((system) => referenced.has(system.data.id));
};

export class Page extends HybridPage {
  static async getStaticPaths(): Promise<Array<{ params: any; props: any }>> {
    if (isAuthEnabled() || !isVisualiserEnabled()) {
      return [];
    }

    const systems = await getSystems();
    const systemsInContext = buildSystemsInContextGraph(systems);

    return systemsInContext.map((system) => ({
      params: {
        id: system.data.id,
        version: system.data.version,
      },
      props: {
        type: 'systems',
        ...system,
      },
    }));
  }

  protected static async fetchData(params: any) {
    const { id, version } = params;

    if (!id || !version || !isVisualiserEnabled()) {
      return null;
    }

    const systems = await getSystems();
    const item = systems.find((i) => i.data.id === id && i.data.version === version);

    if (!item) {
      return null;
    }

    return item;
  }

  protected static createNotFoundResponse(): Response {
    return new Response(null, {
      status: 404,
      statusText: 'System Diagram page not found',
    });
  }

  static get clientAuthScript(): string {
    if (!isAuthEnabled() || !isVisualiserEnabled()) {
      return '';
    }

    return `
      if (typeof window !== 'undefined' && !import.meta.env.SSR) {
        fetch('/api/auth/session')
          .then(res => res.json())
          .then(session => {
            if (!session?.user) {
              window.location.href = '/auth/login?callbackUrl=' + encodeURIComponent(window.location.pathname);
            }
          })
          .catch(() => {
            window.location.href = '/auth/login?callbackUrl=' + encodeURIComponent(window.location.pathname);
          });
      }
    `;
  }
}
