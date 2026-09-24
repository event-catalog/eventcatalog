import { isAuthEnabled, isVisualiserEnabled } from '@utils/feature';
import { getDomains } from '@utils/collections/domains';
import { Page as SystemsContextPage } from './systems-context/_index.data';

// A domain's visualiser page, with levels from the domains it talks to down to
// its messages. Same data as the old System Diagram page (which now redirects
// here), but every domain gets a page.
export class Page extends SystemsContextPage {
  static async getStaticPaths(): Promise<Array<{ params: any; props: any }>> {
    if (isAuthEnabled() || !isVisualiserEnabled()) {
      return [];
    }

    // Every version of each domain has a page (the sidebar links to the version viewed)
    const domains = await getDomains();

    return domains
      .filter((domain) => domain.data.visualiser !== false)
      .map((domain) => ({
        params: {
          id: domain.data.id,
          version: domain.data.version,
        },
        props: {
          type: 'domains',
          ...domain,
        },
      }));
  }

  protected static async fetchData(params: any) {
    const { id, version } = params;

    if (!id || !version || !isVisualiserEnabled()) {
      return null;
    }

    const domains = await getDomains();
    return (
      domains.find((domain) => domain.data.id === id && domain.data.version === version && domain.data.visualiser !== false) ??
      null
    );
  }
}
