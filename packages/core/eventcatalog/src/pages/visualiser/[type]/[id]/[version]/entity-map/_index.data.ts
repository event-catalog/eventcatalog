import { HybridPage } from '@utils/page-loaders/hybrid-page';
import { isAuthEnabled, isVisualiserEnabled } from '@utils/feature';
import { getServices, type Service } from '@utils/collections/services';

const serviceHasEntities = (service: Service) => {
  return (service.data.entities && service.data.entities.length > 0) || false;
};

export class Page extends HybridPage {
  static async getStaticPaths(): Promise<Array<{ params: any; props: any }>> {
    if (isAuthEnabled() || !isVisualiserEnabled()) {
      return [];
    }

    const services = await getServices();
    const servicesWithEntities = services.filter((service) => serviceHasEntities(service));

    return servicesWithEntities.flatMap((service) => {
      return {
        params: {
          type: 'services',
          id: service.data.id,
          version: service.data.version,
        },
        props: {
          type: 'services',
          ...service,
        },
      };
    });
  }

  protected static async fetchData(params: any) {
    const { id, version } = params;

    if (!id || !version || !isVisualiserEnabled()) {
      return null;
    }

    const items = await getServices();
    const item = items.find((i) => i.data.id === id && i.data.version === version && serviceHasEntities(i));

    if (!item) {
      return null;
    }

    return item;
  }

  protected static createNotFoundResponse(): Response {
    return new Response(null, {
      status: 404,
      statusText: 'Service entity map page not found',
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
