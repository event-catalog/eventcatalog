// pages/discover/[type]/index.page.ts
import { isSSR } from '@utils/feature';
import { HybridPage } from '@utils/page-loaders/hybrid-page';
import { pageDataLoader } from '@utils/page-loaders/page-data-loader';

export class Page extends HybridPage {
  static get prerender(): boolean {
    return !isSSR();
  }

  static async getStaticPaths(): Promise<Array<{ params: any; props: any }>> {
    const { getFlows } = await import('@utils/collections/flows');

    const loaders = {
      ...pageDataLoader,
      flows: getFlows,
    };

    const itemTypes = ['events', 'commands', 'queries', 'services', 'domains', 'flows', 'containers'] as const;
    const allItems = await Promise.all(itemTypes.map((type) => loaders[type]()));

    return allItems.flatMap((items, index) => ({
      params: {
        type: itemTypes[index],
      },
      props: {
        data: items,
        type: itemTypes[index],
      },
    }));
  }

  protected static async fetchData(params: any) {
    const { type } = params;

    if (!type) {
      return null;
    }

    const { getFlows } = await import('@utils/collections/flows');

    const loaders = {
      ...pageDataLoader,
      flows: getFlows,
    };

    // @ts-ignore
    const items = await loaders[type]();

    return {
      type,
      data: items,
    };
  }

  protected static createNotFoundResponse(): Response {
    return new Response(null, {
      status: 404,
      statusText: 'Collection type not found',
    });
  }
}
