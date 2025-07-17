import { getUbiquitousLanguage } from '@utils/collections/domains';
import { getDomains } from '@utils/collections/domains';
import { isSSR } from '@utils/feature';
import { HybridPage } from '@utils/page-loaders/hybrid-page';

export class Page extends HybridPage {
  static async getStaticPaths() {
    if (isSSR()) {
      return [];
    }

    const domains = await getDomains({ getAllVersions: false });

    const pages = await domains.reduce<Promise<any[]>>(async (acc, domain) => {
      const accumulator = await acc;
      const ubiquitousLanguages = await getUbiquitousLanguage(domain);

      if (ubiquitousLanguages.length === 0) {
        return accumulator;
      }

      const dictionary = ubiquitousLanguages[0].data.dictionary;

      if (!dictionary) {
        return accumulator;
      }

      return [
        ...accumulator,
        ...dictionary.map((item) => ({
          params: {
            type: domain.collection,
            id: domain.data.id,
            dictionaryId: item.id,
          },
          props: {
            type: domain.collection,
            domainId: domain.data.id,
            domain: domain.data,
            ubiquitousLanguage: item,
            ...item,
          },
        })),
      ];
    }, Promise.resolve([]));

    return pages;
  }

  protected static async fetchData(params: any) {
    const { getDomains } = await import('@utils/collections/domains');
    const domains = await getDomains({ getAllVersions: false });

    const domain = domains.find((d) => d.data.id === params.id && d.collection === params.type);
    if (!domain) return null;

    const ubiquitousLanguages = await getUbiquitousLanguage(domain);
    if (ubiquitousLanguages.length === 0) return null;

    // Find the ubiquitous language that contains our dictionary item
    const ubiquitousLanguage = ubiquitousLanguages.find((l) => l.data.dictionary?.some((d) => d.id === params.dictionaryId));
    if (!ubiquitousLanguage) return null;

    // Find the specific dictionary item
    const item = ubiquitousLanguage.data.dictionary?.find((d) => d.id === params.dictionaryId);
    if (!item) return null;

    return {
      type: domain.collection,
      domainId: domain.data.id,
      domain: domain.data,
      ubiquitousLanguage: item,
      ...item,
    };
  }

  protected static createNotFoundResponse(): Response {
    return new Response(null, {
      status: 404,
      statusText: 'Domain not found',
    });
  }
}
