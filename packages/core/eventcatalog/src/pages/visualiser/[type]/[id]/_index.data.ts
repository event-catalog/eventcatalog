import type { PageTypes } from '@types';
import { isVisualiserEnabled } from '@utils/feature';
import { pageDataLoader } from '@utils/page-loaders/page-data-loader';

/** Resources with a visualiser page (domains and systems have their own, under the same URLs) */
const VISUALISER_TYPES: PageTypes[] = [
  'domains',
  'systems',
  'agents',
  'services',
  'events',
  'commands',
  'queries',
  'flows',
  'containers',
  'channels',
  'data-products',
];

const isVisualiserType = (type: string | undefined): type is PageTypes => VISUALISER_TYPES.includes(type as PageTypes);

const getLatestWithVisualiser = async (type: PageTypes) =>
  (await pageDataLoader[type]({ getAllVersions: false })).filter((item) => (item.data as any).visualiser !== false);

/** The latest version of every resource with a visualiser page: the pages a static build redirects from */
export const getVisualiserResources = async () => {
  if (!isVisualiserEnabled()) return [];
  const resources = await Promise.all(
    VISUALISER_TYPES.map(async (type) => (await getLatestWithVisualiser(type)).map((item) => ({ type, item })))
  );
  return resources.flat();
};

/** The latest version of a resource with a visualiser page, looked up from its URL (a server renders pages on request) */
export const findVisualiserResource = async (type: string | undefined, id: string | undefined) => {
  if (!isVisualiserEnabled() || !isVisualiserType(type) || !id) return undefined;
  return (await getLatestWithVisualiser(type)).find((item) => item.data.id === id);
};
