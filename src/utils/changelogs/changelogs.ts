import type { CollectionTypes } from '@types';
import { getCollection, type CollectionEntry } from 'astro:content';

export type ChangeLog = CollectionEntry<'changelogs'>;

export const getChangeLogs = async (item: CollectionEntry<CollectionTypes>): Promise<ChangeLog[]> => {
  const { collection, data } = item;

  // Get all logs for collection type
  const logs = await getCollection('changelogs', (log) => {
    return log.id.includes(`${collection}/`) && log.id.includes(`/${data.id}/`);
  });

  const hydratedLogs = logs.map((log) => {
    const parts = log.id.split('/');
    return {
      ...log,
      data: {
        ...log.data,
        version: parts[parts.length - 2]
      }
    };
  });

  // Order by version string
  return hydratedLogs.sort((a, b) => {
    return b.data.version.localeCompare(a.data.version);
  });

};
