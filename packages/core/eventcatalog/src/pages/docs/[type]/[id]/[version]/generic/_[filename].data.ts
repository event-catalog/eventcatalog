import { isSSR } from '@utils/feature';
import { HybridPage } from '@utils/page-loaders/hybrid-page';
import type { CollectionEntry } from 'astro:content';
import type { CollectionTypes, PageTypes } from '@types';

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

    const hasSpecifications = (item: CollectionEntry<CollectionTypes>) => {
      const specifications = getSpecificationsForService(item);
      return specifications.some((spec) => spec.type === 'generic');
    };

    const filteredItems = allItems.map((items) => items.filter(hasSpecifications));

    return filteredItems.flatMap((items, index) =>
      items.flatMap((item) => {
        const genericSpecifications = getSpecificationsForService(item).filter((spec) => spec.type === 'generic');

        return genericSpecifications.map((spec) => ({
          params: {
            type: itemTypes[index],
            id: item.data.id,
            version: item.data.version,
            filename: spec.filenameWithoutExtension || spec.type,
          },
          props: {
            type: itemTypes[index],
            filenameWithoutExtension: spec.filenameWithoutExtension || spec.type,
            filename: spec.filename || spec.type,
            path: spec.path,
            specificationName: spec.name,
            icon: spec.icon,
            headers: spec.headers,
            ...item,
          },
        }));
      })
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
    const item = items.find((candidate) => candidate.data.id === id && candidate.data.version === version);

    if (!item) {
      return null;
    }

    const specification = getSpecificationsForService(item)
      .filter((spec) => spec.type === 'generic')
      .find((spec) => (spec.filenameWithoutExtension || spec.type) === filename);

    if (!specification) {
      return null;
    }

    return {
      type,
      filenameWithoutExtension: specification.filenameWithoutExtension || specification.type,
      filename: specification.filename || specification.type,
      path: specification.path,
      specificationName: specification.name,
      icon: specification.icon,
      headers: specification.headers,
      ...item,
    };
  }

  protected static createNotFoundResponse(): Response {
    return new Response(null, {
      status: 404,
      statusText: 'Generic specification not found',
    });
  }
}
