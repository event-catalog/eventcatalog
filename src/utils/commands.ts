import { getCollection } from 'astro:content';
import type { CollectionEntry } from 'astro:content';
import path from 'path';
import { getVersionForCollectionItem } from './collections/util';
import { satisfies } from 'semver';

const PROJECT_DIR = process.env.PROJECT_DIR || process.cwd();

type Command = CollectionEntry<'commands'> & {
  catalog: {
    path: string;
    filePath: string;
    type: string;
  };
};

interface Props {
  getAllVersions?: boolean;
}

export const getCommands = async ({ getAllVersions = true }: Props = {}): Promise<Command[]> => {
  const commands = await getCollection('commands', (command) => {
    return (getAllVersions || !command.slug.includes('versioned')) && command.data.hidden !== true;
  });
  const services = await getCollection('services');

  return commands.map((command) => {
    const { latestVersion, versions } = getVersionForCollectionItem(command, commands);

    const producers = services.filter((service) => {
      if (!service.data.sends) return false;
      return service.data.sends.find((item) => {
        if (item.version) return item.id === command.data.id && satisfies(command.data.version, item.version);
        return item.id == command.data.id; // ??
      });
    });

    const consumers = services.filter((service) => {
      if (!service.data.receives) return false;
      return service.data.receives.find((item) => {
        if (item.version) return item.id === command.data.id && satisfies(command.data.version, item.version);
        return item.id == command.data.id; // ??
      });
    });

    return {
      ...command,
      data: {
        ...command.data,
        producers,
        consumers,
        versions,
        latestVersion,
      },
      catalog: {
        path: path.join(command.collection, command.id.replace('/index.mdx', '')),
        filePath: path.join(process.cwd(), 'src', 'catalog-files', command.collection, command.id.replace('/index.mdx', '')),
        publicPath: path.join('/generated', command.collection, command.id.replace('/index.mdx', '')),
        type: 'command',
      },
    };
  });
};
