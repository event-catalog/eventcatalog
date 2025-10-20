import { getCollection } from 'astro:content';
import type { CollectionEntry } from 'astro:content';
import path from 'path';
import { getVersionForCollectionItem, satisfies } from './collections/util';
import utils from '@eventcatalog/sdk';

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
  hydrateServices?: boolean;
}

// cache for build time
let cachedCommands: Record<string, Command[]> = {
  allVersions: [],
  currentVersions: [],
};

export const getCommands = async ({ getAllVersions = true, hydrateServices = true }: Props = {}): Promise<Command[]> => {
  const cacheKey = getAllVersions ? 'allVersions' : 'currentVersions';

  if (cachedCommands[cacheKey].length > 0 && hydrateServices) {
    return cachedCommands[cacheKey];
  }

  const commands = await getCollection('commands', (command) => {
    return (getAllVersions || !command.filePath?.includes('versioned')) && command.data.hidden !== true;
  });

  const services = await getCollection('services');
  const allChannels = await getCollection('channels');

  // @ts-ignore
  cachedCommands[cacheKey] = await Promise.all(
    commands.map(async (command) => {
      const { latestVersion, versions } = getVersionForCollectionItem(command, commands);

      const producers = services
        .filter((service) => {
          return service.data.sends?.some((item) => {
            if (item.id != command.data.id) return false;
            if (item.version == 'latest' || item.version == undefined) return command.data.version == latestVersion;
            return satisfies(command.data.version, item.version);
          });
        })
        .map((service) => {
          if (!hydrateServices) return { id: service.data.id, version: service.data.version };
          return service;
        });

      const consumers = services
        .filter((service) => {
          return service.data.receives?.some((item) => {
            if (item.id != command.data.id) return false;
            if (item.version == 'latest' || item.version == undefined) return command.data.version == latestVersion;
            return satisfies(command.data.version, item.version);
          });
        })
        .map((service) => {
          if (!hydrateServices) return { id: service.data.id, version: service.data.version };
          return service;
        });

      const messageChannels = command.data.channels || [];
      const channelsForCommand = allChannels.filter((c) => messageChannels.some((channel) => c.data.id === channel.id));

      const { getResourceFolderName } = utils(process.env.PROJECT_DIR ?? '');
      const folderName = await getResourceFolderName(
        process.env.PROJECT_DIR ?? '',
        command.data.id,
        command.data.version.toString()
      );
      const commandFolderName = folderName ?? command.id.replace(`-${command.data.version}`, '');

      return {
        ...command,
        data: {
          ...command.data,
          messageChannels: channelsForCommand,
          producers,
          consumers,
          versions,
          latestVersion,
        },
        catalog: {
          path: path.join(command.collection, command.id.replace('/index.mdx', '')),
          absoluteFilePath: path.join(PROJECT_DIR, command.collection, command.id.replace('/index.mdx', '/index.md')),
          astroContentFilePath: path.join(process.cwd(), 'src', 'content', command.collection, command.id),
          filePath: path.join(process.cwd(), 'src', 'catalog-files', command.collection, command.id.replace('/index.mdx', '')),
          publicPath: path.join('/generated', command.collection, commandFolderName),
          type: 'command',
        },
      };
    })
  );

  // order them by the name of the command
  cachedCommands[cacheKey].sort((a, b) => {
    return (a.data.name || a.data.id).localeCompare(b.data.name || b.data.id);
  });

  return cachedCommands[cacheKey];
};
