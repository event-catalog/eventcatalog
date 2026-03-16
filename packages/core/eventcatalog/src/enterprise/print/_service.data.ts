import { isSSR } from '@utils/feature';
import { HybridPage } from '@utils/page-loaders/hybrid-page';
import { pageDataLoader } from '@utils/page-loaders/page-data-loader';

export class ServicePrintPage extends HybridPage {
  static async getStaticPaths() {
    if (isSSR()) {
      return [];
    }

    const items = await pageDataLoader['services']();

    return items.map((item) => ({
      params: {
        id: item.data.id,
        version: item.data.version,
      },
      props: {},
    }));
  }

  protected static async fetchData(params: any) {
    const { id, version } = params;

    if (!id || !version) {
      return null;
    }

    const items = await pageDataLoader['services']();
    const item = items.find((i) => i.data.id === id && i.data.version === version);

    if (!item) {
      return null;
    }

    return {
      type: 'services',
      ...item,
    };
  }

  protected static createNotFoundResponse(): Response {
    return new Response(null, {
      status: 404,
      statusText: 'Service not found',
    });
  }
}
