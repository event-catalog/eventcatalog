// Exporting getCommands and getEvents directly
import { getCommands } from '@utils/commands';
import { getEvents } from '@utils/events';
import { getQueries } from './queries';
import type { CollectionEntry } from 'astro:content';
export { getCommands } from '@utils/commands';
export { getEvents } from '@utils/events';

interface Props {
  getAllVersions?: boolean;
  hydrateServices?: boolean;
}

type Messages = {
  commands: CollectionEntry<'commands'>[];
  events: CollectionEntry<'events'>[];
  queries: CollectionEntry<'queries'>[];
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
