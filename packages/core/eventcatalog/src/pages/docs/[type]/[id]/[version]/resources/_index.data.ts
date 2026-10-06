import { isSSR } from '@utils/feature';
import { HybridPage } from '@utils/page-loaders/hybrid-page';
import type { ResourceOwner, ResourceOwnerCollection } from '@utils/collections/resources';
import {
  createResourcesCatalog,
  findOwnerWithResources,
  getOwnersWithResources,
  RESOURCE_OWNER_COLLECTIONS,
} from '@utils/collections/resource-owners';

// The Resources page lists the resources attached to a single system, domain, service, flow,
// channel or message. Every other resource type 404s.
//
// Services have their own route (pages/docs/services/[id]/[version]/resources), because the
// version-less alias /docs/services/[id]/[docType]/[docId] outranks this generic route and
// would otherwise catch /docs/services/{id}/{version}/resources.
const GENERIC_ROUTE_TYPES = RESOURCE_OWNER_COLLECTIONS.filter((type) => type !== 'services');

type RouteParams = { type?: string; id?: string; version?: string };

const createResourcesPage = ({
  types,
  toParams,
  typeOf,
}: {
  types: ResourceOwnerCollection[];
  toParams: (type: ResourceOwnerCollection, owner: ResourceOwner) => RouteParams;
  typeOf: (params: RouteParams) => string | undefined;
}) =>
  class extends HybridPage {
    static get prerender(): boolean {
      return !isSSR();
    }

    static async getStaticPaths(): Promise<Array<{ params: RouteParams; props: ResourceOwner }>> {
      if (isSSR()) {
        return [];
      }

      const catalog = createResourcesCatalog();
      const paths: Array<{ params: RouteParams; props: ResourceOwner }> = [];
      for (const type of types) {
        for (const owner of await getOwnersWithResources(type, catalog)) {
          paths.push({ params: toParams(type, owner), props: owner });
        }
      }
      return paths;
    }

    protected static async fetchData(params: RouteParams) {
      const type = typeOf(params);
      const { id, version } = params;

      if (!type || !id || !version || !types.includes(type as ResourceOwnerCollection)) {
        return null;
      }

      return findOwnerWithResources(type as ResourceOwnerCollection, id, version);
    }

    protected static createNotFoundResponse(): Response {
      return new Response(null, {
        status: 404,
        statusText: 'Resources not found',
      });
    }
  };

export const Page = createResourcesPage({
  types: GENERIC_ROUTE_TYPES,
  toParams: (type, owner) => ({ type, id: owner.data.id, version: owner.data.version }),
  typeOf: (params) => params.type,
});

export const ServicePage = createResourcesPage({
  types: ['services'],
  toParams: (_type, owner) => ({ id: owner.data.id, version: owner.data.version }),
  typeOf: () => 'services',
});
