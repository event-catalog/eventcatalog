import type { CollectionTypes } from '@types';
import { getCollection, type CollectionEntry } from 'astro:content';

export type ChangeLog = CollectionEntry<'changelogs'>;

export const getChangeLogs = async (item: CollectionEntry<CollectionTypes>): Promise<ChangeLog[]> => {
  const { collection, data } = item;

  // Get all logs for collection type and filter by given collection
  const logs = await getCollection('changelogs', (log: CollectionEntry<'changelogs'>) => {
    return log.id.includes(`${collection}/`) && log.id.includes(`/${data.id}/`);
  }) as ChangeLog[];

  const hydratedLogs = logs.map((log) => {
    // Check if there is a version in the url
    const isVersioned = log.id.includes('versioned');

    const parts = log.id.split('/');
    // hack to get the version of the id (url)
    const version = parts[parts.length - 2];
    return {
      ...log,
      data: {
        ...log.data,
        version: isVersioned ? version : data.latestVersion || 'latest',
      },
    };
  });

  // Order by version string
  return hydratedLogs.sort((a, b) => {
    return b.data.version.localeCompare(a.data.version);
  });
};
