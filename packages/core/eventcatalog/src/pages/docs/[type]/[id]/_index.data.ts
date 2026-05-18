import type { CollectionTypes, PageTypes } from '@types';
import { HybridPage } from '@utils/page-loaders/hybrid-page';
import { pageDataLoader } from '@utils/page-loaders/page-data-loader';
import { isSSR } from '@utils/feature';

const itemTypes: PageTypes[] = [
  'events',
  'commands',
  'queries',
  'services',
  'domains',
  'flows',
  'channels',
  'entities',
  'containers',
  'data-products',
];

export class Page extends HybridPage {
  static async getStaticPaths() {
    if (isSSR()) {
      return [];
    }

    const allItems = await Promise.all(itemTypes.map((type) => pageDataLoader[type]({ getAllVersions: false })));

    return allItems.flatMap((items, index) =>
      items.map((item) => ({
        params: {
          type: itemTypes[index],
          id: item.data.id,
        },
        props: {
          type: itemTypes[index],
          ...item,
        },
      }))
    );
  }

  protected static async fetchData(params: any) {
    const { type, id } = params;

    if (!type || !id || !(type in pageDataLoader)) {
      return null;
    }

    const items = await pageDataLoader[type as PageTypes]({ getAllVersions: false });
    const item = items.find((entry) => entry.data.id === id);

    if (!item) {
      return null;
    }

    return {
      type: type as CollectionTypes,
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
