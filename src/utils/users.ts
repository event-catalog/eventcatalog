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

  // What do they own?
  const services = await getCollection('services');

  // What do they own?
  const events = await getCollection('events');

  // What do they own?
  const commands = await getCollection('commands');

  const teams = await getCollection('teams', (team) => {
    return team.data.hidden !== true;
  });

  return users.map((user) => {
    const ownedDomains = domains.filter((domain) => {
      return domain.data.owners?.find((owner) => owner.slug === user.data.id);
    });

    const ownedServices = services.filter((service) => {
      return service.data.owners?.find((owner) => owner.slug === user.data.id);
    });

    const ownedEvents = events.filter((event) => {
      return event.data.owners?.find((owner) => owner.slug === user.data.id);
    });

    const ownedCommands = commands.filter((command) => {
      return command.data.owners?.find((owner) => owner.slug === user.data.id);
    });

    const associatedTeams = teams.filter((team) => {
      return team.data.members?.find((member) => member.slug === user.data.id);
    });

    return {
      ...user,
      data: {
        ...user.data,
        ownedDomains,
        ownedServices,
        ownedEvents,
        ownedCommands,
        associatedTeams,
      },
      catalog: {
        path: path.join(user.collection, user.id.replace('/index.mdx', '')),
        filePath: path.join(process.cwd(), 'src', 'catalog-files', user.collection, user.id.replace('/index.mdx', '')),
        type: 'user',
      },
    };
  });
};
