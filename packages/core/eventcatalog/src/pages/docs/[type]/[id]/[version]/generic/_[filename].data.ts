// pages/docs/[type]/[id]/[version]/generic/[filename].astro
import { isSSR } from '@utils/feature';
import { HybridPage } from '@utils/page-loaders/hybrid-page';
import type { CollectionEntry } from 'astro:content';
import type { CollectionTypes, PageTypes } from '@types';
import type { ProcessedSpecification } from '@utils/collections/util';

const toPageProps = (type: PageTypes, spec: ProcessedSpecification, item: CollectionEntry<CollectionTypes>) => ({
  type,
  filenameWithoutExtension: spec.filenameWithoutExtension || spec.type,
  filename: spec.filename || spec.type,
  path: spec.path,
  specificationName: spec.name,
  icon: spec.icon,
  headers: spec.headers,
  ...item,
});

export class Page extends HybridPage {
  static get prerender(): boolean {
    return !isSSR();
  }

  static async getStaticPaths(): Promise<Array<{ params: any; props: any }>> {
    if (isSSR()) {
      return [];
    }

    const { pageDataLoader } = await import('@utils/page-loaders/page-data-loader');
    const { getSpecificationsForService } = await import('@utils/collections/services');

    const itemTypes: PageTypes[] = ['events', 'commands', 'queries', 'services', 'domains'];
    const allItems = await Promise.all(itemTypes.map((type) => pageDataLoader[type]()));

    return allItems.flatMap((items, index) =>
      items.flatMap((item) =>
        getSpecificationsForService(item)
          .filter((spec) => spec.type === 'generic')
          .map((spec) => ({
            params: {
              type: itemTypes[index],
              id: item.data.id,
              version: item.data.version,
              filename: spec.filenameWithoutExtension || spec.type,
            },
            props: toPageProps(itemTypes[index], spec, item),
          }))
      )
    );
  }

  protected static async fetchData(params: any) {
    const { type, id, version, filename } = params;

    if (!type || !id || !version || !filename) {
      return null;
    }

    const { pageDataLoader } = await import('@utils/page-loaders/page-data-loader');
    const { getSpecificationsForService } = await import('@utils/collections/services');

    const items = await pageDataLoader[type as PageTypes]();
    const item = items.find((i) => i.data.id === id && i.data.version === version);

    if (!item) {
      return null;
    }

    const spec = getSpecificationsForService(item).find(
      (s) => s.type === 'generic' && (s.filenameWithoutExtension || s.type) === filename
    );

    return spec ? toPageProps(type, spec, item) : null;
  }
}
