import { isSSR } from '@utils/feature';
import { HybridPage } from '@utils/page-loaders/hybrid-page';
import type { PageTypes } from '@types';
import { pageDataLoader } from '@utils/page-loaders/page-data-loader';

const messageTypes: PageTypes[] = ['events', 'commands', 'queries'];

export class PrintPage extends HybridPage {
  static async getStaticPaths() {
    if (isSSR()) {
      return [];
    }

    const allItems = await Promise.all(messageTypes.map((type) => pageDataLoader[type]()));

    return allItems.flatMap((items, index) =>
      items.map((item) => ({
        params: {
          type: messageTypes[index],
          id: item.data.id,
          version: item.data.version,
        },
        props: {},
      }))
    );
  }

  protected static async fetchData(params: any) {
    const { type, id, version } = params;

    if (!type || !id || !version) {
      return null;
    }

    if (!messageTypes.includes(type as PageTypes)) {
      return null;
    }

    const items = await pageDataLoader[type as PageTypes]();
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
      statusText: 'Message not found',
    });
  }
}
