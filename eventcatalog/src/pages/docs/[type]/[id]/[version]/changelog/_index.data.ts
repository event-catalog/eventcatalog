import { isSSR } from '@utils/feature';
import { HybridPage } from '@utils/page-loaders/hybrid-page';
import type { PageTypes } from '@types';

export class Page extends HybridPage {
  static get prerender(): boolean {
    return !isSSR();
  }

  static async getStaticPaths(): Promise<Array<{ params: any; props: any }>> {
    if (isSSR()) {
      return [];
    }

    const { pageDataLoader } = await import('@utils/page-loaders/page-data-loader');

    const itemTypes: PageTypes[] = ['events', 'commands', 'queries', 'services', 'domains', 'flows', 'containers'];
    const allItems = await Promise.all(itemTypes.map((type) => pageDataLoader[type]()));

    return allItems.flatMap((items, index) =>
      items.map((item) => ({
        params: {
          type: itemTypes[index],
          id: item.data.id,
          version: item.data.version,
        },
        props: {
          type: itemTypes[index],
          allCollectionItems: items,
          ...item,
        },
      }))
    );
  }

  protected static async fetchData(params: any) {
    const { type, id, version } = params;

    if (!type || !id || !version) {
      return null;
    }

    const { pageDataLoader } = await import('@utils/page-loaders/page-data-loader');

    // Get all items of the specified type
    const items = await pageDataLoader[type as PageTypes]();

    // Find the specific item by id and version
    const item = items.find((i) => i.data.id === id && i.data.version === version);

    if (!item) {
      return null;
    }

    return {
      type,
      allCollectionItems: items,
      ...item,
    };
  }

  protected static createNotFoundResponse(): Response {
    return new Response(null, {
      status: 404,
      statusText: 'Changelog not found',
    });
  }
}
