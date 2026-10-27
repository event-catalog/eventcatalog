import { isSSR, isChangelogEnabled } from '@utils/feature';
import { changelogResourceCollections } from '@utils/changelog-resource-badge';
import { HybridPage } from '@utils/page-loaders/hybrid-page';
import type { PageTypes } from '@types';

const GENERIC_ROUTE_TYPES = changelogResourceCollections.filter((type) => type !== 'services');

type RouteParams = { type?: string; id?: string; version?: string };

const createChangelogPage = ({
  types,
  toParams,
  typeOf,
}: {
  types: PageTypes[];
  toParams: (type: PageTypes, item: any) => RouteParams;
  typeOf: (params: RouteParams) => string | undefined;
}) =>
  class extends HybridPage {
    static get prerender(): boolean {
      return !isSSR();
    }

    static async getStaticPaths(): Promise<Array<{ params: any; props: any }>> {
      if (isSSR() || !isChangelogEnabled()) {
        return [];
      }

      const { pageDataLoader } = await import('@utils/page-loaders/page-data-loader');

      const allItems = await Promise.all(types.map((type) => pageDataLoader[type]()));

      return allItems.flatMap((items, index) =>
        items.map((item) => ({
          params: toParams(types[index], item),
          props: {
            type: types[index],
            allCollectionItems: items,
            ...item,
          },
        }))
      );
    }

    protected static async fetchData(params: RouteParams) {
      const type = typeOf(params);
      const { id, version } = params;

      if (!type || !id || !version || !isChangelogEnabled()) {
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
        allCollectionItems: items,
        ...item,
      };
    }
  };

export const Page = createChangelogPage({
  types: GENERIC_ROUTE_TYPES as PageTypes[],
  toParams: (type, item) => ({ type, id: item.data.id, version: item.data.version }),
  typeOf: (params) => params.type,
});

export const ServicePage = createChangelogPage({
  types: ['services'],
  toParams: (_type, item) => ({ id: item.data.id, version: item.data.version }),
  typeOf: () => 'services',
});