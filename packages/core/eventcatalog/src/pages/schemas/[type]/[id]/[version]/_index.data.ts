import { getCollection } from 'astro:content';
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
    const [schemas, ...allItems] = await Promise.all([
      getCollection('schemas'),
      ...itemTypes.map((type) => pageDataLoader[type]()),
    ]);
    const itemsByKey = new Map(allItems.flat().map((item) => [`${item.collection}:${item.data.id}:${item.data.version}`, item]));

    const seenMessageSchemas = new Set<string>();
    const messageSchemas = schemas.filter((schema) => {
      const key = `${schema.data.message.collection}:${schema.data.message.id}:${schema.data.message.version}`;
      if (seenMessageSchemas.has(key)) return false;
      seenMessageSchemas.add(key);
      return true;
    });

    // Generate paths for messages with schemas
    const messagePaths = messageSchemas
      .map((schema) => {
        const item = itemsByKey.get(`${schema.data.message.collection}:${schema.data.message.id}:${schema.data.message.version}`);
        if (!item) return null;

        return {
          params: {
            type: schema.data.message.collection,
            id: schema.data.message.id,
            version: schema.data.message.version,
          },
          props: {
            type: schema.data.message.collection,
            ...item,
            // Not everything needs the body of the page itself.
            body: undefined,
          },
        };
      })
      .filter((path): path is NonNullable<typeof path> => path !== null);

    // Generate paths for data products with contracts
    const dataProducts = await pageDataLoader['data-products']();
    const dataProductPaths = dataProducts.flatMap((dataProduct) => {
      const outputs = (dataProduct.data as any).outputs || [];
      const outputsWithContracts = outputs.filter((output: any) => output.contract);

      return outputsWithContracts.map((output: any) => ({
        params: {
          type: 'data-products',
          id: dataProduct.data.id,
          version: dataProduct.data.version,
        },
        props: {
          type: 'data-products',
          ...dataProduct,
          contractPath: output.contract.path,
          contractName: output.contract.name,
          contractType: output.contract.type,
          body: undefined,
        },
      }));
    });

    return [...messagePaths, ...dataProductPaths];
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
