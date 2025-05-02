import type { CollectionTypes, PageTypes } from '@types';
import { getChannels } from '@utils/channels';
import { getDomains } from '@utils/collections/domains';
import { getCommands, getEvents } from '@utils/messages';
import { getQueries } from '@utils/queries';
import { getServices } from '@utils/collections/services';
import { getFlows } from '@utils/collections/flows';
import { getEntities } from '@utils/entities';
import type { CollectionEntry } from 'astro:content';

export const pageDataLoader: Record<PageTypes, () => Promise<CollectionEntry<CollectionTypes>[]>> = {
  events: getEvents,
  commands: getCommands,
  queries: getQueries,
  services: getServices,
  domains: getDomains,
  channels: getChannels,
  flows: getFlows,
  entities: getEntities,
};
