import { describe, beforeAll, afterAll, it, expect, test } from 'vitest';
import path from 'node:path';
import fs from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import { watch } from '../watcher';

type Events = Array<{ path: string; type: 'create' | 'update' | 'delete' }>;

const PROJECT_DIR = path.join(__dirname, 'tmp-watcher', randomUUID());
const EC_CORE_DIR = path.join(PROJECT_DIR, '.eventcatalog-core');

describe('Watcher', () => {
  let watcherSubscription: () => Promise<void>;

  let callbacks: Array<{ resolve: (val: Events) => void; reject: (reason?: any) => void }> = [];

  const waitWatcher = () => {
    return new Promise((resolve, reject) => {
      callbacks.push({ resolve, reject });
    });
  };

  const callbackFn = (err: Error | null, events: Events) => {
    setImmediate(() => {
      for (let { resolve, reject } of callbacks) {
        if (err) reject(err);
        else resolve(events);
      }

      callbacks = [];
    });
  };

  beforeAll(async () => {
    await prepareProjectDir(PROJECT_DIR, EC_CORE_DIR);
    watcherSubscription = await watch(PROJECT_DIR, EC_CORE_DIR, callbackFn);
  });

  afterAll(async () => {
    await watcherSubscription?.();
    await fs.rm(PROJECT_DIR, { recursive: true });
  });

  describe('Commands', () => {
    describe('/commands directory', () => {
      // TODO: handle create event in watcher
      test.skip('when a command is created, it adds it to the correct location in astro', async () => {
        const filePath = path.join('commands/FakeCommand/index.md');

        fs.writeFile(path.join(PROJECT_DIR, filePath), 'FAKE COMMAND TESTING');
        await waitWatcher();

        await expect(
          fs.readFile(path.join(EC_CORE_DIR, 'src/content/', path.dirname(filePath), 'index.mdx'), 'utf8')
        ).resolves.toEqual('FAKE COMMAND TESTING');
      });

      test('when a command is updated, it updates the corresponding command in astro', async () => {
        const filePath = path.join('commands/AddInventory/index.md');
        const fileProjectDir = path.join(PROJECT_DIR, filePath);

        fs.appendFile(fileProjectDir, 'UPDATE TEST');
        await waitWatcher();

        const contentProjectDir = await fs.readFile(fileProjectDir, 'utf-8');
        await expect(
          fs.readFile(path.join(EC_CORE_DIR, 'src/content/', path.dirname(filePath), 'index.mdx'), 'utf-8')
        ).resolves.toEqual(contentProjectDir);
      });

      // TODO: Verify what happens if /domains is deleted.
      test('when a command is deleted, it deletes the corresponding command from astro', async () => {
        const filePath = path.join('commands/AddInventory/index.md');

        // Arrange
        // The Watcher needs the file to be in the astro directory to not throws an error.
        // Could the Watcher warn instead of throwing an error?
        fs.appendFile(path.join(PROJECT_DIR, filePath), 'DELETE_TEST');
        await waitWatcher();

        // Act
        fs.rm(path.join(PROJECT_DIR, filePath));
        await waitWatcher();

        // Assert
        await expect(
          fs.readFile(path.join(EC_CORE_DIR, 'src/content/', path.dirname(filePath), 'index.mdx'), 'utf-8')
        ).rejects.toThrow(/ENOENT: no such file or directory/);
      });

      test.skip('when a versioned command is created, it adds it to the correct location in astro', async () => {
        const filePath = path.join('commands/FakeCommand/versioned/0.0.1/index.md');

        fs.writeFile(path.join(PROJECT_DIR, filePath), 'FAKE COMMAND TESTING');
        await waitWatcher();

        await expect(
          fs.readFile(path.join(EC_CORE_DIR, 'src/content/', path.dirname(filePath), 'index.mdx'), 'utf8')
        ).resolves.toEqual('FAKE COMMAND TESTING');
      });

      test('when a versioned command is updated, it updates the corresponding command in astro', async () => {
        const filePath = path.join('commands/AddInventory/versioned/0.0.1/index.md');
        const fileProjectDir = path.join(PROJECT_DIR, filePath);

        fs.appendFile(fileProjectDir, 'UPDATE TEST');
        await waitWatcher();

        const contentProjectDir = await fs.readFile(fileProjectDir, 'utf-8');
        await expect(
          fs.readFile(path.join(EC_CORE_DIR, 'src/content/', path.dirname(filePath), 'index.mdx'), 'utf-8')
        ).resolves.toEqual(contentProjectDir);
      });

      test('when a versioned command is deleted, it deletes the corresponding command from astro', async () => {
        const filePath = path.join('commands/AddInventory/versioned/0.0.1/index.md');

        // Arrange
        // The Watcher needs the file to be in the astro directory to not throws an error.
        // Could the Watcher warn instead of throwing an error?
        fs.appendFile(path.join(PROJECT_DIR, filePath), 'DELETE_TEST');
        await waitWatcher();

        // Act
        fs.rm(path.join(PROJECT_DIR, filePath));
        await waitWatcher();

        // Assert
        await expect(
          fs.readFile(path.join(EC_CORE_DIR, 'src/content/', path.dirname(filePath), 'index.mdx'), 'utf-8')
        ).rejects.toThrow(/ENOENT: no such file or directory/);
      });
    });
  });

  describe('Domains', () => {
    describe('/domains directory', () => {
      // TODO: handle create event in watcher
      test.skip('when a domain is created, it adds to the correct location in astro', async () => {
        const filePath = path.join('domains/FakeDomain/index.md');

        fs.writeFile(path.join(PROJECT_DIR, filePath), 'FAKE DOMAIN TESTING');
        await waitWatcher();

        await expect(
          fs.readFile(path.join(EC_CORE_DIR, 'src/content/', path.dirname(filePath), 'index.mdx'), 'utf8')
        ).resolves.toEqual('FAKE DOMAIN TESTING');
      });

      test('when a domain is updated, it updates the corresponding domain in astro', async () => {
        const filePath = path.join('domains/Payment/index.md');
        const fileProjectDir = path.join(PROJECT_DIR, filePath);

        fs.appendFile(fileProjectDir, 'UPDATE TEST');
        await waitWatcher();

        const contentProjectDir = await fs.readFile(fileProjectDir, 'utf-8');
        await expect(
          fs.readFile(path.join(EC_CORE_DIR, 'src/content/', path.dirname(filePath), 'index.mdx'), 'utf-8')
        ).resolves.toEqual(contentProjectDir);
      });

      // TODO: Verify what happens if /domains is deleted.
      test('when a domain is deleted, it deletes the corresponding domain from astro', async () => {
        const filePath = path.join('domains/Payment/index.md');

        // Arrange
        // The Watcher needs the file to be in the astro directory to not throws an error.
        // Could the Watcher warn instead of throwing an error?
        fs.appendFile(path.join(PROJECT_DIR, filePath), 'DELETE_TEST');
        await waitWatcher();

        // Act
        fs.rm(path.join(PROJECT_DIR, filePath));
        await waitWatcher();

        // Assert
        await expect(
          fs.readFile(path.join(EC_CORE_DIR, 'src/content/', path.dirname(filePath), 'index.mdx'), 'utf-8')
        ).rejects.toThrow(/ENOENT: no such file or directory/);
      });

      test.skip('when a versioned domain is created, it adds to the correct location in astro', async () => {
        const filePath = path.join('domains/FakeDomain/versioned/0.0.1/index.md');

        fs.writeFile(path.join(PROJECT_DIR, filePath), 'FAKE DOMAIN TESTING');
        await waitWatcher();

        await expect(
          fs.readFile(path.join(EC_CORE_DIR, 'src/content/', path.dirname(filePath), 'index.mdx'), 'utf8')
        ).resolves.toEqual('FAKE DOMAIN TESTING');
      });

      test('when a versioned domain is updated, it updates the corresponding domain in astro', async () => {
        const filePath = path.join('domains/Payment/versioned/0.0.1/index.md');
        const fileProjectDir = path.join(PROJECT_DIR, filePath);

        fs.appendFile(fileProjectDir, 'UPDATE TEST');
        await waitWatcher();

        const contentProjectDir = await fs.readFile(fileProjectDir, 'utf-8');
        await expect(
          fs.readFile(path.join(EC_CORE_DIR, 'src/content/', path.dirname(filePath), 'index.mdx'), 'utf-8')
        ).resolves.toEqual(contentProjectDir);
      });

      test('when a versioned domain is deleted, it deletes the corresponding domain in astro', async () => {
        const filePath = path.join('domains/Payment/versioned/0.0.1/index.md');

        // Arrange
        // The Watcher needs the file to be in the astro directory to not throws an error.
        // Could the Watcher warn instead of throwing an error?
        fs.appendFile(path.join(PROJECT_DIR, filePath), 'DELETE_TEST');
        await waitWatcher();

        // Act
        fs.rm(path.join(PROJECT_DIR, filePath));
        await waitWatcher();

        // Assert
        await expect(
          fs.readFile(path.join(EC_CORE_DIR, 'src/content/', path.dirname(filePath), 'index.mdx'), 'utf-8')
        ).rejects.toThrow(/ENOENT: no such file or directory/);
      });
    });
  });

  describe('Events', () => {
    describe('/events directory', () => {
      // TODO: handle create event in watcher
      test.skip('when an event is created, it adds it to the correct location in astro', async () => {
        const filePath = path.join('events/FakeEvent/index.md');

        fs.writeFile(path.join(PROJECT_DIR, filePath), 'FAKE EVENT TESTING');
        await waitWatcher();

        await expect(
          fs.readFile(path.join(EC_CORE_DIR, 'src/content', path.dirname(filePath), 'index.mdx'), 'utf8')
        ).resolves.toEqual('FAKE EVENT TESTING');
      });

      test('when an event is updated, it updates the corresponding event in astro', async () => {
        const filePath = path.join('events/Order/OrderCancelled/index.md');
        const fileProjectDir = path.join(PROJECT_DIR, filePath);

        fs.appendFile(fileProjectDir, 'UPDATE TEST');
        await waitWatcher();

        const contentProjectDir = await fs.readFile(fileProjectDir, 'utf-8');
        await expect(
          fs.readFile(path.join(EC_CORE_DIR, 'src/content/', path.dirname(filePath), 'index.mdx'), 'utf-8')
        ).resolves.toEqual(contentProjectDir);
      });

      // TODO: Verify what happens if /events is deleted.
      test('when an event is deleted, it deletes the corresponding event from astro', async () => {
        const filePath = path.join('events/Order/OrderCancelled/index.md');

        // Arrange
        // The Watcher needs the file to be in the astro directory to not throws an error.
        // Could the Watcher warn instead of throwing an error?
        fs.appendFile(path.join(PROJECT_DIR, filePath), 'DELETE_TEST');
        await waitWatcher();

        // Act
        fs.rm(path.join(PROJECT_DIR, filePath));
        await waitWatcher();

        // Assert
        await expect(
          fs.readFile(path.join(EC_CORE_DIR, 'src/content', path.dirname(filePath), 'index.mdx'), 'utf-8')
        ).rejects.toThrow(/ENOENT: no such file or directory/);
      });

      // TODO: handle create event in watcher
      test.skip('when a versioned event is created, it adds it to the correct location in astro', async () => {
        const filePath = path.join('events/FakeEvent/versioned/0.0.1/index.md');

        fs.writeFile(path.join(PROJECT_DIR, filePath), 'FAKE EVENT TESTING');
        await waitWatcher();

        await expect(
          fs.readFile(path.join(EC_CORE_DIR, 'src/content/', path.dirname(filePath), 'index.mdx'), 'utf8')
        ).resolves.toEqual('FAKE EVENT TESTING');
      });

      test('when a versioned event is updated, it updates the corresponding event in astro', async () => {
        const filePath = path.join('events/Inventory/InventoryAdjusted/versioned/0.0.1/index.md');
        const fileProjectDir = path.join(PROJECT_DIR, filePath);

        fs.appendFile(fileProjectDir, 'UPDATE TEST');
        await waitWatcher();

        const contentProjectDir = await fs.readFile(fileProjectDir, 'utf-8');
        await expect(
          fs.readFile(path.join(EC_CORE_DIR, 'src/content/', path.dirname(filePath), 'index.mdx'), 'utf-8')
        ).resolves.toEqual(contentProjectDir);
      });

      test('when a versioned event is deleted, it deletes the corresponding event from astro', async () => {
        const filePath = path.join('events/Inventory/InventoryAdjusted/versioned/0.0.1/index.md');

        // Arrange
        // The Watcher needs the file to be in the astro directory to not throws an error.
        // Could the Watcher warn instead of throwing an error?
        fs.appendFile(path.join(PROJECT_DIR, filePath), 'DELETE_TEST');
        await waitWatcher();

        // Act
        fs.rm(path.join(PROJECT_DIR, filePath));
        await waitWatcher();

        // Assert
        await expect(
          fs.readFile(path.join(EC_CORE_DIR, 'src/content', path.dirname(filePath), 'index.mdx'), 'utf-8')
        ).rejects.toThrow(/ENOENT: no such file or directory/);
      });
    });
  });

  describe('Services', () => {
    describe('/services directory', () => {
      // TODO: handle create event in watcher
      test.skip('when a service is created, it adds it to the correct location in astro', async () => {
        const filePath = path.join('services/FakeService/index.md');

        fs.writeFile(path.join(PROJECT_DIR), 'FAKE SERVICE TESTING');
        await waitWatcher();

        await expect(
          fs.readFile(path.join(EC_CORE_DIR, 'src/content', path.dirname(filePath), 'index.mdx'), 'utf8')
        ).resolves.toEqual('FAKE SERVICE TESTING');
      });

      test('when a service is updated, it updates the corresponding service in astro', async () => {
        const filePath = path.join('services/PaymentService/index.md');
        const fileProjectDir = path.join(PROJECT_DIR, filePath);

        fs.appendFile(fileProjectDir, 'UPDATE TEST');
        await waitWatcher();

        const contentProjectDir = await fs.readFile(fileProjectDir, 'utf-8');
        await expect(
          fs.readFile(path.join(EC_CORE_DIR, 'src/content', path.dirname(filePath), 'index.mdx'), 'utf-8')
        ).resolves.toEqual(contentProjectDir);
      });

      // TODO: Verify what happens if /services is deleted.
      test('when a service is deleted, it deletes the corresponding service from astro', async () => {
        const filePath = path.join('services/PaymentService/index.md');

        // Arrange
        // The Watcher needs the file to be in the astro directory to not throws an error.
        // Could the Watcher warn instead of throwing an error?
        fs.appendFile(path.join(PROJECT_DIR, filePath), 'DELETE_TEST');
        await waitWatcher();

        // Act
        fs.rm(path.join(PROJECT_DIR, filePath));
        await waitWatcher();

        // Assert
        await expect(
          fs.readFile(path.join(EC_CORE_DIR, 'src/content', path.dirname(filePath), 'index.mdx'), 'utf-8')
        ).rejects.toThrow(/ENOENT: no such file or directory/);
      });

      test.skip('when a versioned service is created, it adds to the correct location in astro', async () => {
        const filePath = path.join('services/FakeService/versioned/0.0.1/index.md');

        fs.writeFile(path.join(PROJECT_DIR), 'FAKE SERVICE TESTING');
        await waitWatcher();

        await expect(
          fs.readFile(path.join(EC_CORE_DIR, 'src/content', path.dirname(filePath), 'index.mdx'), 'utf8')
        ).resolves.toEqual('FAKE SERVICE TESTING');
      });

      test('when a versioned service is updated, it updates the corresponding service in astro', async () => {
        const filePath = path.join('services/PaymentService/versioned/0.0.1/index.md');
        const fileProjectDir = path.join(PROJECT_DIR, filePath);

        fs.appendFile(fileProjectDir, 'UPDATE TEST');
        await waitWatcher();

        const contentProjectDir = await fs.readFile(fileProjectDir, 'utf-8');
        await expect(
          fs.readFile(path.join(EC_CORE_DIR, 'src/content', path.dirname(filePath), 'index.mdx'), 'utf-8')
        ).resolves.toEqual(contentProjectDir);
      });

      test('when a versioned service is deleted, it deletes the corresponding service from astro', async () => {
        const filePath = path.join('services/PaymentService/versioned/0.0.1/index.md');

        // Arrange
        // The Watcher needs the file to be in the astro directory to not throws an error.
        // Could the Watcher warn instead of throwing an error?
        fs.appendFile(path.join(PROJECT_DIR, filePath), 'DELETE_TEST');
        await waitWatcher();

        // Act
        fs.rm(path.join(PROJECT_DIR, filePath));
        await waitWatcher();

        // Assert
        await expect(
          fs.readFile(path.join(EC_CORE_DIR, 'src/content', path.dirname(filePath), 'index.mdx'), 'utf-8')
        ).rejects.toThrow(/ENOENT: no such file or directory/);
      });
    });
  });

  describe('Teams', () => {
    // TODO: handle create event in watcher
    test.skip('when a team is created, it adds it to the correct location in astro', async () => {
      const filePath = path.join('teams/ec.md');

      fs.writeFile(path.join(PROJECT_DIR, filePath), 'testing');
      await waitWatcher();

      await expect(fs.readFile(path.join(EC_CORE_DIR, 'src/content/', filePath), 'utf8')).resolves.toEqual('testing');
    });

    test('when a team is updated, it updates the corresponding team in astro', async () => {
      const filePath = path.join('teams/full-stack.md');
      const teamProjectDir = path.join(PROJECT_DIR, filePath);

      fs.appendFile(teamProjectDir, 'test');
      await waitWatcher();

      const teamContentProjectDir = await fs.readFile(teamProjectDir, 'utf-8');
      await expect(fs.readFile(path.join(EC_CORE_DIR, 'src/content/', filePath), 'utf-8')).resolves.toEqual(
        teamContentProjectDir
      );
    });

    // TODO: Verify what happens if /teams is deleted.
    test('when a team is deleted, it deletes the corresponding team from astro', async () => {
      const filePath = path.join('teams/full-stack.md');

      // Arrange
      // The Watcher needs the file to be in the astro directory to not throws an error.
      // Could the Watcher warn instead of throwing an error?
      fs.appendFile(path.join(PROJECT_DIR, filePath), 'DELETE_TEST');
      await waitWatcher();

      // Act
      fs.rm(path.join(PROJECT_DIR, filePath));
      await waitWatcher();

      // Assert
      await expect(fs.readFile(path.join(EC_CORE_DIR, 'src/content/', filePath), 'utf-8')).rejects.toThrow(
        /ENOENT: no such file or directory/
      );
    });
  });

  describe('Users', () => {
    // TODO: handle create event in watcher
    test.skip('when an user is created, it adds it to the correct location in astro', async () => {
      const filePath = path.join('users/test.md');

      fs.writeFile(path.join(PROJECT_DIR, filePath), 'testing');
      await waitWatcher();

      await expect(fs.readFile(path.join(EC_CORE_DIR, 'src/content/', filePath), 'utf8')).resolves.toEqual('testing');
    });

    test('when an user is updated, it updates the corresponding user in astro', async () => {
      const filePath = path.join('users/dboyne.md');
      const userFileInProjectDir = path.join(PROJECT_DIR, filePath);

      fs.appendFile(userFileInProjectDir, 'test');
      await waitWatcher();

      const userFileContentInProjectDir = await fs.readFile(userFileInProjectDir, { encoding: 'utf-8' });
      await expect(fs.readFile(path.join(EC_CORE_DIR, 'src/content/', filePath), 'utf-8')).resolves.toEqual(
        userFileContentInProjectDir
      );
    });

    // TODO: Verify what happens if /users is deleted.
    test('when an user is deleted, it deletes the corresponding user from astro', async () => {
      const filePath = path.join('users/dboyne.md');

      // Arrange
      // The Watcher needs the file to be in the astro directory to not throws an error.
      // Could the Watcher warn instead of throwing an error?
      fs.appendFile(path.join(PROJECT_DIR, filePath), 'DELETE TEST');
      await waitWatcher();

      // Act
      fs.rm(path.join(PROJECT_DIR, filePath));
      await waitWatcher();

      // Assert
      await expect(fs.readFile(path.join(EC_CORE_DIR, 'src/content/', filePath))).rejects.toThrow(
        /ENOENT: no such file or directory/
      );
    });
  });

  describe('Changelogs', () => {
    test.todo('when a changelog is created, it adds it to the correct location in astro');

    test('when a changelog is updated, it updates the corresponding changelog in astro', async () => {
      const filePath = path.join('events/Inventory/InventoryAdjusted/changelog.md');

      fs.appendFile(path.join(PROJECT_DIR, filePath), 'UPDATE TEST');
      await waitWatcher();

      const changelogContent = await fs.readFile(path.join(PROJECT_DIR, filePath), 'utf-8');
      await expect(
        fs.readFile(path.join(EC_CORE_DIR, 'src/content/changelogs', path.dirname(filePath), 'changelog.mdx'), 'utf-8')
      ).resolves.toEqual(changelogContent);
    });

    test('when a changelog is deleted, it deletes the corresponding changelog from astro', async () => {
      const filePath = path.join('events/Inventory/InventoryAdjusted/changelog.md');

      // The Watcher needs the file to be in the astro directory to not throws an error.
      // Could the Watcher warn instead of throwing an error?
      fs.appendFile(path.join(PROJECT_DIR, filePath), 'DELETE_TEST');
      await waitWatcher();

      fs.rm(path.join(PROJECT_DIR, filePath));
      await waitWatcher();

      await expect(
        fs.readFile(path.join(EC_CORE_DIR, 'src/content/changelogs', path.dirname(filePath), 'changelog.mdx'), 'utf-8')
      ).rejects.toThrowError(/ENOENT: no such file or directory/);
    });

    test.todo('when a versioned changelog is created, it adds to the correct location in astro');

    test('when a versiond changelog is updated, it updates the corresponding changelog in astro', async () => {
      const filePath = path.join('events/Inventory/InventoryAdjusted/versioned/0.0.1/changelog.md');

      // Act
      fs.appendFile(path.join(PROJECT_DIR, filePath), 'UPDATE TEST');
      await waitWatcher();

      // Assert
      const changelogContent = await fs.readFile(path.join(PROJECT_DIR, filePath), 'utf-8');
      await expect(
        fs.readFile(path.join(EC_CORE_DIR, 'src/content/changelogs', path.dirname(filePath), 'changelog.mdx'), 'utf-8')
      ).resolves.toEqual(changelogContent);
    });

    test('when a versiond changelog is deleted, it deletes the corresponding changelog from astro', async () => {
      const filePath = path.join('events/Inventory/InventoryAdjusted/versioned/0.0.1/changelog.md');

      // Arrange
      // The Watcher needs the file to be in the astro directory to not throws an error.
      // Could the Watcher warn instead of throwing an error?
      fs.appendFile(path.join(PROJECT_DIR, filePath), 'DELETE_TEST');
      await waitWatcher();

      // Act
      fs.rm(path.join(PROJECT_DIR, filePath));
      await waitWatcher();

      // Assert
      await expect(
        fs.readFile(path.join(EC_CORE_DIR, 'src/content/changelogs', path.dirname(filePath), 'changelog.mdx'), 'utf-8')
      ).rejects.toThrowError(/ENOENT: no such file or directory/);
    });
  });

  describe('Flows', () => {
    // TODO: handle the create event in the watcher
    test.todo('when a flow is created, it adds it to the correct location in astro');

    test('when a flow is updated, it updates the corresponding flow in astro', async () => {
      const filePath = path.join('flows/Payment/PaymentProcessed/index.md');

      fs.appendFile(path.join(PROJECT_DIR, filePath), 'update_test');
      await waitWatcher();

      const fileContent = await fs.readFile(path.join(PROJECT_DIR, filePath), 'utf-8');
      await expect(
        fs.readFile(path.join(EC_CORE_DIR, 'src/content', path.dirname(filePath), 'index.mdx'), 'utf-8')
      ).resolves.toEqual(fileContent);
    });

    test('when a flow is deleted, it deletes the corresponding flow from astro', async () => {
      const filePath = path.join('flows/Payment/PaymentProcessed/index.md');

      // The Watcher needs the file to be in the astro directory to not throws an error.
      // Could the Watcher warn instead of throwing an error?
      fs.appendFile(path.join(PROJECT_DIR, filePath), 'delete_test');
      await waitWatcher();

      fs.rm(path.join(PROJECT_DIR, filePath));
      await waitWatcher();

      await expect(
        fs.readFile(path.join(EC_CORE_DIR, 'src/content', path.dirname(filePath), 'index.mdx'), 'utf-8')
      ).rejects.toThrowError(/ENOENT: no such file or directory/);
    });

    test.todo('when a versioned flow is created, it adds it to the correct location in astro');

    test('when a versioned flow is updated, it updates the corresponding flow in astro', async () => {
      const filePath = path.join('flows/Payment/PaymentProcessed/versioned/0.0.1/index.md');

      // Act
      fs.appendFile(path.join(PROJECT_DIR, filePath), 'update_test');
      await waitWatcher();

      // Assert
      const fileContent = await fs.readFile(path.join(PROJECT_DIR, filePath), 'utf-8');
      await expect(
        fs.readFile(path.join(EC_CORE_DIR, 'src/content', path.dirname(filePath), 'index.mdx'), 'utf-8')
      ).resolves.toEqual(fileContent);
    });

    test('when a versioned flow is deleted, it deletes the corresponding flow from astro', async () => {
      const filePath = path.join('flows/Payment/PaymentProcessed/versioned/0.0.1/index.md');

      // Arrange
      // The Watcher needs the file to be in the astro directory to not throws an error.
      // Could the Watcher warn instead of throwing an error?
      fs.appendFile(path.join(PROJECT_DIR, filePath), 'delete_test');
      await waitWatcher();

      // Act
      fs.rm(path.join(PROJECT_DIR, filePath));
      await waitWatcher();

      // Assert
      await expect(
        fs.readFile(path.join(EC_CORE_DIR, 'src/content', path.dirname(filePath), 'index.mdx'), 'utf-8')
      ).rejects.toThrowError(/ENOENT: no such file or directory/);
    });
  });

  describe('Pages', () => {
    // TODO: handle create events in the watcher
    test.todo('when a page is created, it adds it to the correct location in astro');

    test('when a page is udpated, it updates the corresponding page in astro', async () => {
      const filePath = path.join('pages/index.md');

      fs.appendFile(path.join(PROJECT_DIR, filePath), 'update_test');
      await waitWatcher();

      await expect(
        fs.readFile(path.join(EC_CORE_DIR, 'src/content', path.dirname(filePath), 'index.mdx'), 'utf-8')
      ).resolves.toMatch(/update_test$/);
    });

    test('when a page is deleted, it deletes the corresponding page from astro', async () => {
      const filePath = path.join('pages/index.md');

      // The Watcher needs the file to be in the astro directory to not throws an error.
      // Could the Watcher warn instead of throwing an error?
      fs.appendFile(path.join(PROJECT_DIR, filePath), 'delete_test');
      await waitWatcher();

      fs.rm(path.join(PROJECT_DIR, filePath));
      await waitWatcher();

      await expect(
        fs.readFile(path.join(EC_CORE_DIR, 'src/content', path.dirname(filePath), 'index.mdx'), 'utf-8')
      ).rejects.toThrowError(/ENOENT: no such file or directory/);
    });
  });

  describe('Custom components', () => {
    // TODO: handle create events in the watcher
    test.todo('when a custom component is created, it adds it to the correct location in astro');

    test('when a custom component is updated, it updates the corresponding custom component in astro', async () => {
      const filePath = path.join('components/footer.astro');

      fs.appendFile(path.join(PROJECT_DIR, filePath), '<p>Hello from EC Testing</p>');
      await waitWatcher();

      await expect(fs.readFile(path.join(EC_CORE_DIR, 'src/custom-defined-components/footer.astro'), 'utf-8')).resolves.toMatch(
        /<p>Hello from EC Testing<\/p>$/
      );
    });

    test('when a custom component is deleted, it deletes the corresponding custom component from astro', async () => {
      const filePath = path.join('components/footer.astro');

      // The Watcher needs the file to be in the astro directory to not throws an error.
      // Could the Watcher warn instead of throwing an error?
      fs.appendFile(path.join(PROJECT_DIR, filePath), '<p>Hello from EC Testing</p>');
      await waitWatcher();

      fs.rm(path.join(PROJECT_DIR, filePath));
      await waitWatcher();

      await expect(
        fs.readFile(path.join(EC_CORE_DIR, 'src/custom-defined-components/footer.astro'), 'utf-8')
      ).rejects.toThrowError(/ENOENT: no such file or directory/);
    });
  });

  // TODO: handle public assets in the Watcher
  describe.skip('Public assets', () => {
    it('should reflect the creation of public assets to astroDir', async () => {
      const logoSvg = `
      <?xml version="1.0" standalone="no"?>
      <!DOCTYPE svg PUBLIC "-//W3C//DTD SVG 20010904//EN"
      "http://www.w3.org/TR/2001/REC-SVG-20010904/DTD/svg10.dtd">
      <svg 
        version="1.0" 
        xmlns="http://www.w3.org/2000/svg"
        width="48.000000pt" 
        height="48.000000pt" 
        viewBox="0 0 48.000000 48.000000"
        preserveAspectRatio="xMidYMid meet"
      >
        <g 
          transform="translate(0.000000,48.000000) scale(0.100000,-0.100000)"
          fill="#000000" 
          stroke="none"
        >
          <path d="M0 240 l0 -240 240 0 240 0 0 240 0 240 -240 0 -240 0 0 -240z m299
            27 c4 1 7 -7 7 -18 0 -10 -1 -19 -2 -19 -10 0 -130 135 -132 148 -1 9 25 -12
            59 -48 34 -36 65 -64 68 -63z m151 -45 c0 -16 -120 -122 -138 -122 -4 0 -25
            -16 -47 -35 -65 -57 -68 -56 -157 31 -90 90 -105 111 -89 127 8 8 33 -10 90
            -67 l80 -79 49 31 c27 18 56 32 66 32 9 0 28 12 42 27 26 28 84 72 97 73 4 0
            7 -8 7 -18z"/>
        </g>
      </svg>
      `;

      fs.writeFile(path.join(PROJECT_DIR, 'public/logo.svg'), logoSvg);
      await waitWatcher();

      await expect(fs.readFile(path.join(EC_CORE_DIR, 'public/logo.svg'), 'utf-8')).resolves.toEqual(logoSvg);
    });

    it('should reflect the update of public assets to astroDir', async () => {
      const filePath = path.join('public/logo.svg');

      const content = await fs.readFile(path.join(PROJECT_DIR, filePath), 'utf-8');

      fs.writeFile(path.join(PROJECT_DIR, filePath), content);
      await waitWatcher();

      await expect(fs.readFile(path.join(EC_CORE_DIR, filePath), 'utf-8')).resolves.toEqual(content);
    });

    it('should reflect the deletion of public assets to astroDir', async () => {
      const filePath = path.join('public/logo.svg');

      fs.rm(path.join(PROJECT_DIR, filePath));
      await waitWatcher();

      await expect(fs.readFile(path.join(EC_CORE_DIR, filePath), 'utf-8')).rejects.toThrowError(
        /ENOENT: no such file or directory/
      );
    });
  });

  // TODO: handle config files in the Watcher. Now, Watcher only observes files
  // in one of the following directories: 'domains', 'commands', 'events',
  // 'services', 'teams', 'users', 'pages', 'components' and 'flows'
  describe.skip('Config file', () => {
    it('should reflect the update of the config file to astroDir', async () => {
      const filePath = path.join('eventcatalog.config.js');

      fs.writeFile(path.join(PROJECT_DIR, filePath), 'export default {}');
      await waitWatcher();

      await expect(fs.readFile(path.join(EC_CORE_DIR, filePath), 'utf-8')).resolves.toBe('export default {}');
    });

    // Could the config file be deleted?
    it.todo('should reflect the deletion of the config file to astroDir');
  });

  // TODO: handle config files in the Watcher. Now, Watcher only observes files
  // in one of the following directories: 'domains', 'commands', 'events',
  // 'services', 'teams', 'users', 'pages', 'components' and 'flows'
  describe.todo('Custom css');
});

async function prepareProjectDir(projectDir: string, ecCoreDir: string) {
  await fs.mkdir(projectDir, { recursive: true });

  const sampleCatalog = path.join(__dirname, 'example-catalog');
  await fs.cp(sampleCatalog, projectDir, { recursive: true });

  await fs.mkdir(ecCoreDir, { recursive: true });
}
