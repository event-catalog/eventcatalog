import type { EventCatalog } from './types';
import fs from 'fs';
import path, { join } from 'node:path';
import utils from './index';
import { getResourcePath } from './internal/resources';

const DUMP_VERSION = '0.0.1';

const getEventCatalogVersion = async (catalogDir: string) => {
  // Read package.json in the catalogDir
  try {
    const packageJson = fs.readFileSync(join(catalogDir, 'package.json'), 'utf8');
    const packageJsonObject = JSON.parse(packageJson);
    return packageJsonObject['dependencies']['@eventcatalog/core'];
  } catch (error) {
    return 'unknown';
  }
};

const hydrateResource = async (
  catalogDir: string,
  resources: any[] = [],
  { attachSchema = false }: { attachSchema?: boolean } = {}
) => {
  return await Promise.all(
    resources.map(async (resource) => {
      // Get resource from directory
      // Get resource from directory
      const resourcePath = await getResourcePath(catalogDir, resource.id, resource.version);
      let schema = '';

      if (resource.schemaPath && resourcePath?.fullPath) {
        const pathToSchema = path.join(path.dirname(resourcePath?.fullPath), resource.schemaPath);
        if (fs.existsSync(pathToSchema)) {
          schema = fs.readFileSync(pathToSchema, 'utf8');
        }
      }

      // const hasSchemaPath = resource.data.schemaPath;

      const eventcatalog = schema ? { directory: resourcePath?.directory, schema } : { directory: resourcePath?.directory };

      return {
        ...resource,
        _eventcatalog: eventcatalog,
      };
    })
  );
};

const filterCollection = (
  collection: any[],
  options?: {
    includeMarkdown?: boolean;
  }
) => {
  return collection.map((item) => ({
    ...item,
    markdown: options?.includeMarkdown ? item.markdown : undefined,
  }));
};

/**
 * Returns the event catalog configuration file.
 * The event catalog configuration file is the file that contains the configuration for the event catalog.
 *
 * @param directory - The directory of the catalog.
 * @returns A JSON object with the configuration for the event catalog.
 */
export const getEventCatalogConfigurationFile = (directory: string) => async (): Promise<any> => {
  // Read package.json in the catalogDir
  try {
    const path = join(directory, 'eventcatalog.config.js');
    // Dynamically import the ES module
    const configModule = await import(path);
    return configModule.default;
  } catch (error) {
    console.error('Error getting event catalog configuration file', error);
    return null;
  }
};

/**
 * Dumps the catalog to a JSON file.
 *
 * @param directory - The directory of the catalog.
 * @returns A JSON file with the catalog.
 */
export const dumpCatalog =
  (directory: string) =>
  async (options?: { includeMarkdown?: boolean }): Promise<EventCatalog> => {
    const { getDomains, getServices, getEvents, getQueries, getCommands, getChannels, getTeams, getUsers } = utils(directory);

    const { includeMarkdown = true } = options || {};

    const domains = await getDomains();
    const services = await getServices();

    const events = await getEvents();
    const commands = await getCommands();
    const queries = await getQueries();
    const teams = await getTeams();
    const users = await getUsers();
    const channels = await getChannels();

    const [
      hydratedDomains,
      hydratedServices,
      hydratedEvents,
      hydratedQueries,
      hydratedCommands,
      hydratedTeams,
      hydratedUsers,
      hydratedChannels,
    ] = await Promise.all([
      hydrateResource(directory, domains),
      hydrateResource(directory, services),
      hydrateResource(directory, events),
      hydrateResource(directory, queries),
      hydrateResource(directory, commands),
      hydrateResource(directory, teams),
      hydrateResource(directory, users),
      hydrateResource(directory, channels),
    ]);

    return {
      version: DUMP_VERSION,
      catalogVersion: await getEventCatalogVersion(directory),
      createdAt: new Date().toISOString(),
      resources: {
        domains: filterCollection(hydratedDomains, { includeMarkdown }),
        services: filterCollection(hydratedServices, { includeMarkdown }),
        messages: {
          events: filterCollection(hydratedEvents, { includeMarkdown }),
          queries: filterCollection(hydratedQueries, { includeMarkdown }),
          commands: filterCollection(hydratedCommands, { includeMarkdown }),
        },
        teams: filterCollection(hydratedTeams, { includeMarkdown }),
        users: filterCollection(hydratedUsers, { includeMarkdown }),
        channels: filterCollection(hydratedChannels, { includeMarkdown }),
      },
    };
  };
