import type { CollectionTypes } from '@types';
import { getCollection } from 'astro:content';
import type { CollectionEntry } from 'astro:content';
import path from 'path';

export type User = CollectionEntry<'users'>;

export const getUsers = async (): Promise<User[]> => {
  // Get services that are not versioned
  const users = await getCollection('users', (user) => {
    return user.data.hidden !== true;
  });

  // What do they own?
  const domains = await getCollection('domains');
  const services = await getCollection('services');
  const events = await getCollection('events');
  const commands = await getCollection('commands');
  const queries = await getCollection('queries');

  const teams = await getCollection('teams', (team) => {
    return team.data.hidden !== true;
  });

  const mappedUsers = users.map((user) => {
    const associatedTeams = teams.filter((team) => {
      return team.data.members?.some((member) => member.id === user.data.id);
    });

    const ownedDomains = domains.filter((domain) => {
      return domain.data.owners?.find((owner) => owner.id === user.data.id);
    });

    const isOwnedByUserOrAssociatedTeam = (item: CollectionEntry<CollectionTypes>) => {
      const associatedTeamsId: string[] = associatedTeams.map((team) => team.data.id);
      return item.data.owners?.some((owner) => owner.id === user.data.id || associatedTeamsId.includes(owner.id));
    };

    const ownedServices = services.filter(isOwnedByUserOrAssociatedTeam);

    const ownedEvents = events.filter(isOwnedByUserOrAssociatedTeam);

    const ownedCommands = commands.filter(isOwnedByUserOrAssociatedTeam);

    const ownedQueries = queries.filter(isOwnedByUserOrAssociatedTeam);

    return {
      ...user,
      data: {
        ...user.data,
        ownedDomains,
        ownedServices,
        ownedEvents,
        ownedCommands,
        ownedQueries,
        associatedTeams,
      },
      catalog: {
        path: path.join(user.collection, user.id.replace('/index.mdx', '')),
        filePath: path.join(process.cwd(), 'src', 'catalog-files', user.collection, user.id.replace('/index.mdx', '')),
        type: 'user',
      },
    };
  });

  // order them by the name of the user
  mappedUsers.sort((a, b) => {
    return (a.data.name || a.data.id).localeCompare(b.data.name || b.data.id);
  });

  return mappedUsers;
};
