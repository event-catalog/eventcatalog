import { isSSR } from '@utils/feature';
import { HybridPage } from '@utils/page-loaders/hybrid-page';

// The Resources page lists the top-level resources (services, flows, entities and
// data stores) attached to a single system or domain. It is only available for
// systems and domains — every other resource type 404s.
const SUPPORTED_TYPES = ['systems', 'domains'] as const;
type SupportedType = (typeof SUPPORTED_TYPES)[number];

const isSupportedType = (type: string): type is SupportedType => SUPPORTED_TYPES.includes(type as SupportedType);

const loadResourceOwner = async (type: SupportedType) => {
  if (type === 'systems') {
    const { getSystems } = await import('@utils/collections/systems');
    return getSystems();
  }
  const { getDomains } = await import('@utils/collections/domains');
  return getDomains();
};

// A system/domain only gets a Resources page when it actually has resources attached.
// Mirrors what the page renders: services, flows, entities, data stores and (domains
// only) the domain's own messages.
const hasResources = (owner: any): boolean => {
  const data = owner?.data ?? {};
  return (
    (data.services || []).length > 0 ||
    (data.flows || []).length > 0 ||
    (data.entities || []).length > 0 ||
    (data.containers || []).length > 0 ||
    (data.sends || []).length > 0 ||
    (data.receives || []).length > 0
  );
};

export class Page extends HybridPage {
  static get prerender(): boolean {
    return !isSSR();
  }

  static async getStaticPaths(): Promise<Array<{ params: any; props: any }>> {
    if (isSSR()) {
      return [];
    }

    const owners = await Promise.all(SUPPORTED_TYPES.map((type) => loadResourceOwner(type)));

    return SUPPORTED_TYPES.flatMap((type, index) =>
      owners[index]
        .filter((owner) => hasResources(owner))
        .map((owner) => ({
          params: {
            type,
            id: owner.data.id,
            version: owner.data.version,
          },
          props: {
            ...owner,
          },
        }))
    );
  }

  protected static async fetchData(params: any) {
    const { type, id, version } = params;

    if (!type || !id || !version || !isSupportedType(type)) {
      return null;
    }

    const owners = await loadResourceOwner(type);
    const owner = owners.find((o) => o.data.id === id && o.data.version === version);

    if (!owner || !hasResources(owner)) {
      return null;
    }

    return {
      ...owner,
    };
  }

  protected static createNotFoundResponse(): Response {
    return new Response(null, {
      status: 404,
      statusText: 'Resources not found',
    });
  }
}
