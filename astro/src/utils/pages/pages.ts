import type { CollectionTypes, PageTypes } from '@types';
import { getDomains } from '@utils/domains/domains';
import { getCommands, getEvents } from '@utils/messages';
import { getServices } from '@utils/services/services';
import type { CollectionEntry } from 'astro:content';

export const pageDataLoader: Record<PageTypes, () => Promise<CollectionEntry<CollectionTypes>[]>> = {
  events: getEvents,
  commands: getCommands,
  services: getServices,
  domains: getDomains,
};
