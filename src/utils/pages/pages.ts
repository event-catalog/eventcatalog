import type { CollectionTypes, PageTypes } from '@types';
import { getDomains } from '@utils/domains/domains';
import { getCommands, getEvents } from '@utils/messages';
import { getServices } from '@utils/services/services';
import type { CollectionEntry } from 'astro:content';

export const pageDataLoader: Record<PageTypes, () => Promise<CollectionEntry<CollectionTypes>[]>> = {
  // @ts-ignore for large catalogs https://github.com/event-catalog/eventcatalog/issues/857
  events: getEvents,
  commands: getCommands,
  services: getServices,
  domains: getDomains,
};
