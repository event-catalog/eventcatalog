import { getCollection } from 'astro:content';
import type { CollectionEntry } from 'astro:content';
import path from 'path';
import { createVersionedMap } from '@utils/collections/util';

const CACHE_ENABLED = process.env.DISABLE_EVENTCATALOG_CACHE !== 'true';
export type Diagram = CollectionEntry<'diagrams'>;

interface Props {
  getAllVersions?: boolean;
}

// Cache for build time
let memoryCache: Record<string, Diagram[]> = {};

export const getDiagrams = async ({ getAllVersions = true }: Props = {}): Promise<Diagram[]> => {
  const cacheKey = getAllVersions ? 'allVersions' : 'currentVersions';

  if (memoryCache[cacheKey] && memoryCache[cacheKey].length > 0 && CACHE_ENABLED) {
    return memoryCache[cacheKey];
  }

  const allDiagrams = await getCollection('diagrams');

  // Build optimized map for version lookups
  const diagramMap = createVersionedMap(allDiagrams);

  // Filter diagrams
  const targetDiagrams = allDiagrams.filter((diagram) => {
    if (!getAllVersions && diagram.filePath?.includes('versioned')) return false;
    return true;
  });

  // Enrich diagrams with version info
  const processedDiagrams = targetDiagrams.map((diagram) => {
    const diagramVersions = diagramMap.get(diagram.data.id) || [];
    const latestVersion = diagramVersions[0]?.data.version || diagram.data.version;
    const versions = diagramVersions.map((d) => d.data.version);

    return {
      ...diagram,
      data: {
        ...diagram.data,
        versions,
        latestVersion,
      },
      catalog: {
        path: path.join(diagram.collection, diagram.id.replace('/index.mdx', '')),
        filePath: path.join(process.cwd(), 'src', 'catalog-files', diagram.collection, diagram.id.replace('/index.mdx', '')),
        publicPath: path.join('/generated', diagram.collection),
        type: 'diagram',
      },
    };
  });

  // Sort by name
  processedDiagrams.sort((a, b) => {
    return (a.data.name || a.data.id).localeCompare(b.data.name || b.data.id);
  });

  memoryCache[cacheKey] = processedDiagrams;

  return processedDiagrams;
};
