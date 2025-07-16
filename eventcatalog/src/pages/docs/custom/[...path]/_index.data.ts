// pages/docs/custom/[...path]/index.page.ts
import { isSSR } from '@utils/feature';
import { HybridPage } from '@utils/page-loaders/hybrid-page';

export class Page extends HybridPage {
  static get prerender(): boolean {
    return !isSSR();
  }

  static async getStaticPaths(): Promise<Array<{ params: any; props: any }>> {
    if (isSSR()) {
      return [];
    }

    const { getCollection } = await import('astro:content');
    const docs = await getCollection('customPages');

    const paths = docs.map((doc) => ({
      params: { path: doc.id.replace('docs/', '') },
      props: doc,
    }));

    return paths;
  }

  protected static async fetchData(params: any) {
    const { path } = params;

    if (!path) {
      return null;
    }

    const { getCollection } = await import('astro:content');
    const docs = await getCollection('customPages');

    // Find the specific doc by reconstructing the id
    const docId = `docs/${Array.isArray(path) ? path.join('/') : path}`;
    const doc = docs.find((d) => d.id === docId);

    return doc || null;
  }

  protected static createNotFoundResponse(): Response {
    return new Response(null, {
      status: 404,
      statusText: 'Custom documentation page not found',
    });
  }
}
