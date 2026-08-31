import type { CollectionEntry } from 'astro:content';
import { getDomains, getUbiquitousLanguage } from '@utils/collections/domains';
import { isSSR } from '@utils/feature';
import { HybridPage } from '@utils/page-loaders/hybrid-page';
import { resolveEditUrl } from '@utils/url-builder';

type Domain = CollectionEntry<'domains'>;
type UbiquitousLanguage = CollectionEntry<'ubiquitousLanguages'>;
type DictionaryTerm = NonNullable<UbiquitousLanguage['data']['dictionary']>[number];

export const resolveUbiquitousLanguageTermEditUrl = ({
  term,
  collection,
  configEditUrl,
}: {
  term: Pick<DictionaryTerm, 'id' | 'editUrl'>;
  collection: Pick<UbiquitousLanguage, 'filePath'> & { data: Pick<UbiquitousLanguage['data'], 'editUrl'> };
  configEditUrl?: string;
}) =>
  resolveEditUrl({
    resourceEditUrl: term.editUrl || collection.data.editUrl,
    configEditUrl,
    filePath: collection.filePath,
  });

export const buildUbiquitousLanguageTermPage = ({
  domain,
  collection,
  term,
}: {
  domain: Domain;
  collection: UbiquitousLanguage;
  term: DictionaryTerm;
}) => ({
  params: {
    type: domain.collection,
    id: domain.data.id,
    dictionaryId: term.id,
  },
  props: {
    type: domain.collection,
    domainId: domain.data.id,
    domain: domain.data,
    ...term,
    ubiquitousLanguage: term,
    filePath: collection.filePath,
    collectionEditUrl: collection.data.editUrl,
  },
});

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

      return [
        ...accumulator,
        ...ubiquitousLanguages.flatMap((collection) =>
          (collection.data.dictionary ?? []).map((term) => buildUbiquitousLanguageTermPage({ domain, collection, term }))
        ),
      ];
    }, Promise.resolve([]));

    return pages;
  }

  protected static hasValidProps(props: any): boolean {
    return Boolean(props?.ubiquitousLanguage && props?.domain);
  }

  protected static async fetchData(params: any) {
    const { getDomains } = await import('@utils/collections/domains');
    const domains = await getDomains({ getAllVersions: false });

    const domain = domains.find((d) => d.data.id === params.id && d.collection === params.type);
    if (!domain) return null;

    const ubiquitousLanguages = await getUbiquitousLanguage(domain);
    if (ubiquitousLanguages.length === 0) return null;

    // Find the ubiquitous language that contains our dictionary item
    const collection = ubiquitousLanguages.find((l) => l.data.dictionary?.some((d) => d.id === params.dictionaryId));
    if (!collection) return null;

    // Find the specific dictionary item
    const term = collection.data.dictionary?.find((d) => d.id === params.dictionaryId);
    if (!term) return null;

    return buildUbiquitousLanguageTermPage({ domain, collection, term }).props;
  }

  protected static createNotFoundResponse(): Response {
    return new Response(null, {
      status: 404,
      statusText: 'Domain not found',
    });
  }
}
