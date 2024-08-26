import { getCollection } from 'astro:content';
import type { CollectionEntry } from 'astro:content';
import path from 'path';
import { getVersionForCollectionItem, satisfies } from './collections/util';

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
      return service.data.sends?.some((item) => {
        if (item.id != command.data.id) return false;
        if (item.version == 'latest' || item.version == undefined) return command.data.version == latestVersion;
        return satisfies(command.data.version, item.version);
      });
    });

    const consumers = services.filter((service) => {
      return service.data.receives?.some((item) => {
        if (item.id != command.data.id) return false;
        if (item.version == 'latest' || item.version == undefined) return command.data.version == latestVersion;
        return satisfies(command.data.version, item.version);
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
        absoluteFilePath: path.join(PROJECT_DIR, command.collection, command.id.replace('/index.mdx', '/index.md')),
        filePath: path.join(process.cwd(), 'src', 'catalog-files', command.collection, command.id.replace('/index.mdx', '')),
        publicPath: path.join('/generated', command.collection, command.id.replace('/index.mdx', '')),
        type: 'command',
      },
    };
  });
};
