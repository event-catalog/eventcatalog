// Exporting getCommands and getEvents directly
import { getCommands } from '@utils/commands';
import { getEvents } from '@utils/events';
import { getQueries } from './queries';
import type { CollectionEntry } from 'astro:content';
export { getCommands } from '@utils/commands';
export { getEvents } from '@utils/events';

interface Props {
  getAllVersions?: boolean;
}

type Messages = {
  commands: CollectionEntry<'commands'>[];
  events: CollectionEntry<'events'>[];
  queries: CollectionEntry<'queries'>[];
};
// Main function that uses the imported functions
export const getMessages = async ({ getAllVersions = true }: Props = {}): Promise<Messages> => {
  const commands = await getCommands({ getAllVersions });
  const events = await getEvents({ getAllVersions });
  const queries = await getQueries({ getAllVersions });

  return {
    commands: commands as CollectionEntry<'commands'>[],
    events: events as CollectionEntry<'events'>[],
    queries: queries as CollectionEntry<'queries'>[],
  } satisfies Messages;
};
