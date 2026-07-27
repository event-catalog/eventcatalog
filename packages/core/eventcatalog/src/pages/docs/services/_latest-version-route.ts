import type { CollectionEntry } from 'astro:content';

type StaticPath = {
  params: Record<string, string | undefined>;
  props?: Record<string, unknown>;
};

type LatestService = CollectionEntry<'services'>;

export const toLatestServicePaths = (paths: StaticPath[], latestServices: LatestService[]): StaticPath[] => {
  const latestVersions = new Map(latestServices.map((service) => [service.data.id, service.data.version]));

  return paths.flatMap(({ params, props = {} }) => {
    const { type, version, ...aliasParams } = params;

    if (type !== 'services' || !params.id || latestVersions.get(params.id) !== version) {
      return [];
    }

    return [
      {
        params: aliasParams,
        props: {
          ...props,
          redirectVersion: version,
        },
      },
    ];
  });
};

export const getLatestServicePaths = async (paths: StaticPath[]): Promise<StaticPath[]> => {
  const { getServices } = await import('@utils/collections/services');
  const latestServices = await getServices({ getAllVersions: false });
  return toLatestServicePaths(paths, latestServices);
};

export const getLatestServiceVersion = async (id: string): Promise<string | undefined> => {
  const { getServices } = await import('@utils/collections/services');
  const latestServices = await getServices({ getAllVersions: false });
  return latestServices.find((service) => service.data.id === id)?.data.version;
};
