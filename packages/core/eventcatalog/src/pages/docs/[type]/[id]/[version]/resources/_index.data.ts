import { isSSR } from '@utils/feature';
import { HybridPage } from '@utils/page-loaders/hybrid-page';
import { hasResources } from './_resources';

// The Resources page lists the resources directly attached to a single system or
// domain. It is only available for systems and domains — every other resource type 404s.
const SUPPORTED_TYPES = ['systems', 'domains'] as const;
type SupportedType = (typeof SUPPORTED_TYPES)[number];

const isSupportedType = (type: string): type is SupportedType => SUPPORTED_TYPES.includes(type as SupportedType);

export const loadResourceOwner = async (type: SupportedType) => {
  if (type === 'systems') {
    const { getSystems } = await import('@utils/collections/systems');
    return getSystems();
  }
  const { getDomains } = await import('@utils/collections/domains');
  return getDomains({ includeServicesInSubdomains: false });
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
        .filter((owner) => hasResources(owner, type))
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

    if (!owner || !hasResources(owner, type)) {
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
