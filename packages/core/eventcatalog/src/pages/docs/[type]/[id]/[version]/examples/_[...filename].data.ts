import { isSSR } from '@utils/feature';
import { HybridPage } from '@utils/page-loaders/hybrid-page';
import type { PageTypes } from '@types';
import { getExamplesForResource } from '@utils/collections/examples';

const MESSAGE_TYPES: PageTypes[] = ['events', 'commands', 'queries'];

// Normalize path separators to forward slashes for URL matching
const toUrlPath = (filePath: string) => filePath.replace(/\\/g, '/');

export class Page extends HybridPage {
  static get prerender(): boolean {
    return !isSSR();
  }

  static async getStaticPaths(): Promise<Array<{ params: any; props: any }>> {
    if (isSSR()) {
      return [];
    }

    const { pageDataLoader } = await import('@utils/page-loaders/page-data-loader');
    const allItems = await Promise.all(MESSAGE_TYPES.map((type) => pageDataLoader[type]()));

    return allItems.flatMap((items, index) =>
      items.flatMap((item) => {
        const examples = getExamplesForResource(item);
        return examples.map((example) => ({
          params: {
            type: MESSAGE_TYPES[index],
            id: item.data.id,
            version: item.data.version,
            filename: toUrlPath(example.fileName),
          },
          props: {
            type: MESSAGE_TYPES[index],
            example,
            ...item,
          },
        }));
      })
    );
  }

  protected static async fetchData(params: any) {
    const { type, id, version, filename } = params;
    if (!type || !id || !version || !filename) return null;

    const { pageDataLoader } = await import('@utils/page-loaders/page-data-loader');
    const items = await pageDataLoader[type as PageTypes]();
    const item = items.find((i) => i.data.id === id && i.data.version === version);
    if (!item) return null;

    const examples = getExamplesForResource(item);
    const example = examples.find((ex) => toUrlPath(ex.fileName) === filename);
    if (!example) return null;

    return { type, example, ...item };
  }

  protected static createNotFoundResponse(): Response {
    return new Response(null, { status: 404, statusText: 'Example not found' });
  }
}
