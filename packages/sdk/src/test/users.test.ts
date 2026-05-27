// users.test.js
import { expect, it, describe, beforeEach, afterEach } from 'vitest';
import utils from '../index';
import path from 'node:path';
import fs from 'node:fs';

const CATALOG_PATH = path.join(__dirname, 'catalog-users');

const { writeUser, getUser, getUsers, rmUserById } = utils(CATALOG_PATH);

// clean the catalog before each test
beforeEach(() => {
  fs.rmSync(CATALOG_PATH, { recursive: true, force: true });
  fs.mkdirSync(CATALOG_PATH, { recursive: true });
});

afterEach(() => {
  fs.rmSync(CATALOG_PATH, { recursive: true, force: true });
});

describe('Users SDK', () => {
  describe('getUser', () => {
    it('returns the given user by id from EventCatalog,', async () => {
      await writeUser({
        id: 'eventcatalog-core-user',
        name: 'Eventcatalog Core user',
        markdown: 'This is the core user for Eventcatalog',
        avatarUrl: 'https://pbs.twimg.com/profile_images/1262283153563140096/DYRDqKg6_400x400.png',
      });

      const test = await getUser('eventcatalog-core-user');

      expect(test).toEqual({
        id: 'eventcatalog-core-user',
        name: 'Eventcatalog Core user',
        markdown: 'This is the core user for Eventcatalog',
        avatarUrl: 'https://pbs.twimg.com/profile_images/1262283153563140096/DYRDqKg6_400x400.png',
      });
    });

    it('returns undefined when the user is not found', async () => {
      await expect(await getUser('unknown-user')).toEqual(undefined);
    });

    it('returns a user from the EventCatalog directory store when no local file exists', async () => {
      fs.mkdirSync(path.join(CATALOG_PATH, '.eventcatalog', 'store'), { recursive: true });
      fs.writeFileSync(
        path.join(CATALOG_PATH, '.eventcatalog', 'store', 'directory.json'),
        JSON.stringify({
          version: '1',
          generatedAt: '2026-05-27T00:00:00.000Z',
          resources: {
            users: [
              {
                id: 'github-user',
                name: 'github-user',
                avatarUrl: 'https://example.com/avatar.png',
                markdown: 'This user is synced from GitHub',
                readOnly: true,
                source: {
                  provider: 'github',
                  url: 'https://github.com/github-user',
                },
              },
            ],
            teams: [],
          },
        })
      );

      const user = await getUser('github-user');

      expect(user).toEqual({
        id: 'github-user',
        name: 'github-user',
        avatarUrl: 'https://example.com/avatar.png',
        markdown: 'This user is synced from GitHub',
        readOnly: true,
        source: {
          provider: 'github',
          url: 'https://github.com/github-user',
        },
      });
    });
  });

  describe('getUsers', () => {
    it('returns all the users in the catalog,', async () => {
      await writeUser({
        id: 'eventcatalog-core-user',
        name: 'Eventcatalog Core User',
        markdown: 'This is the core user for Eventcatalog',
        avatarUrl: 'https://pbs.twimg.com/profile_images/1262283153563140096/DYRDqKg6_400x400.png',
      });

      await writeUser({
        id: 'eventcatalog-second-user',
        name: 'Eventcatalog Second User',
        markdown: 'This is the second user for Eventcatalog',
        avatarUrl: 'https://pbs.twimg.com/profile_images/1262283153563140096/DYRDqKg6_400x400.png',
      });

      const users = await getUsers();

      expect(users).toEqual([
        {
          id: 'eventcatalog-second-user',
          name: 'Eventcatalog Second User',
          markdown: 'This is the second user for Eventcatalog',
          avatarUrl: 'https://pbs.twimg.com/profile_images/1262283153563140096/DYRDqKg6_400x400.png',
        },
        {
          id: 'eventcatalog-core-user',
          name: 'Eventcatalog Core User',
          markdown: 'This is the core user for Eventcatalog',
          avatarUrl: 'https://pbs.twimg.com/profile_images/1262283153563140096/DYRDqKg6_400x400.png',
        },
      ]);
    });

    it('merges users from the EventCatalog directory store after local users', async () => {
      await writeUser({
        id: 'local-user',
        name: 'Local User',
        markdown: 'This is a local user',
        avatarUrl: 'https://example.com/local.png',
      });

      fs.mkdirSync(path.join(CATALOG_PATH, '.eventcatalog', 'store'), { recursive: true });
      fs.writeFileSync(
        path.join(CATALOG_PATH, '.eventcatalog', 'store', 'directory.json'),
        JSON.stringify({
          version: '1',
          generatedAt: '2026-05-27T00:00:00.000Z',
          resources: {
            users: [
              {
                id: 'local-user',
                name: 'Directory Local User',
                avatarUrl: 'https://example.com/directory-local.png',
                markdown: 'This duplicate should be ignored',
                readOnly: true,
                source: {
                  provider: 'github',
                },
              },
              {
                id: 'github-user',
                name: 'github-user',
                avatarUrl: 'https://example.com/avatar.png',
                markdown: 'This user is synced from GitHub',
                readOnly: true,
                source: {
                  provider: 'github',
                  url: 'https://github.com/github-user',
                },
              },
            ],
            teams: [],
          },
        })
      );

      const users = await getUsers();

      expect(users).toEqual([
        {
          id: 'local-user',
          name: 'Local User',
          markdown: 'This is a local user',
          avatarUrl: 'https://example.com/local.png',
        },
        {
          id: 'github-user',
          name: 'github-user',
          avatarUrl: 'https://example.com/avatar.png',
          markdown: 'This user is synced from GitHub',
          readOnly: true,
          source: {
            provider: 'github',
            url: 'https://github.com/github-user',
          },
        },
      ]);
    });
  });

  describe('writeUser', () => {
    it('writes the given user to EventCatalog and assumes the path if one if not given', async () => {
      await writeUser({
        id: 'eventcatalog-core-user',
        name: 'Eventcatalog Core User',
        markdown: 'This is the core user for Eventcatalog',
        avatarUrl: 'https://pbs.twimg.com/profile_images/1262283153563140096/DYRDqKg6_400x400.png',
      });

      const user = await getUser('eventcatalog-core-user');

      expect(fs.existsSync(path.join(CATALOG_PATH, 'users', 'eventcatalog-core-user.mdx'))).toBe(true);

      expect(user).toEqual({
        id: 'eventcatalog-core-user',
        name: 'Eventcatalog Core User',
        markdown: 'This is the core user for Eventcatalog',
        avatarUrl: 'https://pbs.twimg.com/profile_images/1262283153563140096/DYRDqKg6_400x400.png',
      });
    });

    it('throws an error when trying to write a user that already exists', async () => {
      await writeUser({
        id: 'eventcatalog-core-user',
        name: 'Eventcatalog Core User',
        markdown: 'This is the core user for Eventcatalog',
        avatarUrl: 'https://pbs.twimg.com/profile_images/1262283153563140096/DYRDqKg6_400x400.png',
      });

      await expect(
        writeUser({
          id: 'eventcatalog-core-user',
          name: 'Eventcatalog Core User',
          markdown: 'This is the core user for Eventcatalog',
          avatarUrl: 'https://pbs.twimg.com/profile_images/1262283153563140096/DYRDqKg6_400x400.png',
        })
      ).rejects.toThrowError('Failed to write eventcatalog-core-user (user) as it already exists');
    });

    it('overrides the user when trying to write an user that already exists and override is true', async () => {
      await writeUser({
        id: 'eventcatalog-core-user',
        name: 'Eventcatalog Core User',
        markdown: 'This is the core user for Eventcatalog',
        avatarUrl: 'https://pbs.twimg.com/profile_images/1262283153563140096/DYRDqKg6_400x400.png',
      });

      await writeUser(
        {
          id: 'eventcatalog-core-user',
          name: 'Eventcatalog Core User Overridden',
          markdown: 'This is the core user for Eventcatalog',
          avatarUrl: 'https://pbs.twimg.com/profile_images/1262283153563140096/DYRDqKg6_400x400.png',
        },
        { override: true }
      );

      const user = await getUser('eventcatalog-core-user');

      expect(fs.existsSync(path.join(CATALOG_PATH, 'users', 'eventcatalog-core-user.mdx'))).toBe(true);
      expect(user?.name).toBe('Eventcatalog Core User Overridden');
    });
  });

  describe('rmUserById', () => {
    it('removes a user from eventcatalog by id', async () => {
      await writeUser({
        id: 'eventcatalog-core-user',
        name: 'Eventcatalog Core User',
        markdown: 'This is the core user for Eventcatalog',
        avatarUrl: 'https://pbs.twimg.com/profile_images/1262283153563140096/DYRDqKg6_400x400.png',
      });

      expect(fs.existsSync(path.join(CATALOG_PATH, 'users', 'eventcatalog-core-user.mdx'))).toBe(true);

      await rmUserById('eventcatalog-core-user');

      expect(fs.existsSync(path.join(CATALOG_PATH, 'users', 'eventcatalog-core-user.mdx'))).toBe(false);
    });
  });
});
