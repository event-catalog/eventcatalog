import { HybridPage } from '@utils/page-loaders/hybrid-page';
import { isAuthEnabled } from '@utils/feature';
import { domainHasEntities, getDomains, type Domain } from '@utils/collections/domains';
import { isVisualiserEnabled } from '@utils/feature';

export class Page extends HybridPage {
  static async getStaticPaths(): Promise<Array<{ params: any; props: any }>> {
    if (isAuthEnabled() || !isVisualiserEnabled()) {
      return [];
    }

    const domains = await getDomains();
    const domainsWithEntities = domains.filter((domain) => domainHasEntities(domain));

    return domainsWithEntities.flatMap((domain) => {
      return {
        params: {
          type: 'domains',
          id: domain.data.id,
          version: domain.data.version,
        },
        props: {
          type: 'domains',
          ...domain,
        },
      };
    });
  }

  protected static async fetchData(params: any) {
    const { id, version } = params;

    if (!id || !version || !isVisualiserEnabled()) {
      return null;
    }

    // Get all items of the specified type
    const items = await getDomains();

    // Find the specific item by id and version, and only if it has entities
    const item = items.find((i) => i.data.id === id && i.data.version === version && domainHasEntities(i));

    if (!item) {
      return null;
    }

    return item;
  }

  protected static createNotFoundResponse(): Response {
    return new Response(null, {
      status: 404,
      statusText: 'Domain entity map page not found',
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
