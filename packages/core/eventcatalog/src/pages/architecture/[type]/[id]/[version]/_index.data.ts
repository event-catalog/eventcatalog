import { isSSR } from '@utils/feature';
import { HybridPage } from '@utils/page-loaders/hybrid-page';
import type { PageTypes } from '@types';
import { pageDataLoader } from '@utils/page-loaders/page-data-loader';
import { getDomains } from '@utils/collections/domains';
import { getSystems } from '@utils/collections/systems';

const architecturePageTypes: PageTypes[] = ['services', 'domains', 'systems'];

/**
 * Architecture grids render service sends/receives as docs links, so domains and
 * systems must hydrate those messages (collection + name). `pageDataLoader`
 * uses the cheaper unenriched path used by docs/sidebar.
 */
export const loadArchitectureItems = (type: PageTypes) => {
  if (type === 'domains') {
    return getDomains({ enrichServices: true });
  }

  if (type === 'systems') {
    return getSystems({ enrichServices: true });
  }

  return pageDataLoader[type as PageTypes]();
};

/**
 * Documentation page class for all collection types with versioning
 */
export class Page extends HybridPage {
  static async getStaticPaths() {
    if (isSSR()) {
      return [];
    }

    const pageData = await Promise.all(architecturePageTypes.map((type) => loadArchitectureItems(type)));

    return pageData.flatMap((items, index) =>
      items.map((item) => ({
        params: {
          type: architecturePageTypes[index],
          id: item.data.id,
          version: item.data.version,
        },
        props: {
          type: architecturePageTypes[index],
          ...item,
          // Not everything needs the body of the page itself.
          body: undefined,
        },
      }))
    );
  }

  protected static async fetchData(params: any) {
    const { type, id, version } = params;

    if (!type || !id || !version || !architecturePageTypes.includes(type)) {
      return null;
    }

    const items = await loadArchitectureItems(type as PageTypes);

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
