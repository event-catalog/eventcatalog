import { HybridPage } from '@utils/page-loaders/hybrid-page';
import { isAuthEnabled } from '@utils/feature';
import { getServices, type Service } from '@utils/collections/services';

const serviceHasData = (service: Service) => {
  return service.data.writesTo?.length || 0 > 0 || service.data.readsFrom?.length || 0 > 0;
};

export class Page extends HybridPage {
  static async getStaticPaths(): Promise<Array<{ params: any; props: any }>> {
    if (isAuthEnabled()) {
      return [];
    }

    const services = await getServices();
    const servicesWithData = services.filter((service) => serviceHasData(service));

    return servicesWithData.flatMap((service) => {
      return {
        params: {
          type: 'services',
          id: service.data.id,
          version: service.data.version,
        },
        props: {
          type: 'service',
          ...service,
        },
      };
    });
  }

  protected static async fetchData(params: any) {
    const { id, version } = params;

    if (!id || !version) {
      return null;
    }

    // Get all items of the specified type
    const items = await getServices();

    // Find the specific item by id and version, and only if it has entities
    const item = items.find((i) => i.data.id === id && i.data.version === version && serviceHasData(i));

    if (!item) {
      return null;
    }

    return item;
  }

  protected static createNotFoundResponse(): Response {
    return new Response(null, {
      status: 404,
      statusText: 'Service data page not found',
    });
  }

  static get clientAuthScript(): string {
    if (!isAuthEnabled()) {
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
