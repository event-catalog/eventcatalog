// pages/docs/[type]/[id]/[version]/spec/[filename]/index.page.ts
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
      // Ensure there is at least one 'openapi' specification
      return specifications && specifications.some((spec) => spec.type === 'openapi');
    };

    const filteredItems = allItems.map((items) => items.filter(hasSpecifications));

    return filteredItems.flatMap((items, index) =>
      items.flatMap((item) => {
        // Filter for openapi specifications only
        const openApiSpecifications = getSpecificationsForService(item).filter((spec) => spec.type === 'openapi');

        return openApiSpecifications.map((spec) => ({
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

    // Get all items of the specified type
    const items = await pageDataLoader[type as PageTypes]();

    // Find the specific item by id and version
    const item = items.find((i) => i.data.id === id && i.data.version === version);

    if (!item) {
      return null;
    }

    // Check if this item has OpenAPI specifications
    const specifications = getSpecificationsForService(item);
    const openApiSpecifications = specifications.filter((spec) => spec.type === 'openapi');

    // Find the specific specification
    const spec = openApiSpecifications.find((s) => (s.filenameWithoutExtension || s.type) === filename);

    if (!spec) {
      return null;
    }

    return {
      type,
      filenameWithoutExtension: spec.filenameWithoutExtension || spec.type,
      filename: spec.filename || spec.type,
      ...item,
    };
  }

  protected static createNotFoundResponse(): Response {
    return new Response(null, {
      status: 404,
      statusText: 'OpenAPI specification not found',
    });
  }
}
