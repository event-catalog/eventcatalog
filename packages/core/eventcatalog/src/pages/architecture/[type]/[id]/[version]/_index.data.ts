import { isSSR } from '@utils/feature';
import { HybridPage } from '@utils/page-loaders/hybrid-page';
import {
  createResourcesCatalog,
  getOwnersWithResources,
  loadResourceOwners,
  type ResourcesCatalog,
} from '@utils/collections/resource-owners';
import type { ResourceOwner } from '@utils/collections/resources';

// The architecture overview pages were replaced by the Resources pages. These routes stay so
// old links keep working: each one redirects to the resource's Resources page, or to its docs
// page when it has nothing to list.
const architecturePageTypes = ['services', 'domains', 'systems'] as const;
type ArchitecturePageType = (typeof architecturePageTypes)[number];

const isArchitecturePageType = (type: string): type is ArchitecturePageType =>
  architecturePageTypes.includes(type as ArchitecturePageType);

const key = (item: ResourceOwner) => `${item.data.id}:${item.data.version}`;

const getRedirectPaths = async (type: ArchitecturePageType, catalog: ResourcesCatalog = createResourcesCatalog()) => {
  const [items, ownersWithResources] = await Promise.all([loadResourceOwners(type), getOwnersWithResources(type, catalog)]);
  const hasResourcesPage = new Set(ownersWithResources.map(key));

  return items.map((item) => {
    const docsPath = `/docs/${type}/${item.data.id}/${item.data.version}`;
    return { item, redirectPath: hasResourcesPage.has(key(item)) ? `${docsPath}/resources` : docsPath };
  });
};

export class Page extends HybridPage {
  static async getStaticPaths() {
    if (isSSR()) {
      return [];
    }

    const catalog = createResourcesCatalog();
    const redirects: Awaited<ReturnType<typeof getRedirectPaths>>[] = [];
    for (const type of architecturePageTypes) redirects.push(await getRedirectPaths(type, catalog));

    return architecturePageTypes.flatMap((type, index) =>
      redirects[index].map(({ item, redirectPath }) => ({
        params: { type, id: item.data.id, version: item.data.version },
        props: { type, data: { id: item.data.id, name: item.data.name, version: item.data.version }, redirectPath },
      }))
    );
  }

  protected static async fetchData(params: any) {
    const { type, id, version } = params;

    if (!type || !id || !version || !isArchitecturePageType(type)) {
      return null;
    }

    const match = (await getRedirectPaths(type)).find(({ item }) => item.data.id === id && item.data.version === version);
    if (!match) {
      return null;
    }

    return { type, data: { id, name: match.item.data.name, version }, redirectPath: match.redirectPath };
  }

  protected static createNotFoundResponse(): Response {
    return new Response(null, {
      status: 404,
      statusText: 'Documentation not found',
    });
  }
}
