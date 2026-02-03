import { isSSR } from '@utils/feature';
import { HybridPage } from '@utils/page-loaders/hybrid-page';
import type { PageTypes } from '@types';
import { pageDataLoader } from '@utils/page-loaders/page-data-loader';
import { getDomains } from '@utils/collections/domains';
import { getServices } from '@utils/collections/services';
import { getEntities } from '@utils/collections/entities';

/**
 * Documentation page class for all collection types with versioning
 */
export class Page extends HybridPage {
  static async getStaticPaths() {
    if (isSSR()) {
      return [];
    }

    const itemTypes: PageTypes[] = ['services', 'domains', 'entities'];

    const domains = await getDomains({ enrichServices: true });
    const services = await getServices();
    const entities = await getEntities();

    const pageData = [services, domains, entities];

    return pageData.flatMap((items, index) =>
      items.map((item) => ({
        params: {
          type: itemTypes[index],
          id: item.data.id,
          version: item.data.version,
        },
        props: {
          type: itemTypes[index],
          ...item,
          // Not everything needs the body of the page itself.
          body: undefined,
        },
      }))
    );
  }

  protected static async fetchData(params: any) {
    const { type, id, version } = params;

    if (!type || !id || !version) {
      return null;
    }

    // Get all items of the specified type
    const items = await pageDataLoader[type as PageTypes]();

    // Find the specific item by id and version
    const item = items.find((i) => i.data.id === id && i.data.version === version);

    if (!item) {
      return null;
    }

    return {
      type,
      ...item,
    };
  }

  protected static createNotFoundResponse(): Response {
    return new Response(null, {
      status: 404,
      statusText: 'Documentation not found',
    });
  }
}
