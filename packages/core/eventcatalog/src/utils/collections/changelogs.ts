import type { CollectionTypes } from '@types';
import { getCollection, type CollectionEntry } from 'astro:content';
import path from 'node:path';

export type ChangeLog = CollectionEntry<'changelogs'>;

export const getChangeLogs = async (item: CollectionEntry<CollectionTypes>): Promise<ChangeLog[]> => {
  const { collection, data, filePath } = item;

  // Get all logs for collection type and filter by given collection
  const logs = await getCollection('changelogs', (log) => {
    const collectionDirectory = path.dirname(item?.filePath || '');
    const isRootChangeLog = path.join(collectionDirectory, 'changelog.mdx') === log.filePath;
    // Ensure the path follows <collectionDirectory>/versioned/<version>/changelog.mdx
    const versionedPathPattern = new RegExp(`${collectionDirectory}/versioned/[^/]+/changelog\\.mdx$`);
    const isVersionedChangeLog = versionedPathPattern.test(log.filePath!);
    return log.id.includes(`${collection}/`) && (isRootChangeLog || isVersionedChangeLog);
  });

  const hydratedLogs = logs.map((log) => {
    // Check if there is a version in the url
    const isVersioned = log.id.includes('versioned');

    const parts = log.filePath!.split('/');
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
