import { isSSR } from '@utils/feature';
import { HybridPage } from '@utils/page-loaders/hybrid-page';
import { getSchemaMetadata } from '@utils/schema-explorer';

export class Page extends HybridPage {
  static get prerender(): boolean {
    return !isSSR();
  }

  static async getStaticPaths(): Promise<Array<{ params: any; props: any }>> {
    if (isSSR()) {
      return [];
    }

    const allSchemas = await getSchemaMetadata();

    return [
      {
        params: {},
        props: {
          schemas: allSchemas,
        },
      },
    ];
  }

  protected static async fetchData(_params: any) {
    const allSchemas = await getSchemaMetadata();
    return {
      schemas: allSchemas,
    };
  }

  protected static hasValidProps(props: any): boolean {
    return props && props.schemas !== undefined;
  }

  protected static createNotFoundResponse(): Response {
    return new Response(null, {
      status: 404,
      statusText: 'Schema explorer not found',
    });
  }
}
