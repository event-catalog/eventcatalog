import { isSSR } from '@utils/feature';
import { HybridPage } from '@utils/page-loaders/hybrid-page';

/**
 * Domain page class with static methods
 */
export class Page extends HybridPage {
  static async getStaticPaths() {
    if (isSSR()) {
      return [];
    }

    const { getDomains } = await import('@utils/collections/domains');
    const domains = await getDomains({ getAllVersions: false });

    return domains.map((item) => ({
      params: {
        type: item.collection,
        id: item.data.id,
      },
      props: {
        type: item.collection,
        ...item,
      },
    }));
  }

  protected static async fetchData(params: any) {
    const { getDomains } = await import('@utils/collections/domains');
    const domains = await getDomains({ getAllVersions: false });
    return domains.find((d) => d.data.id === params.id && d.collection === params.type) || null;
  }

  protected static createNotFoundResponse(): Response {
    return new Response(null, {
      status: 404,
      statusText: 'Domain not found',
    });
  }
}
