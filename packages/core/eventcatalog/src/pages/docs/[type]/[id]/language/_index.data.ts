import { isSSR } from '@utils/feature';
import { HybridPage } from '@utils/page-loaders/hybrid-page';

/**
 * Domain page class with static methods
 */
export class Page extends HybridPage {
  static async getStaticPaths() {
    if (isSSR()) {
      return [];
    }

    const { getDomains, hasUbiquitousLanguageTermsWithSubdomains } = await import('@utils/collections/domains');
    const domains = await getDomains({ getAllVersions: false });
    const domainsWithUbiquitousLanguage = await domains.reduce<Promise<typeof domains>>(async (acc, domain) => {
      const accumulator = await acc;

      if (await hasUbiquitousLanguageTermsWithSubdomains(domain)) {
        return [...accumulator, domain];
      }

      return accumulator;
    }, Promise.resolve([]));

    return domainsWithUbiquitousLanguage.map((item) => ({
      params: {
        type: item.collection,
        id: item.data.id,
      },
      props: {},
    }));
  }

  protected static async fetchData(params: any) {
    const { getDomains, hasUbiquitousLanguageTermsWithSubdomains } = await import('@utils/collections/domains');
    const domains = await getDomains({ getAllVersions: false });
    const domain = domains.find((d) => d.data.id === params.id && d.collection === params.type);

    if (!domain || !(await hasUbiquitousLanguageTermsWithSubdomains(domain))) {
      return null;
    }

    return domain;
  }

  protected static createNotFoundResponse(): Response {
    return new Response(null, {
      status: 404,
      statusText: 'Domain not found',
    });
  }
}
