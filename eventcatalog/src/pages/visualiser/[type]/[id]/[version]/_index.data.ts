// pages/visualiser/[type]/[id]/[version]/index.page.ts
import { HybridPage } from '@utils/page-loaders/hybrid-page';
import { isAuthEnabled } from '@utils/feature';
import type { PageTypes } from '@types';
import { pageDataLoader } from '@utils/page-loaders/page-data-loader';
import { isVisualiserEnabled } from '@utils/feature';

type PageTypesWithFlows = PageTypes | 'flows';

export class Page extends HybridPage {
  static async getStaticPaths(): Promise<Array<{ params: any; props: any }>> {
    if (isAuthEnabled() || !isVisualiserEnabled()) {
      return [];
    }

    const { getFlows } = await import('@utils/collections/flows');

    const loaders = {
      ...pageDataLoader,
      flows: getFlows,
    };

    const itemTypes: PageTypesWithFlows[] = ['events', 'commands', 'queries', 'services', 'domains', 'flows', 'containers'];
    const allItems = await Promise.all(itemTypes.map((type) => loaders[type]()));

    return allItems.flatMap((items, index) =>
      items
        .filter((item) => item.data.visualiser !== false)
        .map((item) => ({
          params: {
            type: itemTypes[index],
            id: item.data.id,
            version: item.data.version,
          },
          props: {
            type: itemTypes[index],
            ...item,
          },
        }))
    );
  }

  protected static async fetchData(params: any) {
    const { type, id, version } = params;

    if (!type || !id || !version || !isVisualiserEnabled()) {
      return null;
    }

    const { getFlows } = await import('@utils/collections/flows');

    const loaders = {
      ...pageDataLoader,
      flows: getFlows,
    };

    // Get all items of the specified type
    const items = await loaders[type as PageTypesWithFlows]();

    // Find the specific item by id and version
    const item = items.find((i) => i.data.id === id && i.data.version === version && i.data.visualiser !== false);

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
      statusText: 'Visualiser page not found',
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
