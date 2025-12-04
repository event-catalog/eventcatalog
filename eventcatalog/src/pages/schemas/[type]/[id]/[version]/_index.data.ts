import { isSSR } from '@utils/feature';
import { HybridPage } from '@utils/page-loaders/hybrid-page';
import type { PageTypes } from '@types';
import { pageDataLoader } from '@utils/page-loaders/page-data-loader';

/**
 * Documentation page class for all collection types with versioning
 */
export class Page extends HybridPage {
  static async getStaticPaths() {
    if (isSSR()) {
      return [];
    }

    const itemTypes: PageTypes[] = [
      'events',
      'commands',
      'queries',
      // 'services',
      // 'domains',
      // 'flows',
      // 'channels',
      // 'entities',
      // 'containers',
    ];
    const allItems = await Promise.all(itemTypes.map((type) => pageDataLoader[type]()));

    // We only care about any item that has data.schemaPath
    const itemsWithSchema = allItems.flatMap((items) => items.filter((item) => item.data.schemaPath));

    // return allItems.flatMap((items, index) =>
    return itemsWithSchema.map((item, index) => ({
      params: {
        type: item.collection,
        id: item.data.id,
        version: item.data.version,
      },
      props: {
        type: item.collection,
        ...item,
        // Not everything needs the body of the page itself.
        body: undefined,
      },
    }));
    // );
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
