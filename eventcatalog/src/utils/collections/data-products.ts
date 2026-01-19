import { getCollection } from 'astro:content';
import type { CollectionEntry } from 'astro:content';
import path from 'path';
import utils from '@eventcatalog/sdk';
import { createVersionedMap, satisfies } from './util';

const PROJECT_DIR = process.env.PROJECT_DIR || process.cwd();

export type DataProduct = CollectionEntry<'data-products'> & {
  catalog: {
    path: string;
    filePath: string;
    type: string;
    publicPath: string;
  };
};

interface Props {
  getAllVersions?: boolean;
}

// cache for build time
let memoryCache: Record<string, DataProduct[]> = {};

export const getDataProducts = async ({ getAllVersions = true }: Props = {}): Promise<DataProduct[]> => {
  // console.time('✅ New getEntities');
  const cacheKey = getAllVersions ? 'allVersions' : 'currentVersions';

  if (memoryCache[cacheKey] && memoryCache[cacheKey].length > 0) {
    // console.timeEnd('✅ New getEntities');
    return memoryCache[cacheKey];
  }

  // 1. Fetch collections in parallel
  const [allDataProducts, allDomains] = await Promise.all([getCollection('data-products'), getCollection('domains')]);

  // 2. Build optimized maps
  const dataProductMap = createVersionedMap(allDataProducts);

  // 3. Enrich data products
  const processedDataProducts = await Promise.all(
    allDataProducts.map(async (dataProduct) => {
      // Version info
      const dataProductVersions = dataProductMap.get(dataProduct.data.id) || [];
      const latestVersion = dataProductVersions[0]?.data.version || dataProduct.data.version;
      const versions = dataProductVersions.map((e) => e.data.version);

      // Find Domains that reference this data product
      const domainsThatReferenceDataProduct = allDomains.filter((domain) =>
        domain.data['data-products']?.some((item) => {
          if (item.id !== dataProduct.data.id) return false;
          if (item.version === 'latest' || item.version === undefined) return dataProduct.data.version === latestVersion;
          return satisfies(dataProduct.data.version, item.version);
        })
      );

      return {
        ...dataProduct,
        data: {
          ...dataProduct.data,
          versions,
          latestVersion,
          domains: domainsThatReferenceDataProduct,
        },
        catalog: {
          path: path.join(dataProduct.collection, dataProduct.id.replace('/index.mdx', '')),
          filePath: path.join(
            process.cwd(),
            'src',
            'catalog-files',
            dataProduct.collection,
            dataProduct.id.replace('/index.mdx', '')
          ),
          publicPath: '', //path.join('/generated', dataProduct.collection, dataProductFolderName),
          type: 'dataProduct',
        },
      };
    })
  );

  // order them by the name of the data product
  processedDataProducts.sort((a, b) => {
    return (a.data.name || a.data.id).localeCompare(b.data.name || b.data.id);
  });

  memoryCache[cacheKey] = processedDataProducts;
  // console.timeEnd('✅ New getDataProducts');

  return processedDataProducts as DataProduct[];
};
