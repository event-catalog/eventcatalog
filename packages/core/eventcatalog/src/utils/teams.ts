import { getCollection } from 'astro:content';
import type { CollectionEntry } from 'astro:content';
import path from 'path';

export type Team = CollectionEntry<'teams'>;

// Cache for build time
let cachedTeams: Team[] = [];

export const getTeams = async (): Promise<Team[]> => {
  if (cachedTeams.length > 0) {
    return cachedTeams;
  }

  // Get services that are not versioned
  const teams = await getCollection('teams', (team) => {
    return team.data.hidden !== true;
  });
  // What do they own?
  const domains = await getCollection('domains');
  // What do they own?
  const services = await getCollection('services');
  // What do they own?
  const events = await getCollection('events');
  const commands = await getCollection('commands');
  const queries = await getCollection('queries');
  cachedTeams = teams.map((team) => {
    const ownedDomains = domains.filter((domain) => {
      return domain.data.owners?.find((owner) => owner.id === team.data.id);
    });

    const ownedServices = services.filter((service) => {
      return service.data.owners?.find((owner) => owner.id === team.data.id);
    });

    const ownedEvents = events.filter((event) => {
      return event.data.owners?.find((owner) => owner.id === team.data.id);
    });

    const ownedCommands = commands.filter((command) => {
      return command.data.owners?.find((owner) => owner.id === team.data.id);
    });

    const ownedQueries = queries.filter((query) => {
      return query.data.owners?.find((owner) => owner.id === team.data.id);
    });

    return {
      ...team,
      data: {
        ...team.data,
        ownedDomains,
        ownedServices,
        ownedCommands,
        ownedQueries,
        ownedEvents,
      },
      catalog: {
        path: path.join(team.collection, team.id.replace('/index.mdx', '')),
        filePath: path.join(process.cwd(), 'src', 'catalog-files', team.collection, team.id.replace('/index.mdx', '')),
        type: 'team',
      },
    };
  });

  // order them by the name of the team
  cachedTeams.sort((a, b) => {
    return (a.data.name || a.data.id).localeCompare(b.data.name || b.data.id);
  });

  return cachedTeams;
};
