import { getCollection } from 'astro:content';
import type { CollectionEntry } from 'astro:content';
import path from 'path';

export type Team = CollectionEntry<'teams'>;

export const getTeams = async (): Promise<Team[]> => {
  // Get services that are not versioned
  const teams = await getCollection('teams', (team) => {
    return team.data.hidden !== true;
  });

  // What do they own?
  const services = await getCollection('services');
  // What do they own?
  const events = await getCollection('events');
  const commands = await getCollection('commands');

  return teams.map((team) => {
    const ownedServices = services.filter((service) => {
      return service.data.owners?.find((owner) => owner.slug === team.data.id);
    });

    const ownedEvents = events.filter((event) => {
      return event.data.owners?.find((owner) => owner.slug === team.data.id);
    });

    const ownedCommands = commands.filter((command) => {
      return command.data.owners?.find((owner) => owner.slug === team.data.id);
    });

    return {
      ...team,
      data: {
        ...team.data,
        ownedServices,
        ownedCommands,
        ownedEvents,
      },
      catalog: {
        path: path.join(team.collection, team.id.replace('/index.mdx', '')),
        filePath: path.join(process.cwd(), 'src', 'catalog-files', team.collection, team.id.replace('/index.mdx', '')),
        type: 'team',
      },
    };
  });
};
