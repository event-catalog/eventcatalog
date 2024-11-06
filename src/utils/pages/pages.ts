import type { CollectionTypes, PageTypes } from '@types';
import { getChannels } from '@utils/channels';
import { getDomains } from '@utils/domains/domains';
import { getCommands, getEvents } from '@utils/messages';
import { getQueries } from '@utils/queries';
import { getServices } from '@utils/services/services';
import type { CollectionEntry } from 'astro:content';

export const pageDataLoader: Record<PageTypes, () => Promise<CollectionEntry<CollectionTypes>[]>> = {
  events: getEvents,
  commands: getCommands,
  queries: getQueries,
  services: getServices,
  domains: getDomains,
  channels: getChannels
};
