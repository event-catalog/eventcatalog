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
    const associatedTeams = teams.filter((team) => {
      return team.data.members?.some((member) => member.slug === user.data.id);
    });

    const ownedDomains = domains.filter((domain) => {
      return domain.data.owners?.find((owner) => owner.slug === user.data.id);
    });

    const isOwnedByUserOrAssociatedTeam = () => {
      const associatedTeamsSlug: string[] = associatedTeams.map((team) => team.slug);

      return ({ data }: { data: { owners?: Array<{ slug: string }> } }) => {
        return data.owners?.some((owner) => owner.slug === user.data.id || associatedTeamsSlug.includes(owner.slug));
      };
    };

    const ownedServices = services.filter(isOwnedByUserOrAssociatedTeam());

    const ownedEvents = events.filter(isOwnedByUserOrAssociatedTeam());

    const ownedCommands = commands.filter(isOwnedByUserOrAssociatedTeam());

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
