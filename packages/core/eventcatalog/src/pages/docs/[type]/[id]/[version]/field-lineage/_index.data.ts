import { isSSR } from '@utils/feature';
import { HybridPage } from '@utils/page-loaders/hybrid-page';
import type { PageTypes } from '@types';
import { getMessageIdsWithFieldUsage } from '@utils/collections/field-usage';

const MESSAGE_TYPES: PageTypes[] = ['events', 'commands', 'queries'];

export class Page extends HybridPage {
  static get prerender(): boolean {
    return !isSSR();
  }

  static async getStaticPaths(): Promise<Array<{ params: any; props: any }>> {
    if (isSSR()) {
      return [];
    }

    const { pageDataLoader } = await import('@utils/page-loaders/page-data-loader');
    const messagesWithFieldUsage = await getMessageIdsWithFieldUsage();

    const allItems = await Promise.all(MESSAGE_TYPES.map((type) => pageDataLoader[type]()));

    return allItems.flatMap((items, index) =>
      items
        .filter((item) => messagesWithFieldUsage.has(item.data.id))
        .map((item) => ({
          params: {
            type: MESSAGE_TYPES[index],
            id: item.data.id,
            version: item.data.version,
          },
          props: {
            type: MESSAGE_TYPES[index],
            ...item,
          },
        }))
    );
  }

  protected static async fetchData(params: any) {
    const { type, id, version } = params;

    if (!type || !id || !version || !MESSAGE_TYPES.includes(type)) {
      return null;
    }

    const messagesWithFieldUsage = await getMessageIdsWithFieldUsage();
    if (!messagesWithFieldUsage.has(id)) {
      return null;
    }

    const { pageDataLoader } = await import('@utils/page-loaders/page-data-loader');

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
      statusText: 'Field usage not found',
    });
  }
}
