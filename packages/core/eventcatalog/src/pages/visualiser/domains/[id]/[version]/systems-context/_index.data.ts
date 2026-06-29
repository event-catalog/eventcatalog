import { HybridPage } from '@utils/page-loaders/hybrid-page';
import { isAuthEnabled, isVisualiserEnabled } from '@utils/feature';
import { getDomains } from '@utils/collections/domains';
import { getSystems } from '@utils/collections/systems';

/**
 * A domain gets a System Diagram when it has systems and at least one of those
 * systems takes part in a context graph — i.e. it declares relationships or actors. A
 * domain whose systems have neither has nothing to show, so we don't generate a page.
 */
const domainHasSystemContext = (
  domain: Awaited<ReturnType<typeof getDomains>>[number],
  systemMap: Map<string, { data: { relationships?: unknown[]; actors?: unknown[] } }>
) => {
  const systemRefs = (domain.data.systems || []) as { id: string }[];
  if (systemRefs.length === 0) return false;

  return systemRefs.some((ref) => {
    const system = systemMap.get(ref.id);
    if (!system) return false;
    const relationships = (system.data.relationships || []) as unknown[];
    const actors = (system.data.actors || []) as unknown[];
    return relationships.length > 0 || actors.length > 0;
  });
};

export class Page extends HybridPage {
  static async getStaticPaths(): Promise<Array<{ params: any; props: any }>> {
    if (isAuthEnabled() || !isVisualiserEnabled()) {
      return [];
    }

    const [domains, systems] = await Promise.all([getDomains({ getAllVersions: false }), getSystems()]);
    const systemMap = new Map(systems.map((system) => [system.data.id, system]));

    return domains
      .filter((domain) => domainHasSystemContext(domain, systemMap))
      .map((domain) => ({
        params: {
          id: domain.data.id,
          version: domain.data.version,
        },
        props: {
          type: 'domains',
          ...domain,
        },
      }));
  }

  protected static async fetchData(params: any) {
    const { id, version } = params;

    if (!id || !version || !isVisualiserEnabled()) {
      return null;
    }

    const domains = await getDomains({ getAllVersions: false });
    const item = domains.find((i) => i.data.id === id && i.data.version === version);

    if (!item) {
      return null;
    }

    return item;
  }

  protected static createNotFoundResponse(): Response {
    return new Response(null, {
      status: 404,
      statusText: 'Domain System Diagram page not found',
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
