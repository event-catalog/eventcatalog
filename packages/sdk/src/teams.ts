import fs from 'node:fs/promises';
import fsSync from 'node:fs';
import { join } from 'node:path';
import type { Team } from './types';
import matter from 'gray-matter';
import { getFiles } from './internal/utils';
import { getResource } from './internal/resources';
import path from 'node:path';
import { getUser, getUsers } from './users';

/**
 * Returns a team from EventCatalog.
 *
 *
 * @example
 * ```ts
 * import utils from '@eventcatalog/utils';
 *
 * const { getTeam } = utils('/path/to/eventcatalog');
 *
 * // Gets the team with the given id
 * const team = await getTeam('eventcatalog-core-team');
 *
 * ```
 */
export const getTeam =
  (catalogDir: string) =>
  async (id: string): Promise<Team | undefined> => {
    const files = await getFiles(`${catalogDir}/${id}.{md,mdx}`);

    if (files.length == 0) return undefined;
    const file = files[0];

    const { data, content } = matter.read(file);
    return {
      ...data,
      id: data.id,
      name: data.name,
      markdown: content.trim(),
    } as Team;
  };

/**
 * Returns all teams from EventCatalog.
 *
 * @example
 * ```ts
 * import utils from '@eventcatalog/utils';
 *
 * const { getTeams } = utils('/path/to/eventcatalog');
 *
 * // Gets all teams from the catalog
 * const channels = await getTeams();
 *
 * ```
 */
export const getTeams =
  (catalogDir: string) =>
  async (options?: {}): Promise<Team[]> => {
    const files = await getFiles(`${catalogDir}/*.{md,mdx}`);
    if (files.length === 0) return [];

    return files.map((file) => {
      const { data, content } = matter.read(file);
      return {
        ...data,
        id: data.id,
        name: data.name,
        markdown: content.trim(),
      } as Team;
    });
  };

/**
 * Write a team to EventCatalog.
 *
 * @example
 * ```ts
 * import utils from '@eventcatalog/utils';
 *
 * const { writeTeam } = utils('/path/to/eventcatalog');
 *
 * // Write a team to the catalog
 * // team would be written to teams/EventCatalogCoreTeam
 * await writeTeam({
 *   id: 'eventcatalog-core-team',
 *   name: 'EventCatalogCoreTeam',
 *   members: ['dboyne', 'asmith', 'msmith'],
 *   email: 'test@test.com',
 *   slackDirectMessageUrl: https://yourteam.slack.com/channels/boyney123
 * });
 *
 * // Write a team to the catalog and override the existing content (if there is any)
 * await writeTeam({
 *   id: 'eventcatalog-core-team',
 *   name: 'EventCatalogCoreTeam',
 *   members: ['dboyne', 'asmith', 'msmith'],
 *   email: 'test@test.com',
 *   slackDirectMessageUrl: https://yourteam.slack.com/channels/boyney123
 * }, { override: true });
 *
 * ```
 */
export const writeTeam =
  (catalogDir: string) =>
  async (team: Team, options: { override?: boolean } = {}) => {
    const resource: Team = { ...team };

    // Get the path
    const currentTeam = await getTeam(catalogDir)(resource.id);
    const exists = currentTeam !== undefined;

    if (exists && !options.override) {
      throw new Error(`Failed to write ${resource.id} (team) as it already exists`);
    }

    const { markdown, ...frontmatter } = resource;

    const document = matter.stringify(markdown, frontmatter);
    fsSync.mkdirSync(join(catalogDir, ''), { recursive: true });
    fsSync.writeFileSync(join(catalogDir, '', `${resource.id}.mdx`), document);
  };

/**
 * Delete a team by it's id.
 *
 * @example
 * ```ts
 * import utils from '@eventcatalog/utils';
 *
 * const { rmTeamById } = utils('/path/to/eventcatalog');
 *
 * // deletes the EventCatalogCoreTeam team
 * await rmTeamById('eventcatalog-core-team');
 *
 * ```
 */
export const rmTeamById = (catalogDir: string) => async (id: string) => {
  await fs.rm(join(catalogDir, `${id}.mdx`), { recursive: true });
};

/**
 * Returns the owners for a given resource (e.g domain, service, event, command, query, etc.)
 * @param id - The id of the resource to get the owners for
 * @param version - Optional version of the resource
 * @returns { owners: User[] }
 */
export const getOwnersForResource = (catalogDir: string) => async (id: string, version?: string) => {
  const resource = await getResource(catalogDir, id, version);
  let owners: Team[] = [];
  if (!resource) return [];

  if (!resource.owners) return [];

  // First check if the owner is a team
  for (const owner of resource.owners) {
    const team = await getTeam(path.join(catalogDir, 'teams'))(owner);
    if (team) {
      owners.push(team);
    } else {
      // If the owner is not a team, check if it's a user
      const user = await getUser(path.join(catalogDir, 'users'))(owner);
      if (user) {
        owners.push(user);
      }
    }
  }

  return owners;
};
