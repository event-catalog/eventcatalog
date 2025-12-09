// Exporting getCommands and getEvents directly
import { getCommands } from '@utils/collections/commands';
import { getEvents } from '@utils/collections/events';
import { getQueries } from './queries';
import type { CollectionEntry } from 'astro:content';
export { getCommands } from '@utils/collections/commands';
export { getEvents } from '@utils/collections/events';

interface Props {
  getAllVersions?: boolean;
  hydrateServices?: boolean;
}

type Messages = {
  commands: CollectionEntry<'commands'>[];
  events: CollectionEntry<'events'>[];
  queries: CollectionEntry<'queries'>[];
};

export const pluralizeMessageType = (message: CollectionEntry<'events' | 'commands' | 'queries'>) => {
  const typeMap: Record<string, string> = {
    events: 'event',
    commands: 'command',
    queries: 'query',
  };
  return typeMap[message.collection] || 'message';
};

// Main function that uses the imported functions
export const getMessages = async ({ getAllVersions = true, hydrateServices = true }: Props = {}): Promise<Messages> => {
  const [commands, events, queries] = await Promise.all([
    getCommands({ getAllVersions, hydrateServices }),
    getEvents({ getAllVersions, hydrateServices }),
    getQueries({ getAllVersions, hydrateServices }),
  ]);

  return {
    commands,
    events,
    queries,
  };
};
