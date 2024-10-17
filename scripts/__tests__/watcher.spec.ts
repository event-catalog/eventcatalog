import { randomUUID } from 'node:crypto';
import { existsSync } from 'node:fs';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { watch } from '../watcher';

describe('Watcher', { retry: 5 }, () => {
  let watcherUnsubscribe: () => Promise<void>;
  let PROJECT_DIR: string;
  let EC_CORE_DIR: string;

  const assetsCatalogDirs = ['public/generated/', 'src/catalog-files/'];
  const assets = [
    {
      filename: 'asyncapi.yml',
      content: 'asyncapi: 3.0.0\n info:\n  title: AsyncApi',
      updatedContent: 'asyncapi: 3.0.0\n info:\n  title: FakeAsyncApi',
    },
    {
      filename: 'schema.json',
      content: '{\n "$schema": "http://json-schema.org/draft-07/schema#",\n "title": "Schema",\n "type": "object"\n}',
      updatedContent: '{\n "$schema": "http://json-schema.org/draft-07/schema#",\n "title": "FakeSchema",\n "type": "object"\n}',
    },
    {
      filename: 'schema.avro',
      content: '{\n"type" : "record",\n "namespace" : "Tutorialspoint",\n "name" : "Employee"\n}',
      updatedContent: '{\n"type" : "record",\n "namespace" : "Tutorialspoint",\n "name" : "FakeEmployee"\n}',
    },
  ];

  beforeEach(async () => {
    PROJECT_DIR = path.join(__dirname, 'tmp-watcher', randomUUID());
    EC_CORE_DIR = path.join(PROJECT_DIR, '.eventcatalog-core');

    await prepareProjectDir(PROJECT_DIR, EC_CORE_DIR);
    watcherUnsubscribe = await watch(PROJECT_DIR, EC_CORE_DIR);
  });

  afterEach(async () => {
    await watcherUnsubscribe();
    await fs.rm(PROJECT_DIR, { recursive: true });
  });

  describe('Commands', () => {
    describe.each([
      { dir: '/commands' },
      { dir: '/services/FakeService/commands' },
      { dir: '/domains/FakeDomain/commands' },
      { dir: '/domains/FakeDomain/services/FakeService/commands' },
    ])('within $dir directory', ({ dir: dirPrefix }) => {
      const commandName = 'FakeCommand';

      test('when a command is created, it adds it to the correct location in astro', async () => {
        const filePath = path.join(dirPrefix, commandName, 'index.md');

        // Arrange
        await mkdir(path.dirname(path.join(PROJECT_DIR, filePath)));

        // Act
        await fs.writeFile(path.join(PROJECT_DIR, filePath), `---${os.EOL}id: FakeCommand${os.EOL}---${os.EOL}`);

        // Assert
        await vi.waitFor(() =>
          expect(
            fs.readFile(
              path.join(EC_CORE_DIR, 'src/content/commands/', path.dirname(path.relative(dirPrefix, filePath)), 'index.mdx'),
              'utf8'
            )
          ).resolves.toEqual(`---${os.EOL}id: FakeCommand${os.EOL}---${os.EOL}`)
        );
      });

      test('when a command is updated, it updates the corresponding command in astro', async () => {
        const filePath = path.join(dirPrefix, commandName, `index.md`);

        // Arrange
        await mkdir(path.dirname(path.join(PROJECT_DIR, filePath)));
        await fs.writeFile(path.join(PROJECT_DIR, filePath), `---${os.EOL}id: FakeCommand${os.EOL}---${os.EOL}`);

        // Act
        await fs.appendFile(path.join(PROJECT_DIR, filePath), 'UPDATE TEST');

        // Assert
        await vi.waitFor(() =>
          expect(
            fs.readFile(
              path.join(EC_CORE_DIR, 'src/content/commands/', path.dirname(path.relative(dirPrefix, filePath)), 'index.mdx'),
              'utf-8'
            )
          ).resolves.toContain('UPDATE TEST')
        );
      });

      test('when a command is deleted, it deletes the corresponding command from astro', async () => {
        const filePath = path.join(dirPrefix, commandName, `index.md`);

        // Arrange
        await mkdir(path.dirname(path.join(PROJECT_DIR, filePath)));
        await fs.writeFile(path.join(PROJECT_DIR, filePath), `---${os.EOL}id: FakeCommand${os.EOL}---${os.EOL}`);
        await vi.waitUntil(
          () =>
            existsSync(
              path.join(EC_CORE_DIR, 'src/content/commands/', path.dirname(path.relative(dirPrefix, filePath)), 'index.mdx')
            ),
          {
            timeout: 3000,
          }
        );

        // Act
        await fs.rm(path.join(PROJECT_DIR, filePath));

        // Assert
        await vi.waitFor(() =>
          expect(
            fs.readFile(
              path.join(EC_CORE_DIR, 'src/content/commands/', path.dirname(path.relative(dirPrefix, filePath)), 'index.mdx')
            )
          ).rejects.toThrow(/ENOENT: no such file or directory/)
        );
      });

      test.each(assets)(
        'when the asset $filename is created, it adds it to the correct location in astro',
        async ({ filename, content }) => {
          const filePath = path.join(dirPrefix, commandName, filename);

          // Arrange
          await mkdir(path.dirname(path.join(PROJECT_DIR, filePath)));

          // Act
          await fs.writeFile(path.join(PROJECT_DIR, filePath), content);

          // Assert
          await vi.waitFor(() =>
            Promise.all(
              assetsCatalogDirs.map((dir) =>
                expect(
                  fs.readFile(path.join(EC_CORE_DIR, dir, 'commands', path.relative(dirPrefix, filePath)), 'utf8')
                ).resolves.toEqual(content)
              )
            )
          );
        }
      );

      test.each(assets)(
        'when the asset $filename is updated, it updates the corresponding asset in astro',
        async ({ filename, content, updatedContent }) => {
          const filePath = path.join(dirPrefix, commandName, filename);

          // Arrange
          await mkdir(path.dirname(path.join(PROJECT_DIR, filePath)));
          await fs.writeFile(path.join(PROJECT_DIR, filePath), content);

          // Act
          await fs.writeFile(path.join(PROJECT_DIR, filePath), updatedContent);

          // Assert
          await vi.waitFor(() =>
            Promise.all(
              assetsCatalogDirs.map((dir) =>
                expect(
                  fs.readFile(path.join(EC_CORE_DIR, dir, 'commands', path.relative(dirPrefix, filePath)), 'utf-8')
                ).resolves.toEqual(updatedContent)
              )
            )
          );
        }
      );

      test.each(assets)(
        'when the asset $filename is deleted, it deletes the corresponding asset from astro',
        async ({ filename, content }) => {
          const filePath = path.join(dirPrefix, commandName, filename);

          // Arrange
          await mkdir(path.dirname(path.join(PROJECT_DIR, filePath)));
          await fs.writeFile(path.join(PROJECT_DIR, filePath), content);
          await vi.waitUntil(
            () =>
              assetsCatalogDirs
                .map((dir) => existsSync(path.join(EC_CORE_DIR, dir, 'commands', path.relative(dirPrefix, filePath))))
                .every(Boolean),
            { timeout: 3000 }
          );

          // Act
          await fs.rm(path.join(PROJECT_DIR, filePath));

          // Assert
          await vi.waitFor(() =>
            Promise.all(
              assetsCatalogDirs.map((dir) =>
                expect(fs.readFile(path.join(EC_CORE_DIR, dir, 'commands/', path.relative(dirPrefix, filePath)))).rejects.toThrow(
                  /ENOENT: no such file or directory/
                )
              )
            )
          );
        }
      );

      test('when a versioned command is created, it adds it to the correct location in astro', async () => {
        const filePath = path.join(dirPrefix, commandName, `versioned/0.0.1/index.md`);

        // Arrange
        await mkdir(path.dirname(path.join(PROJECT_DIR, filePath)));

        // Act
        await fs.writeFile(
          path.join(PROJECT_DIR, filePath),
          `---${os.EOL}id: FakeCommand${os.EOL}version: 0.0.1${os.EOL}---${os.EOL}${os.EOL}# Overview${os.EOL}${os.EOL}`
        );

        // Assert
        await vi.waitFor(() =>
          expect(
            fs.readFile(
              path.join(EC_CORE_DIR, 'src/content/commands/', path.dirname(path.relative(dirPrefix, filePath)), 'index.mdx'),
              'utf8'
            )
          ).resolves.toEqual(
            `---${os.EOL}id: FakeCommand${os.EOL}version: 0.0.1${os.EOL}---${os.EOL}${os.EOL}# Overview${os.EOL}${os.EOL}`
          )
        );
      });

      test('when a versioned command is updated, it updates the corresponding command in astro', async () => {
        const filePath = path.join(dirPrefix, commandName, `versioned/0.0.1/index.md`);

        // Arrange
        await mkdir(path.dirname(path.join(PROJECT_DIR, filePath)));
        await fs.writeFile(path.join(PROJECT_DIR, filePath), `---${os.EOL}id: FakeCommand${os.EOL}version: 0.0.1${os.EOL}---`);

        // Act
        await fs.appendFile(path.join(PROJECT_DIR, filePath), 'UPDATE TEST');

        // Assert
        await vi.waitFor(() =>
          expect(
            fs.readFile(
              path.join(EC_CORE_DIR, 'src/content/commands/', path.dirname(path.relative(dirPrefix, filePath)), 'index.mdx'),
              'utf-8'
            )
          ).resolves.toContain('UPDATE TEST')
        );
      });

      test('when a versioned command is deleted, it deletes the corresponding command from astro', async () => {
        const filePath = path.join(dirPrefix, commandName, `versioned/0.0.1/index.md`);

        // Arrange
        await mkdir(path.dirname(path.join(PROJECT_DIR, filePath)));
        await fs.writeFile(path.join(PROJECT_DIR, filePath), `---${os.EOL}id: FakeCommand${os.EOL}version: 0.0.1${os.EOL}---`);
        await vi.waitUntil(
          () =>
            existsSync(
              path.join(EC_CORE_DIR, 'src/content/commands/', path.dirname(path.relative(dirPrefix, filePath)), 'index.mdx')
            ),
          {
            timeout: 3000,
          }
        );

        // Act
        await fs.rm(path.join(PROJECT_DIR, filePath));

        // Assert
        await vi.waitFor(() =>
          expect(
            fs.readFile(
              path.join(EC_CORE_DIR, 'src/content/commands/', path.dirname(path.relative(dirPrefix, filePath)), 'index.mdx')
            )
          ).rejects.toThrow(/ENOENT: no such file or directory/)
        );
      });

      test.each(assets)(
        'when the versioned asset $filename is created, it adds it to the correct location in astro',
        async ({ filename, content }) => {
          const filePath = path.join(dirPrefix, commandName, 'versioned/0.0.1/', filename);

          // Arrange
          await mkdir(path.dirname(path.join(PROJECT_DIR, filePath)));

          // Act
          await fs.writeFile(path.join(PROJECT_DIR, filePath), content);

          // Assert
          await vi.waitFor(() =>
            Promise.all(
              assetsCatalogDirs.map((dir) =>
                expect(
                  fs.readFile(path.join(EC_CORE_DIR, dir, 'commands', path.relative(dirPrefix, filePath)), 'utf8')
                ).resolves.toEqual(content)
              )
            )
          );
        }
      );

      test.each(assets)(
        'when the versioned asset $filename is updated, it updates the corresponding asset in astro',
        async ({ filename, content, updatedContent }) => {
          const filePath = path.join(dirPrefix, commandName, 'versioned/0.0.1/', filename);

          // Arrange
          await mkdir(path.dirname(path.join(PROJECT_DIR, filePath)));
          await fs.writeFile(path.join(PROJECT_DIR, filePath), content);

          // Act
          await fs.writeFile(path.join(PROJECT_DIR, filePath), updatedContent);

          // Assert
          await vi.waitFor(() =>
            Promise.all(
              assetsCatalogDirs.map((dir) =>
                expect(
                  fs.readFile(path.join(EC_CORE_DIR, dir, 'commands', path.relative(dirPrefix, filePath)), 'utf-8')
                ).resolves.toEqual(updatedContent)
              )
            )
          );
        }
      );

      test.each(assets)(
        'when the versioned asset $filename is deleted, it deletes the corresponding asset from astro',
        async ({ filename, content }) => {
          const filePath = path.join(dirPrefix, commandName, 'versioned/0.0.1/', filename);

          // Arrange
          await mkdir(path.dirname(path.join(PROJECT_DIR, filePath)));
          await fs.writeFile(path.join(PROJECT_DIR, filePath), content);
          await vi.waitUntil(
            () =>
              assetsCatalogDirs
                .map((dir) => existsSync(path.join(EC_CORE_DIR, dir, 'commands', path.relative(dirPrefix, filePath))))
                .every(Boolean),
            { timeout: 3000 }
          );

          // Act
          await fs.rm(path.join(PROJECT_DIR, filePath));

          // Assert
          await vi.waitFor(() =>
            Promise.all(
              assetsCatalogDirs.map((dir) =>
                expect(fs.readFile(path.join(EC_CORE_DIR, dir, 'commands/', path.relative(dirPrefix, filePath)))).rejects.toThrow(
                  /ENOENT: no such file or directory/
                )
              )
            )
          );
        }
      );

      let prevDir: string = '';
      test.each(
        dirPrefix
          .split('/')
          .filter(Boolean)
          .map((dir) => (prevDir += '/' + dir))
      )('when the %s directory is deleted, it deletes the corresponding commands from astro', async (dirToDelete) => {
        const filePath = path.join(dirPrefix, commandName, `index.md`);

        // Arrange
        await mkdir(path.dirname(path.join(PROJECT_DIR, filePath)));
        await fs.writeFile(path.join(PROJECT_DIR, filePath), `---${os.EOL}id: FakeCommand${os.EOL}---${os.EOL}`);
        await vi.waitUntil(
          () =>
            existsSync(
              path.join(EC_CORE_DIR, 'src/content/commands/', path.dirname(path.relative(dirPrefix, filePath)), 'index.mdx')
            ),
          {
            timeout: 3000,
          }
        );

        // Act
        await fs.rm(path.join(PROJECT_DIR, dirToDelete), { recursive: true });

        // Assert
        await vi.waitFor(() =>
          expect(
            fs.readFile(
              path.join(EC_CORE_DIR, 'src/content/commands/', path.dirname(path.relative(dirPrefix, filePath)), 'index.mdx')
            )
          ).rejects.toThrow(/ENOENT: no such file or directory/)
        );
      });
    });

    test('when the path contains `commands`, it should identify correct path to astro', async () => {
      const filePath = path.join('commands/foo-bar-commands/index.md');

      // Arrange
      await mkdir(path.dirname(path.join(PROJECT_DIR, filePath)));

      // Act
      await fs.writeFile(path.join(PROJECT_DIR, filePath), `---${os.EOL}id: FakeCommand${os.EOL}---${os.EOL}`);

      // Assert
      await vi.waitFor(() =>
        expect(fs.readFile(path.join(EC_CORE_DIR, 'src/content/', path.dirname(filePath), 'index.mdx'), 'utf8')).resolves.toEqual(
          `---${os.EOL}id: FakeCommand${os.EOL}---${os.EOL}`
        )
      );
    });
  });

  describe('Domains', () => {
    describe.each([
      {
        dir: '/domains',
      },
    ])('within $dir directory', ({ dir: dirPrefix }) => {
      const domainName = 'FakeDomain';

      test('when a domain is created, it adds to the correct location in astro', async () => {
        const filePath = path.join(dirPrefix, domainName, `index.md`);

        // Arrange
        await mkdir(path.dirname(path.join(PROJECT_DIR, filePath)));

        // Act
        await fs.writeFile(path.join(PROJECT_DIR, filePath), `---${os.EOL}id: FakeDomain${os.EOL}---${os.EOL}`);

        // Assert
        await vi.waitFor(() =>
          expect(
            fs.readFile(
              path.join(EC_CORE_DIR, 'src/content/domains/', path.dirname(path.relative(dirPrefix, filePath)), 'index.mdx'),
              'utf8'
            )
          ).resolves.toEqual(`---${os.EOL}id: FakeDomain${os.EOL}---${os.EOL}`)
        );
      });

      test('when a domain is updated, it updates the corresponding domain in astro', async () => {
        const filePath = path.join(dirPrefix, domainName, `index.md`);

        // Arrange
        await mkdir(path.dirname(path.join(PROJECT_DIR, filePath)));
        await fs.writeFile(path.join(PROJECT_DIR, filePath), `---${os.EOL}id: FakeDomain${os.EOL}---${os.EOL}`);

        // Act
        await fs.appendFile(path.join(PROJECT_DIR, filePath), 'UPDATE TEST');

        // Assert
        await vi.waitFor(() =>
          expect(
            fs.readFile(
              path.join(EC_CORE_DIR, 'src/content/domains/', path.dirname(path.relative(dirPrefix, filePath)), 'index.mdx'),
              'utf-8'
            )
          ).resolves.toContain('UPDATE TEST')
        );
      });

      test('when a domain is deleted, it deletes the corresponding domain from astro', async () => {
        const filePath = path.join(dirPrefix, domainName, `index.md`);

        // Arrange
        await mkdir(path.dirname(path.join(PROJECT_DIR, filePath)));
        await fs.writeFile(path.join(PROJECT_DIR, filePath), `---${os.EOL}id: FakeDomain${os.EOL}---${os.EOL}`);
        await vi.waitUntil(
          () =>
            existsSync(
              path.join(EC_CORE_DIR, 'src/content/domains/', path.dirname(path.relative(dirPrefix, filePath)), 'index.mdx')
            ),
          {
            timeout: 3000,
          }
        );

        // Act
        await fs.rm(path.join(PROJECT_DIR, filePath));

        // Assert
        await vi.waitFor(() =>
          expect(
            fs.readFile(
              path.join(EC_CORE_DIR, 'src/content/domains/', path.dirname(path.relative(dirPrefix, filePath)), 'index.mdx')
            )
          ).rejects.toThrow(/ENOENT: no such file or directory/)
        );
      });

      test.each(assets)(
        'when the asset $filename is created, it adds it to the correct location in astro',
        async ({ filename, content }) => {
          const filePath = path.join(dirPrefix, domainName, filename);

          // Arrange
          await mkdir(path.dirname(path.join(PROJECT_DIR, filePath)));

          // Act
          await fs.writeFile(path.join(PROJECT_DIR, filePath), content);

          // Assert
          await vi.waitFor(() =>
            Promise.all(
              assetsCatalogDirs.map((dir) =>
                expect(
                  fs.readFile(path.join(EC_CORE_DIR, dir, 'domains', path.relative(dirPrefix, filePath)), 'utf8')
                ).resolves.toEqual(content)
              )
            )
          );
        }
      );

      test.each(assets)(
        'when the asset $filename is updated, it updates the corresponding asset in astro',
        async ({ filename, content, updatedContent }) => {
          const filePath = path.join(dirPrefix, domainName, filename);

          // Arrange
          await mkdir(path.dirname(path.join(PROJECT_DIR, filePath)));
          await fs.writeFile(path.join(PROJECT_DIR, filePath), content);

          // Act
          await fs.writeFile(path.join(PROJECT_DIR, filePath), updatedContent);

          // Assert
          await vi.waitFor(() =>
            Promise.all(
              assetsCatalogDirs.map((dir) =>
                expect(
                  fs.readFile(path.join(EC_CORE_DIR, dir, 'domains', path.relative(dirPrefix, filePath)), 'utf-8')
                ).resolves.toEqual(updatedContent)
              )
            )
          );
        }
      );

      test.each(assets)(
        'when the asset $filename is deleted, it deletes the corresponding asset from astro',
        async ({ filename, content }) => {
          const filePath = path.join(dirPrefix, domainName, filename);

          // Arrange
          await mkdir(path.dirname(path.join(PROJECT_DIR, filePath)));
          await fs.writeFile(path.join(PROJECT_DIR, filePath), content);
          await vi.waitUntil(
            () =>
              assetsCatalogDirs
                .map((dir) => existsSync(path.join(EC_CORE_DIR, dir, 'domains/', path.relative(dirPrefix, filePath))))
                .every(Boolean),
            { timeout: 3000 }
          );

          // Act
          await fs.rm(path.join(PROJECT_DIR, filePath));

          // Assert
          await vi.waitFor(() =>
            Promise.all(
              assetsCatalogDirs.map((dir) =>
                expect(fs.readFile(path.join(EC_CORE_DIR, dir, 'domains/', path.relative(dirPrefix, filePath)))).rejects.toThrow(
                  /ENOENT: no such file or directory/
                )
              )
            )
          );
        }
      );

      test('when a versioned domain is created, it adds to the correct location in astro', async () => {
        const filePath = path.join(dirPrefix, domainName, `versioned/0.0.1/index.md`);

        // Arrange
        await mkdir(path.dirname(path.join(PROJECT_DIR, filePath)));

        // Act
        await fs.writeFile(
          path.join(PROJECT_DIR, filePath),
          `---${os.EOL}id: FakeDomain${os.EOL}version: 0.0.1${os.EOL}---${os.EOL}`
        );

        // Assert
        await vi.waitFor(() =>
          expect(
            fs.readFile(
              path.join(EC_CORE_DIR, 'src/content/domains/', path.dirname(path.relative(dirPrefix, filePath)), 'index.mdx'),
              'utf8'
            )
          ).resolves.toEqual(`---${os.EOL}id: FakeDomain${os.EOL}version: 0.0.1${os.EOL}---${os.EOL}`)
        );
      });

      test('when a versioned domain is updated, it updates the corresponding domain in astro', async () => {
        const filePath = path.join(dirPrefix, domainName, `versioned/0.0.1/index.md`);

        // Arrange
        await mkdir(path.dirname(path.join(PROJECT_DIR, filePath)));
        await fs.writeFile(
          path.join(PROJECT_DIR, filePath),
          `---${os.EOL}id: FakeDomain${os.EOL}version: 0.0.1${os.EOL}---${os.EOL}`
        );

        // Act
        await fs.appendFile(path.join(PROJECT_DIR, filePath), 'UPDATE TEST');

        await vi.waitFor(() =>
          expect(
            fs.readFile(
              path.join(EC_CORE_DIR, 'src/content/domains/', path.dirname(path.relative(dirPrefix, filePath)), 'index.mdx'),
              'utf-8'
            )
          ).resolves.toContain('UPDATE TEST')
        );
      });

      test('when a versioned domain is deleted, it deletes the corresponding domain in astro', async () => {
        const filePath = path.join(dirPrefix, domainName, `versioned/0.0.1/index.md`);

        // Arrange
        await mkdir(path.dirname(path.join(PROJECT_DIR, filePath)));
        await fs.writeFile(
          path.join(PROJECT_DIR, filePath),
          `---${os.EOL}id: FakeDomain${os.EOL}version: 0.0.1${os.EOL}---${os.EOL}`
        );
        await vi.waitUntil(
          () =>
            existsSync(
              path.join(EC_CORE_DIR, 'src/content/domains/', path.dirname(path.relative(dirPrefix, filePath)), 'index.mdx')
            ),
          {
            timeout: 3000,
          }
        );

        // Act
        await fs.rm(path.join(PROJECT_DIR, filePath));

        // Assert
        await vi.waitFor(() =>
          expect(
            fs.readFile(
              path.join(EC_CORE_DIR, 'src/content/domains', path.dirname(path.relative(dirPrefix, filePath)), 'index.mdx')
            )
          ).rejects.toThrow(/ENOENT: no such file or directory/)
        );
      });

      test.each(assets)(
        'when the versioned asset $filename is created, it adds it to the correct location in astro',
        async ({ filename, content }) => {
          const filePath = path.join(dirPrefix, domainName, 'versioned/0.0.1/', filename);

          // Arrange
          await mkdir(path.dirname(path.join(PROJECT_DIR, filePath)));

          // Act
          await fs.writeFile(path.join(PROJECT_DIR, filePath), content);

          // Assert
          await vi.waitFor(() =>
            Promise.all(
              assetsCatalogDirs.map((dir) =>
                expect(
                  fs.readFile(path.join(EC_CORE_DIR, dir, 'domains', path.relative(dirPrefix, filePath)), 'utf8')
                ).resolves.toEqual(content)
              )
            )
          );
        }
      );

      test.each(assets)(
        'when the versioned asset $filename is updated, it updates the corresponding asset in astro',
        async ({ filename, content, updatedContent }) => {
          const filePath = path.join(dirPrefix, domainName, 'versioned/0.0.1/', filename);

          // Arrange
          await mkdir(path.dirname(path.join(PROJECT_DIR, filePath)));
          await fs.writeFile(path.join(PROJECT_DIR, filePath), content);

          // Act
          await fs.writeFile(path.join(PROJECT_DIR, filePath), updatedContent);

          // Assert
          await vi.waitFor(() =>
            Promise.all(
              assetsCatalogDirs.map((dir) =>
                expect(
                  fs.readFile(path.join(EC_CORE_DIR, dir, 'domains', path.relative(dirPrefix, filePath)), 'utf-8')
                ).resolves.toEqual(updatedContent)
              )
            )
          );
        }
      );

      test.each(assets)(
        'when the versioned asset $filename is deleted, it deletes the corresponding asset from astro',
        async ({ filename, content }) => {
          const filePath = path.join(dirPrefix, domainName, 'versioned/0.0.1/', filename);

          // Arrange
          await mkdir(path.dirname(path.join(PROJECT_DIR, filePath)));
          await fs.writeFile(path.join(PROJECT_DIR, filePath), content);
          await vi.waitUntil(
            () =>
              assetsCatalogDirs
                .map((dir) => existsSync(path.join(EC_CORE_DIR, dir, 'domains/', path.relative(dirPrefix, filePath))))
                .every(Boolean),
            { timeout: 3000 }
          );

          // Act
          await fs.rm(path.join(PROJECT_DIR, filePath));

          // Assert
          await vi.waitFor(() =>
            Promise.all(
              assetsCatalogDirs.map((dir) =>
                expect(fs.readFile(path.join(EC_CORE_DIR, dir, 'domains/', path.relative(dirPrefix, filePath)))).rejects.toThrow(
                  /ENOENT: no such file or directory/
                )
              )
            )
          );
        }
      );
    });

    test('when the path contains `domains`, it should identify correct path to astro', async () => {
      const filePath = path.join('domains/foo-bar-domains/index.md');

      // Arrange
      await mkdir(path.dirname(path.join(PROJECT_DIR, filePath)));

      // Act
      await fs.writeFile(path.join(PROJECT_DIR, filePath), `---${os.EOL}id: FakeDomain${os.EOL}---${os.EOL}`);

      // Assert
      await vi.waitFor(() =>
        expect(fs.readFile(path.join(EC_CORE_DIR, 'src/content/', path.dirname(filePath), 'index.mdx'), 'utf8')).resolves.toEqual(
          `---${os.EOL}id: FakeDomain${os.EOL}---${os.EOL}`
        )
      );
    });
  });

  describe('Events', () => {
    describe.each([
      { dir: '/events' },
      { dir: '/services/FakeService/events' },
      { dir: '/domains/FakeDomain/events' },
      { dir: '/domains/FakeDomain/services/FakeService/events' },
    ])('within $dir directory', ({ dir: dirPrefix }) => {
      const eventName = 'FakeEvent';

      test('when an event is created, it adds it to the correct location in astro', async () => {
        const filePath = path.join(dirPrefix, eventName, `index.md`);

        // Arrange
        await mkdir(path.dirname(path.join(PROJECT_DIR, filePath)));

        // Act
        await fs.writeFile(path.join(PROJECT_DIR, filePath), `---${os.EOL}id: FakeEvent${os.EOL}---${os.EOL}`);

        // Assert
        await vi.waitFor(() =>
          expect(
            fs.readFile(
              path.join(EC_CORE_DIR, 'src/content/events', path.dirname(path.relative(dirPrefix, filePath)), 'index.mdx'),
              'utf8'
            )
          ).resolves.toEqual(`---${os.EOL}id: FakeEvent${os.EOL}---${os.EOL}`)
        );
      });

      test('when an event is updated, it updates the corresponding event in astro', async () => {
        const filePath = path.join(dirPrefix, eventName, `index.md`);

        // Arrange
        await mkdir(path.dirname(path.join(PROJECT_DIR, filePath)));
        await fs.writeFile(path.join(PROJECT_DIR, filePath), `---${os.EOL}id: FakeEvent${os.EOL}---${os.EOL}`);

        // Act
        await fs.appendFile(path.join(PROJECT_DIR, filePath), 'UPDATE TEST');

        // Assert
        await vi.waitFor(() =>
          expect(
            fs.readFile(
              path.join(EC_CORE_DIR, 'src/content/events/', path.dirname(path.relative(dirPrefix, filePath)), 'index.mdx'),
              'utf-8'
            )
          ).resolves.toContain('UPDATE TEST')
        );
      });

      test('when an event is deleted, it deletes the corresponding event from astro', async () => {
        const filePath = path.join(dirPrefix, eventName, `index.md`);

        // Arrange
        await mkdir(path.dirname(path.join(PROJECT_DIR, filePath)));
        await fs.writeFile(path.join(PROJECT_DIR, filePath), `---${os.EOL}id: FakeEvent${os.EOL}---${os.EOL}`);
        await vi.waitUntil(
          () =>
            existsSync(
              path.join(EC_CORE_DIR, 'src/content/events/', path.dirname(path.relative(dirPrefix, filePath)), 'index.mdx')
            ),
          {
            timeout: 3000,
          }
        );

        // Act
        await fs.rm(path.join(PROJECT_DIR, filePath));

        // Assert
        await vi.waitFor(() =>
          expect(
            fs.readFile(
              path.join(EC_CORE_DIR, 'src/content/events/', path.dirname(path.relative(dirPrefix, filePath)), 'index.mdx')
            )
          ).rejects.toThrow(/ENOENT: no such file or directory/)
        );
      });

      test.each(assets)(
        'when the asset $filename is created, it adds it to the correct location in astro',
        async ({ filename, content }) => {
          const filePath = path.join(dirPrefix, eventName, filename);

          // Arrange
          await mkdir(path.dirname(path.join(PROJECT_DIR, filePath)));

          // Act
          await fs.writeFile(path.join(PROJECT_DIR, filePath), content);

          // Assert
          await vi.waitFor(() =>
            Promise.all(
              assetsCatalogDirs.map((dir) =>
                expect(
                  fs.readFile(path.join(EC_CORE_DIR, dir, 'events', path.relative(dirPrefix, filePath)), 'utf8')
                ).resolves.toEqual(content)
              )
            )
          );
        }
      );

      test.each(assets)(
        'when the asset $filename is updated, it updates the corresponding asset in astro',
        async ({ filename, content, updatedContent }) => {
          const filePath = path.join(dirPrefix, eventName, filename);

          // Arrange
          await mkdir(path.dirname(path.join(PROJECT_DIR, filePath)));
          await fs.writeFile(path.join(PROJECT_DIR, filePath), content);

          // Act
          await fs.writeFile(path.join(PROJECT_DIR, filePath), updatedContent);

          // Assert
          await vi.waitFor(() =>
            Promise.all(
              assetsCatalogDirs.map((dir) =>
                expect(
                  fs.readFile(path.join(EC_CORE_DIR, dir, 'events', path.relative(dirPrefix, filePath)), 'utf-8')
                ).resolves.toEqual(updatedContent)
              )
            )
          );
        }
      );

      test.each(assets)(
        'when the asset $filename is deleted, it deletes the corresponding asset from astro',
        async ({ filename, content }) => {
          const filePath = path.join(dirPrefix, eventName, filename);

          // Arrange
          await mkdir(path.dirname(path.join(PROJECT_DIR, filePath)));
          await fs.writeFile(path.join(PROJECT_DIR, filePath), content);
          await vi.waitUntil(
            () =>
              assetsCatalogDirs
                .map((dir) => existsSync(path.join(EC_CORE_DIR, dir, 'events/', path.relative(dirPrefix, filePath))))
                .every(Boolean),
            { timeout: 3000 }
          );

          // Act
          await fs.rm(path.join(PROJECT_DIR, filePath));

          // Assert
          await vi.waitFor(() =>
            Promise.all(
              assetsCatalogDirs.map((dir) =>
                expect(fs.readFile(path.join(EC_CORE_DIR, dir, 'events/', path.relative(dirPrefix, filePath)))).rejects.toThrow(
                  /ENOENT: no such file or directory/
                )
              )
            )
          );
        }
      );

      test('when a versioned event is created, it adds it to the correct location in astro', async () => {
        const filePath = path.join(dirPrefix, eventName, `versioned/0.0.1/index.md`);

        // Arrange
        await mkdir(path.dirname(path.join(PROJECT_DIR, filePath)));

        // Act
        await fs.writeFile(
          path.join(PROJECT_DIR, filePath),
          `---${os.EOL}id: FakeEvent${os.EOL}version: 0.0.1${os.EOL}---${os.EOL}`
        );

        // Assert
        await vi.waitFor(() =>
          expect(
            fs.readFile(
              path.join(EC_CORE_DIR, 'src/content/events/', path.dirname(path.relative(dirPrefix, filePath)), 'index.mdx'),
              'utf8'
            )
          ).resolves.toEqual(`---${os.EOL}id: FakeEvent${os.EOL}version: 0.0.1${os.EOL}---${os.EOL}`)
        );
      });

      test('when a versioned event is updated, it updates the corresponding event in astro', async () => {
        const filePath = path.join(dirPrefix, eventName, `versioned/0.0.1/index.md`);

        // Arrange
        await mkdir(path.dirname(path.join(PROJECT_DIR, filePath)));
        await fs.writeFile(
          path.join(PROJECT_DIR, filePath),
          `---${os.EOL}id: FakeEvent${os.EOL}version: 0.0.1${os.EOL}---${os.EOL}`
        );

        // Act
        await fs.appendFile(path.join(PROJECT_DIR, filePath), 'UPDATE TEST');

        // Assert
        await vi.waitFor(() =>
          expect(
            fs.readFile(
              path.join(EC_CORE_DIR, 'src/content/events/', path.dirname(path.relative(dirPrefix, filePath)), 'index.mdx'),
              'utf-8'
            )
          ).resolves.toContain('UPDATE TEST')
        );
      });

      test('when a versioned event is deleted, it deletes the corresponding event from astro', async () => {
        const filePath = path.join(dirPrefix, eventName, `versioned/0.0.1/index.md`);

        // Arrange
        await mkdir(path.dirname(path.join(PROJECT_DIR, filePath)));
        await fs.writeFile(
          path.join(PROJECT_DIR, filePath),
          `---${os.EOL}id: FakeEvent${os.EOL}version: 0.0.1${os.EOL}---${os.EOL}`
        );
        await vi.waitUntil(
          () => existsSync(path.join(EC_CORE_DIR, 'src/content/events/', path.dirname(path.relative(dirPrefix, filePath)))),
          { timeout: 3000 }
        );

        // Act
        await fs.rm(path.join(PROJECT_DIR, filePath));

        // Assert
        await vi.waitFor(() =>
          expect(
            fs.readFile(
              path.join(EC_CORE_DIR, 'src/content/events/', path.dirname(path.relative(dirPrefix, filePath)), 'index.mdx')
            )
          ).rejects.toThrow(/ENOENT: no such file or directory/)
        );
      });

      test.each(assets)(
        'when the versioned asset $filename is created, it adds it to the correct location in astro',
        async ({ filename, content }) => {
          const filePath = path.join(dirPrefix, eventName, filename);

          // Arrange
          await mkdir(path.dirname(path.join(PROJECT_DIR, filePath)));

          // Act
          await fs.writeFile(path.join(PROJECT_DIR, filePath), content);

          // Assert
          await vi.waitFor(() =>
            Promise.all(
              assetsCatalogDirs.map((dir) =>
                expect(
                  fs.readFile(path.join(EC_CORE_DIR, dir, 'events', path.relative(dirPrefix, filePath)), 'utf8')
                ).resolves.toEqual(content)
              )
            )
          );
        }
      );

      test.each(assets)(
        'when the versioned asset $filename is updated, it updates the corresponding asset in astro',
        async ({ filename, content, updatedContent }) => {
          const filePath = path.join(dirPrefix, eventName, filename);

          // Arrange
          await mkdir(path.dirname(path.join(PROJECT_DIR, filePath)));
          await fs.writeFile(path.join(PROJECT_DIR, filePath), content);

          // Act
          await fs.writeFile(path.join(PROJECT_DIR, filePath), updatedContent);

          // Assert
          await vi.waitFor(() =>
            Promise.all(
              assetsCatalogDirs.map((dir) =>
                expect(
                  fs.readFile(path.join(EC_CORE_DIR, dir, 'events', path.relative(dirPrefix, filePath)), 'utf-8')
                ).resolves.toEqual(updatedContent)
              )
            )
          );
        }
      );

      test.each(assets)(
        'when the versioned asset $filename is deleted, it deletes the corresponding asset from astro',
        async ({ filename, content }) => {
          const filePath = path.join(dirPrefix, eventName, filename);

          // Arrange
          await mkdir(path.dirname(path.join(PROJECT_DIR, filePath)));
          await fs.writeFile(path.join(PROJECT_DIR, filePath), content);
          await vi.waitUntil(
            () =>
              assetsCatalogDirs
                .map((dir) => existsSync(path.join(EC_CORE_DIR, dir, 'events/', path.relative(dirPrefix, filePath))))
                .every(Boolean),
            { timeout: 3000 }
          );

          // Act
          await fs.rm(path.join(PROJECT_DIR, filePath));

          // Assert
          await vi.waitFor(() =>
            Promise.all(
              assetsCatalogDirs.map((dir) =>
                expect(fs.readFile(path.join(EC_CORE_DIR, dir, 'events/', path.relative(dirPrefix, filePath)))).rejects.toThrow(
                  /ENOENT: no such file or directory/
                )
              )
            )
          );
        }
      );

      let prevDir: string = '';
      test.each(
        dirPrefix
          .split('/')
          .filter(Boolean)
          .map((dir) => (prevDir += '/' + dir))
      )('when the %s directory is deleted, it deletes the corresponding events from astro', async (dirToDelete) => {
        const filePath = path.join(dirPrefix, eventName, `index.md`);

        // Arrange
        await mkdir(path.dirname(path.join(PROJECT_DIR, filePath)));
        await fs.writeFile(path.join(PROJECT_DIR, filePath), `---${os.EOL}id: FakeEvent${os.EOL}---${os.EOL}`);
        await vi.waitUntil(
          () =>
            existsSync(
              path.join(EC_CORE_DIR, 'src/content/events/', path.dirname(path.relative(dirPrefix, filePath)), 'index.mdx')
            ),
          {
            timeout: 3000,
          }
        );

        // Act
        await fs.rm(path.join(PROJECT_DIR, dirToDelete), { recursive: true });

        // Assert
        await vi.waitFor(() =>
          expect(
            fs.readFile(
              path.join(EC_CORE_DIR, 'src/content/events/', path.dirname(path.relative(dirPrefix, filePath)), 'index.mdx')
            )
          ).rejects.toThrow(/ENOENT: no such file or directory/)
        );
      });
    });

    test('when the path contains `events`, it should identify correct path to astro', async () => {
      const filePath = path.join('events/foo-bar-events/index.md');

      // Arrange
      await mkdir(path.dirname(path.join(PROJECT_DIR, filePath)));

      // Act
      await fs.writeFile(path.join(PROJECT_DIR, filePath), `---${os.EOL}id: FakeEvent${os.EOL}---${os.EOL}`);

      // Assert
      await vi.waitFor(() =>
        expect(fs.readFile(path.join(EC_CORE_DIR, 'src/content/', path.dirname(filePath), 'index.mdx'), 'utf8')).resolves.toEqual(
          `---${os.EOL}id: FakeEvent${os.EOL}---${os.EOL}`
        )
      );
    });
  });

  describe('Services', () => {
    describe.each([{ dir: '/services' }, { dir: '/domains/FakeDomain/services' }])(
      'within $dir directory',
      ({ dir: dirPrefix }) => {
        const serviceName = 'FakeService';

        test('when a service is created, it adds it to the correct location in astro', async () => {
          const filePath = path.join(dirPrefix, serviceName, `index.md`);

          // Arrange
          await mkdir(path.dirname(path.join(PROJECT_DIR, filePath)));

          // Act
          await fs.writeFile(path.join(PROJECT_DIR, filePath), `---${os.EOL}id: FakeService${os.EOL}---${os.EOL}`);

          // Assert
          await vi.waitFor(() =>
            expect(
              fs.readFile(
                path.join(EC_CORE_DIR, 'src/content/services/', path.dirname(path.relative(dirPrefix, filePath)), 'index.mdx'),
                'utf8'
              )
            ).resolves.toEqual(`---${os.EOL}id: FakeService${os.EOL}---${os.EOL}`)
          );
        });

        test('when a service is updated, it updates the corresponding service in astro', async () => {
          const filePath = path.join(dirPrefix, serviceName, `index.md`);

          // Arrange
          await mkdir(path.dirname(path.join(PROJECT_DIR, filePath)));
          await fs.writeFile(path.join(PROJECT_DIR, filePath), `---${os.EOL}id: FakeService${os.EOL}---${os.EOL}`);

          // Act
          await fs.appendFile(path.join(PROJECT_DIR, filePath), 'UPDATE TEST');

          // Assert
          await vi.waitFor(() =>
            expect(
              fs.readFile(
                path.join(EC_CORE_DIR, 'src/content/services/', path.dirname(path.relative(dirPrefix, filePath)), 'index.mdx'),
                'utf-8'
              )
            ).resolves.toContain('UPDATE TEST')
          );
        });

        test('when a service is deleted, it deletes the corresponding service from astro', async () => {
          const filePath = path.join(dirPrefix, serviceName, `index.md`);

          // Arrange
          await mkdir(path.dirname(path.join(PROJECT_DIR, filePath)));
          await fs.writeFile(path.join(PROJECT_DIR, filePath), `---${os.EOL}id: FakeService${os.EOL}---${os.EOL}`);
          await vi.waitUntil(
            () =>
              existsSync(
                path.join(EC_CORE_DIR, 'src/content/services/', path.dirname(path.relative(dirPrefix, filePath)), 'index.mdx')
              ),
            {
              timeout: 3000,
            }
          );

          // Act
          await fs.rm(path.join(PROJECT_DIR, filePath));

          // Assert
          await vi.waitFor(() =>
            expect(
              fs.readFile(
                path.join(EC_CORE_DIR, 'src/content/services/', path.dirname(path.relative(dirPrefix, filePath)), 'index.mdx')
              )
            ).rejects.toThrow(/ENOENT: no such file or directory/)
          );
        });

        test.each(assets)(
          'when the asset $filename is created, it adds it to the correct location in astro',
          async ({ filename, content }) => {
            const filePath = path.join(dirPrefix, serviceName, filename);

            // Arrange
            await mkdir(path.dirname(path.join(PROJECT_DIR, filePath)));

            // Act
            await fs.writeFile(path.join(PROJECT_DIR, filePath), content);

            // Assert
            await vi.waitFor(() =>
              Promise.all(
                assetsCatalogDirs.map((dir) =>
                  expect(
                    fs.readFile(path.join(EC_CORE_DIR, dir, 'services', path.relative(dirPrefix, filePath)), 'utf8')
                  ).resolves.toEqual(content)
                )
              )
            );
          }
        );

        test.each(assets)(
          'when the asset $filename is updated, it updates the corresponding asset in astro',
          async ({ filename, content, updatedContent }) => {
            const filePath = path.join(dirPrefix, serviceName, filename);

            // Arrange
            await mkdir(path.dirname(path.join(PROJECT_DIR, filePath)));
            await fs.writeFile(path.join(PROJECT_DIR, filePath), content);

            // Act
            await fs.writeFile(path.join(PROJECT_DIR, filePath), updatedContent);

            // Assert
            await vi.waitFor(() =>
              Promise.all(
                assetsCatalogDirs.map((dir) =>
                  expect(
                    fs.readFile(path.join(EC_CORE_DIR, dir, 'services', path.relative(dirPrefix, filePath)), 'utf-8')
                  ).resolves.toEqual(updatedContent)
                )
              )
            );
          }
        );

        test.each(assets)(
          'when the asset $filename is deleted, it deletes the corresponding asset from astro',
          async ({ filename, content }) => {
            const filePath = path.join(dirPrefix, serviceName, filename);

            // Arrange
            await mkdir(path.dirname(path.join(PROJECT_DIR, filePath)));
            await fs.writeFile(path.join(PROJECT_DIR, filePath), content);
            await vi.waitUntil(
              () =>
                assetsCatalogDirs
                  .map((dir) => existsSync(path.join(EC_CORE_DIR, dir, 'services/', path.relative(dirPrefix, filePath))))
                  .every(Boolean),
              { timeout: 3000 }
            );

            // Act
            await fs.rm(path.join(PROJECT_DIR, filePath));

            // Assert
            await vi.waitFor(() =>
              Promise.all(
                assetsCatalogDirs.map((dir) =>
                  expect(
                    fs.readFile(path.join(EC_CORE_DIR, dir, 'services/', path.relative(dirPrefix, filePath)))
                  ).rejects.toThrow(/ENOENT: no such file or directory/)
                )
              )
            );
          }
        );

        test('when a versioned service is created, it adds to the correct location in astro', async () => {
          const filePath = path.join(dirPrefix, serviceName, 'versioned/0.0.1/', 'index.md');

          // Arrange
          await mkdir(path.dirname(path.join(PROJECT_DIR, filePath)));

          // Act
          await fs.writeFile(
            path.join(PROJECT_DIR, filePath),
            `---${os.EOL}id: FakeService${os.EOL}version: 0.0.1${os.EOL}---${os.EOL}`
          );

          // Assert
          await vi.waitFor(() =>
            expect(
              fs.readFile(
                path.join(EC_CORE_DIR, 'src/content/services/', path.dirname(path.relative(dirPrefix, filePath)), 'index.mdx'),
                'utf8'
              )
            ).resolves.toEqual(`---${os.EOL}id: FakeService${os.EOL}version: 0.0.1${os.EOL}---${os.EOL}`)
          );
        });

        test('when a versioned service is updated, it updates the corresponding service in astro', async () => {
          const filePath = path.join(dirPrefix, serviceName, 'versioned/0.0.1/', 'index.md');

          // Arrange
          await mkdir(path.dirname(path.join(PROJECT_DIR, filePath)));
          await fs.writeFile(
            path.join(PROJECT_DIR, filePath),
            `---${os.EOL}id: FakeService${os.EOL}version: 0.0.1${os.EOL}---${os.EOL}`
          );

          // Act
          await fs.appendFile(path.join(PROJECT_DIR, filePath), 'UPDATE TEST');

          // Assert
          await vi.waitFor(() =>
            expect(
              fs.readFile(
                path.join(EC_CORE_DIR, 'src/content/services/', path.dirname(path.relative(dirPrefix, filePath)), 'index.mdx'),
                'utf-8'
              )
            ).resolves.toContain('UPDATE TEST')
          );
        });

        test('when a versioned service is deleted, it deletes the corresponding service from astro', async () => {
          const filePath = path.join(dirPrefix, serviceName, 'versioned/0.0.1/', 'index.md');

          // Arrange
          await mkdir(path.dirname(path.join(PROJECT_DIR, filePath)));
          await fs.writeFile(
            path.join(PROJECT_DIR, filePath),
            `---${os.EOL}id: FakeService${os.EOL}version: 0.0.1${os.EOL}---${os.EOL}`
          );
          await vi.waitUntil(
            () =>
              existsSync(
                path.join(EC_CORE_DIR, 'src/content/services/', path.dirname(path.relative(dirPrefix, filePath)), 'index.mdx')
              ),
            {
              timeout: 3000,
            }
          );

          // Act
          await fs.rm(path.join(PROJECT_DIR, filePath));

          // Assert
          await vi.waitFor(() =>
            expect(
              fs.readFile(
                path.join(EC_CORE_DIR, 'src/content/services/', path.dirname(path.relative(dirPrefix, filePath)), 'index.mdx')
              )
            ).rejects.toThrow(/ENOENT: no such file or directory/)
          );
        });

        test.each(assets)(
          'when the versioned asset $filename is created, it adds it to the correct location in astro',
          async ({ filename, content }) => {
            const filePath = path.join(dirPrefix, serviceName, filename);

            // Arrange
            await mkdir(path.dirname(path.join(PROJECT_DIR, filePath)));

            // Act
            await fs.writeFile(path.join(PROJECT_DIR, filePath), content);

            // Assert
            await vi.waitFor(() =>
              Promise.all(
                assetsCatalogDirs.map((dir) =>
                  expect(
                    fs.readFile(path.join(EC_CORE_DIR, dir, 'services', path.relative(dirPrefix, filePath)), 'utf8')
                  ).resolves.toEqual(content)
                )
              )
            );
          }
        );

        test.each(assets)(
          'when the versioned asset $filename is updated, it updates the corresponding asset in astro',
          async ({ filename, content, updatedContent }) => {
            const filePath = path.join(dirPrefix, serviceName, filename);

            // Arrange
            await mkdir(path.dirname(path.join(PROJECT_DIR, filePath)));
            await fs.writeFile(path.join(PROJECT_DIR, filePath), content);

            // Act
            await fs.writeFile(path.join(PROJECT_DIR, filePath), updatedContent);

            // Assert
            await vi.waitFor(() =>
              Promise.all(
                assetsCatalogDirs.map((dir) =>
                  expect(
                    fs.readFile(path.join(EC_CORE_DIR, dir, 'services', path.relative(dirPrefix, filePath)), 'utf-8')
                  ).resolves.toEqual(updatedContent)
                )
              )
            );
          }
        );

        test.each(assets)(
          'when the versioned asset $filename is deleted, it deletes the corresponding asset from astro',
          async ({ filename, content }) => {
            const filePath = path.join(dirPrefix, serviceName, filename);

            // Arrange
            await mkdir(path.dirname(path.join(PROJECT_DIR, filePath)));
            await fs.writeFile(path.join(PROJECT_DIR, filePath), content);
            await vi.waitUntil(
              () =>
                assetsCatalogDirs
                  .map((dir) => existsSync(path.join(EC_CORE_DIR, dir, 'services/', path.relative(dirPrefix, filePath))))
                  .every(Boolean),
              { timeout: 3000 }
            );

            // Act
            await fs.rm(path.join(PROJECT_DIR, filePath));

            // Assert
            await vi.waitFor(() =>
              Promise.all(
                assetsCatalogDirs.map((dir) =>
                  expect(
                    fs.readFile(path.join(EC_CORE_DIR, dir, 'services/', path.relative(dirPrefix, filePath)))
                  ).rejects.toThrow(/ENOENT: no such file or directory/)
                )
              )
            );
          }
        );

        let prevDir: string = '';
        test.each(
          dirPrefix
            .split('/')
            .filter(Boolean)
            .map((dir) => (prevDir += '/' + dir))
        )('when the %s directory is deleted, it deletes the corresponding services from astro', async (dirToDelete) => {
          const filePath = path.join(dirPrefix, serviceName, `index.md`);

          // Arrange
          await mkdir(path.dirname(path.join(PROJECT_DIR, filePath)));
          await fs.writeFile(path.join(PROJECT_DIR, filePath), `---${os.EOL}id: FakeService${os.EOL}---${os.EOL}`);
          await vi.waitUntil(
            () =>
              existsSync(
                path.join(EC_CORE_DIR, 'src/content/services/', path.dirname(path.relative(dirPrefix, filePath)), 'index.mdx')
              ),
            {
              timeout: 3000,
            }
          );

          // Act
          await fs.rm(path.join(PROJECT_DIR, dirToDelete), { recursive: true });

          // Assert
          await vi.waitFor(() =>
            expect(
              fs.readFile(
                path.join(EC_CORE_DIR, 'src/content/services/', path.dirname(path.relative(dirPrefix, filePath)), 'index.mdx')
              )
            ).rejects.toThrow(/ENOENT: no such file or directory/)
          );
        });
      }
    );

    test('when the path contains `services`, it should identify correct path to astro', async () => {
      const filePath = path.join('services/foo-bar-services/index.md');

      // Arrange
      await mkdir(path.dirname(path.join(PROJECT_DIR, filePath)));

      // Act
      await fs.writeFile(path.join(PROJECT_DIR, filePath), `---${os.EOL}id: FakeService${os.EOL}---${os.EOL}`);

      // Assert
      await vi.waitFor(() =>
        expect(fs.readFile(path.join(EC_CORE_DIR, 'src/content/', path.dirname(filePath), 'index.mdx'), 'utf8')).resolves.toEqual(
          `---${os.EOL}id: FakeService${os.EOL}---${os.EOL}`
        )
      );
    });
  });

  describe('Teams', () => {
    test('when a team is created, it adds it to the correct location in astro', async () => {
      const filePath = path.join('teams/', 'FakeTeam.md');

      // Arrange
      await mkdir(path.dirname(path.join(PROJECT_DIR, filePath)));

      // Act
      await fs.writeFile(path.join(PROJECT_DIR, filePath), `${os.EOL}id: FakeTeam${os.EOL}---${os.EOL}`);

      // Assert
      await vi.waitFor(() =>
        expect(fs.readFile(path.join(EC_CORE_DIR, 'src/content/', filePath), 'utf8')).resolves.toEqual(
          `${os.EOL}id: FakeTeam${os.EOL}---${os.EOL}`
        )
      );
    });

    test('when a team is updated, it updates the corresponding team in astro', async () => {
      const filePath = path.join('teams/', 'FakeTeam.md');

      // Arrange
      await mkdir(path.dirname(path.join(PROJECT_DIR, filePath)));
      await fs.writeFile(path.join(PROJECT_DIR, filePath), `${os.EOL}id: FakeTeam${os.EOL}---${os.EOL}`);

      // Act
      await fs.appendFile(path.join(PROJECT_DIR, filePath), 'UPDATE TEST');

      // Assert
      await vi.waitFor(() =>
        expect(fs.readFile(path.join(EC_CORE_DIR, 'src/content/', filePath), 'utf-8')).resolves.toContain('UPDATE TEST')
      );
    });

    test('when a team is deleted, it deletes the corresponding team from astro', async () => {
      const filePath = path.join('teams/', 'FakeTeam.md');

      // Arrange
      await mkdir(path.dirname(path.join(PROJECT_DIR, filePath)));
      await fs.writeFile(path.join(PROJECT_DIR, filePath), `${os.EOL}id: FakeTeam${os.EOL}---${os.EOL}`);
      await vi.waitUntil(() => existsSync(path.join(EC_CORE_DIR, 'src/content/', filePath)), { timeout: 3000 });

      // Act
      await fs.rm(path.join(PROJECT_DIR, filePath));

      // Assert
      await vi.waitFor(() =>
        expect(fs.readFile(path.join(EC_CORE_DIR, 'src/content/', filePath))).rejects.toThrow(/ENOENT: no such file or directory/)
      );
    });
  });

  describe('Users', () => {
    test('when an user is created, it adds it to the correct location in astro', async () => {
      const filePath = path.join('users/', 'FakeUser.md');

      // Arrange
      await mkdir(path.dirname(path.join(PROJECT_DIR, filePath)));

      // Act
      await fs.writeFile(path.join(PROJECT_DIR, filePath), `---${os.EOL}id: FakeUser${os.EOL}---${os.EOL}`);

      // Assert
      await vi.waitFor(() =>
        expect(fs.readFile(path.join(EC_CORE_DIR, 'src/content/', filePath), 'utf8')).resolves.toEqual(
          `---${os.EOL}id: FakeUser${os.EOL}---${os.EOL}`
        )
      );
    });

    test('when an user is updated, it updates the corresponding user in astro', async () => {
      const filePath = path.join('users/', 'FakeUser.md');

      // Arrange
      await mkdir(path.dirname(path.join(PROJECT_DIR, filePath)));
      await fs.writeFile(path.join(PROJECT_DIR, filePath), `---${os.EOL}id: FakeUser${os.EOL}---${os.EOL}`);

      // Act
      await fs.appendFile(path.join(PROJECT_DIR, filePath), 'UPDATE TEST');

      await vi.waitFor(() =>
        expect(fs.readFile(path.join(EC_CORE_DIR, 'src/content/', filePath), 'utf-8')).resolves.toContain('UPDATE TEST')
      );
    });

    test('when an user is deleted, it deletes the corresponding user from astro', async () => {
      const filePath = path.join('users/', 'FakeUser.md');

      // Arrange
      await mkdir(path.dirname(path.join(PROJECT_DIR, filePath)));
      await fs.writeFile(path.join(PROJECT_DIR, filePath), `---${os.EOL}id: FakeUser${os.EOL}---${os.EOL}`);
      await vi.waitUntil(() => existsSync(path.join(EC_CORE_DIR, 'src/content/', filePath)), { timeout: 3000 });

      // Act
      await fs.rm(path.join(PROJECT_DIR, filePath));

      // Assert
      await vi.waitFor(() =>
        expect(fs.readFile(path.join(EC_CORE_DIR, 'src/content/', filePath))).rejects.toThrow(/ENOENT: no such file or directory/)
      );
    });
  });

  describe('Changelogs', () => {
    test('when a changelog is created, it adds it to the correct location in astro', async () => {
      const filePath = path.join(`events/PaymentAccepted/changelog.md`);

      // Arrange
      await mkdir(path.dirname(path.join(PROJECT_DIR, filePath)));

      // Act
      await fs.writeFile(path.join(PROJECT_DIR, filePath), `---${os.EOL}createdAt: 2024-07-11${os.EOL}---${os.EOL}`);

      // Assert
      await vi.waitFor(() =>
        expect(
          fs.readFile(path.join(EC_CORE_DIR, 'src/content/changelogs', path.dirname(filePath), 'changelog.mdx'), 'utf-8')
        ).resolves.toEqual(`---${os.EOL}createdAt: 2024-07-11${os.EOL}---${os.EOL}`)
      );
    });

    test('when a changelog is updated, it updates the corresponding changelog in astro', async () => {
      const filePath = path.join(`events/PaymentAccepted/changelog.md`);

      // Arrange
      await mkdir(path.dirname(path.join(PROJECT_DIR, filePath)));
      await fs.writeFile(path.join(PROJECT_DIR, filePath), `---${os.EOL}createdAt: 2024-07-11${os.EOL}---${os.EOL}`);

      // Act
      await fs.appendFile(path.join(PROJECT_DIR, filePath), 'UPDATE TEST');

      // Assert
      await vi.waitFor(() =>
        expect(
          fs.readFile(path.join(EC_CORE_DIR, 'src/content/changelogs', path.dirname(filePath), 'changelog.mdx'), 'utf-8')
        ).resolves.toContain('UPDATE TEST')
      );
    });

    test('when a changelog is deleted, it deletes the corresponding changelog from astro', async () => {
      const filePath = path.join(`events/PaymentAccepted/changelog.md`);

      // Arrange
      await mkdir(path.dirname(path.join(PROJECT_DIR, filePath)));
      await fs.writeFile(path.join(PROJECT_DIR, filePath), `---${os.EOL}createdAt: 2024-07-11${os.EOL}---${os.EOL}`);
      await vi.waitUntil(
        () => existsSync(path.join(EC_CORE_DIR, 'src/content/changelogs', path.dirname(filePath), 'changelog.mdx')),
        { timeout: 3000 }
      );

      // Act
      await fs.rm(path.join(PROJECT_DIR, filePath));

      // Assert
      await vi.waitFor(() =>
        expect(
          fs.readFile(path.join(EC_CORE_DIR, 'src/content/changelogs', path.dirname(filePath), 'changelog.mdx'))
        ).rejects.toThrowError(/ENOENT: no such file or directory/)
      );
    });

    test('when a versioned changelog is created, it adds to the correct location in astro', async () => {
      const filePath = path.join(`events/PaymentAccepted/versioned/0.0.1/changelog.md`);

      // Arrange
      await mkdir(path.dirname(path.join(PROJECT_DIR, filePath)));

      // Act
      await fs.writeFile(path.join(PROJECT_DIR, filePath), `---${os.EOL}createdAt: 2024-07-11${os.EOL}---${os.EOL}`);

      // Assert
      await vi.waitFor(() =>
        expect(
          fs.readFile(path.join(EC_CORE_DIR, 'src/content/changelogs', path.dirname(filePath), 'changelog.mdx'), 'utf-8')
        ).resolves.toEqual(`---${os.EOL}createdAt: 2024-07-11${os.EOL}---${os.EOL}`)
      );
    });

    test('when a versioned changelog is updated, it updates the corresponding changelog in astro', async () => {
      const filePath = path.join(`events/PaymentAccepted/versioned/0.0.1/changelog.md`);

      // Arrange
      await mkdir(path.dirname(path.join(PROJECT_DIR, filePath)));
      await fs.writeFile(path.join(PROJECT_DIR, filePath), `---${os.EOL}createdAt: 2024-07-11${os.EOL}---${os.EOL}`);

      // Act
      await fs.appendFile(path.join(PROJECT_DIR, filePath), 'UPDATE TEST');

      // Assert
      await vi.waitFor(() =>
        expect(
          fs.readFile(path.join(EC_CORE_DIR, 'src/content/changelogs', path.dirname(filePath), 'changelog.mdx'), 'utf-8')
        ).resolves.toContain('UPDATE TEST')
      );
    });

    test('when a versioned changelog is deleted, it deletes the corresponding changelog from astro', async () => {
      const filePath = path.join(`events/PaymentAccepted/versioned/0.0.1/changelog.md`);

      // Arrange
      await mkdir(path.dirname(path.join(PROJECT_DIR, filePath)));
      await fs.writeFile(path.join(PROJECT_DIR, filePath), `---${os.EOL}createdAt: 2024-07-11${os.EOL}---${os.EOL}`);
      await vi.waitUntil(
        () => existsSync(path.join(EC_CORE_DIR, 'src/content/changelogs', path.dirname(filePath), 'changelog.mdx')),
        { timeout: 3000 }
      );

      // Act
      await fs.rm(path.join(PROJECT_DIR, filePath));

      // Assert
      await vi.waitFor(() =>
        expect(
          fs.readFile(path.join(EC_CORE_DIR, 'src/content/changelogs', path.dirname(filePath), 'changelog.mdx'))
        ).rejects.toThrowError(/ENOENT: no such file or directory/)
      );
    });
  });

  describe('Flows', () => {
    describe.each([{ dir: '/flows' }, { dir: '/services/flows' }, { dir: '/domains/flows' }])(
      'within $dir directory',
      ({ dir: dirPrefix }) => {
        test('when a flow is created, it adds it to the correct location in astro', async () => {
          const filePath = path.join(dirPrefix, `FakeFlow/index.md`);

          // Arrange
          await mkdir(path.dirname(path.join(PROJECT_DIR, filePath)));

          // Act
          await fs.writeFile(path.join(PROJECT_DIR, filePath), `---${os.EOL}id: FakeFlow${os.EOL}---${os.EOL}`);

          // Assert
          await vi.waitFor(() =>
            expect(
              fs.readFile(
                path.join(EC_CORE_DIR, 'src/content/flows/', path.dirname(path.relative(dirPrefix, filePath)), 'index.mdx'),
                'utf-8'
              )
            ).resolves.toEqual(`---${os.EOL}id: FakeFlow${os.EOL}---${os.EOL}`)
          );
        });

        test('when a flow is updated, it updates the corresponding flow in astro', async () => {
          const filePath = path.join(dirPrefix, `FakeFlow/index.md`);

          // Arrange
          await mkdir(path.dirname(path.join(PROJECT_DIR, filePath)));
          await fs.writeFile(path.join(PROJECT_DIR, filePath), `---${os.EOL}id: FakeFlow${os.EOL}---${os.EOL}`);

          // Act
          await fs.appendFile(path.join(PROJECT_DIR, filePath), 'UPDATE TEST');

          // Assert
          await vi.waitFor(() =>
            expect(
              fs.readFile(
                path.join(EC_CORE_DIR, 'src/content/flows/', path.dirname(path.relative(dirPrefix, filePath)), 'index.mdx'),
                'utf-8'
              )
            ).resolves.toContain('UPDATE TEST')
          );
        });

        test('when a flow is deleted, it deletes the corresponding flow from astro', async () => {
          const filePath = path.join(dirPrefix, `FakeFlow/index.md`);

          // Arrange
          await mkdir(path.dirname(path.join(PROJECT_DIR, filePath)));
          await fs.writeFile(path.join(PROJECT_DIR, filePath), `---${os.EOL}id: FakeFlow${os.EOL}---${os.EOL}`);
          await vi.waitUntil(
            () =>
              existsSync(
                path.join(EC_CORE_DIR, 'src/content/flows/', path.dirname(path.relative(dirPrefix, filePath)), 'index.mdx')
              ),
            {
              timeout: 3000,
            }
          );

          // Act
          await fs.rm(path.join(PROJECT_DIR, filePath));

          // Assert
          await vi.waitFor(() =>
            expect(
              fs.readFile(
                path.join(EC_CORE_DIR, 'src/content/flows/', path.dirname(path.relative(dirPrefix, filePath)), 'index.mdx')
              )
            ).rejects.toThrowError(/ENOENT: no such file or directory/)
          );
        });

        test('when a versioned flow is created, it adds it to the correct location in astro', async () => {
          const filePath = path.join(dirPrefix, `FakeFlow/versioned/0.0.1/index.md`);

          // Arrange
          await mkdir(path.dirname(path.join(PROJECT_DIR, filePath)));

          // Act
          await fs.writeFile(path.join(PROJECT_DIR, filePath), `---${os.EOL}id: FakeFlow${os.EOL}---${os.EOL}`);

          // Assert
          await vi.waitFor(() =>
            expect(
              fs.readFile(
                path.join(EC_CORE_DIR, 'src/content/flows/', path.dirname(path.relative(dirPrefix, filePath)), 'index.mdx'),
                'utf-8'
              )
            ).resolves.toEqual(`---${os.EOL}id: FakeFlow${os.EOL}---${os.EOL}`)
          );
        });

        test('when a versioned flow is updated, it updates the corresponding flow in astro', async () => {
          const filePath = path.join(dirPrefix, `FakeFlow/versioned/0.0.1/index.md`);

          // Arrange
          await mkdir(path.dirname(path.join(PROJECT_DIR, filePath)));
          await fs.writeFile(path.join(PROJECT_DIR, filePath), `---${os.EOL}id: FakeFlow${os.EOL}---${os.EOL}`);

          // Act
          await fs.appendFile(path.join(PROJECT_DIR, filePath), 'UPDATE TEST');

          // Assert
          await vi.waitFor(() =>
            expect(
              fs.readFile(
                path.join(EC_CORE_DIR, 'src/content/flows/', path.dirname(path.relative(dirPrefix, filePath)), 'index.mdx'),
                'utf-8'
              )
            ).resolves.toContain('UPDATE TEST')
          );
        });

        test('when a versioned flow is deleted, it deletes the corresponding flow from astro', async () => {
          const filePath = path.join(dirPrefix, `FakeFlow/versioned/0.0.1/index.md`);

          // Arrange
          await mkdir(path.dirname(path.join(PROJECT_DIR, filePath)));
          await fs.writeFile(path.join(PROJECT_DIR, filePath), `---${os.EOL}id: FakeFlow${os.EOL}---${os.EOL}`);
          await vi.waitUntil(
            () =>
              existsSync(
                path.join(EC_CORE_DIR, 'src/content/flows/', path.dirname(path.relative(dirPrefix, filePath)), 'index.mdx')
              ),
            {
              timeout: 3000,
            }
          );

          // Act
          await fs.rm(path.join(PROJECT_DIR, filePath));

          // Assert
          await vi.waitFor(() =>
            expect(
              fs.readFile(
                path.join(EC_CORE_DIR, 'src/content/flows/', path.dirname(path.relative(dirPrefix, filePath)), 'index.mdx')
              )
            ).rejects.toThrowError(/ENOENT: no such file or directory/)
          );
        });

        let prevDir: string = '';
        test.each(
          dirPrefix
            .split('/')
            .filter(Boolean)
            .map((dir) => (prevDir += '/' + dir))
        )('when the %s directory is deleted, it deletes the corresponding flows from astro', async (dirToDelete) => {
          const filePath = path.join(dirPrefix, `FakeFlow/index.md`);

          // Arrange
          await mkdir(path.dirname(path.join(PROJECT_DIR, filePath)));
          await fs.writeFile(path.join(PROJECT_DIR, filePath), `---${os.EOL}id: FakeFlow${os.EOL}---${os.EOL}`);
          await vi.waitUntil(
            () =>
              existsSync(
                path.join(EC_CORE_DIR, 'src/content/flows/', path.dirname(path.relative(dirPrefix, filePath)), 'index.mdx')
              ),
            {
              timeout: 3000,
            }
          );

          // Act
          await fs.rm(path.join(PROJECT_DIR, dirToDelete), { recursive: true });

          // Assert
          await vi.waitFor(() =>
            expect(
              fs.readFile(
                path.join(EC_CORE_DIR, 'src/content/flows/', path.dirname(path.relative(dirPrefix, filePath)), 'index.mdx')
              )
            ).rejects.toThrowError(/ENOENT: no such file or directory/)
          );
        });
      }
    );
  });

  describe('Pages', () => {
    test('when a page is created, it adds it to the correct location in astro', async () => {
      const filename = 'SomePage';
      const filePath = path.join(`pages/${filename}.md`);

      // Arrange
      await mkdir(path.dirname(path.join(PROJECT_DIR, filePath)));

      // Act
      await fs.writeFile(path.join(PROJECT_DIR, filePath), `---${os.EOL}id: index${os.EOL}---${os.EOL}`);

      // Assert
      await vi.waitFor(() =>
        expect(
          fs.readFile(path.join(EC_CORE_DIR, 'src/content', path.dirname(filePath), `${filename}.md`), 'utf-8')
        ).resolves.toEqual(`---${os.EOL}id: index${os.EOL}---${os.EOL}`)
      );
    });

    test('when a page is updated, it updates the corresponding page in astro', async () => {
      const filename = 'SomePage.md';
      const filePath = path.join('pages/', filename);

      // Arrange
      await mkdir(path.dirname(path.join(PROJECT_DIR, filePath)));
      await fs.writeFile(path.join(PROJECT_DIR, filePath), `---${os.EOL}id: index${os.EOL}---${os.EOL}`);

      // Act
      await fs.appendFile(path.join(PROJECT_DIR, filePath), 'update_test');

      // Assert
      await vi.waitFor(() =>
        expect(fs.readFile(path.join(EC_CORE_DIR, 'src/content', path.dirname(filePath), filename), 'utf-8')).resolves.toMatch(
          /update_test$/
        )
      );
    });

    test('when a page is deleted, it deletes the corresponding page from astro', async () => {
      const filename = 'SomePage.md';
      const filePath = path.join('pages/', filename);

      // Arrange
      await mkdir(path.dirname(path.join(PROJECT_DIR, filePath)));
      await fs.writeFile(path.join(PROJECT_DIR, filePath), `---${os.EOL}id: index${os.EOL}---${os.EOL}`);
      await vi.waitUntil(() => existsSync(path.join(EC_CORE_DIR, 'src/content', path.dirname(filePath), filename)), {
        timeout: 3000,
      });

      // Act
      await fs.rm(path.join(PROJECT_DIR, filePath));

      // Assert
      await vi.waitFor(() =>
        expect(fs.readFile(path.join(EC_CORE_DIR, 'src/content', path.dirname(filePath), filename))).rejects.toThrowError(
          /ENOENT: no such file or directory/
        )
      );
    });
  });

  describe('Custom components', () => {
    test('when a custom component is created, it adds it to the correct location in astro', async () => {
      const filename = 'SomeComponent.astro';
      const filePath = path.join(`components/${filename}`);

      // Arrange
      await mkdir(path.dirname(path.join(PROJECT_DIR, filePath)));

      // Act
      await fs.writeFile(path.join(PROJECT_DIR, filePath), `---${os.EOL}import config from '@config'${os.EOL}---${os.EOL}`);

      await vi.waitFor(() =>
        expect(fs.readFile(path.join(EC_CORE_DIR, 'src/custom-defined-components/', filename), 'utf-8')).resolves.toEqual(
          `---${os.EOL}import config from '@config'${os.EOL}---${os.EOL}`
        )
      );
    });

    test('when a custom component is updated, it updates the corresponding custom component in astro', async () => {
      const filename = 'SomeComponent.astro';
      const filePath = path.join('components/', filename);

      // Arrange
      await mkdir(path.dirname(path.join(PROJECT_DIR, filePath)));
      await fs.writeFile(path.join(PROJECT_DIR, filePath), `---${os.EOL}import config from '@config'${os.EOL}---${os.EOL}`);

      // Act
      await fs.appendFile(path.join(PROJECT_DIR, filePath), '<p>Hello from EC Testing</p>');

      // Assert
      await vi.waitFor(() =>
        expect(fs.readFile(path.join(EC_CORE_DIR, 'src/custom-defined-components/', filename), 'utf-8')).resolves.toMatch(
          /<p>Hello from EC Testing<\/p>$/
        )
      );
    });

    test('when a custom component is deleted, it deletes the corresponding custom component from astro', async () => {
      const filename = 'SomeComponent.astro';
      const filePath = path.join('components/', filename);

      // Arrange
      await mkdir(path.dirname(path.join(PROJECT_DIR, filePath)));
      await fs.writeFile(path.join(PROJECT_DIR, filePath), `---${os.EOL}import config from '@config'${os.EOL}---${os.EOL}`);
      await vi.waitUntil(() => existsSync(path.join(EC_CORE_DIR, 'src/custom-defined-components', filename)), {
        timeout: 3000,
      });

      // Act
      await fs.rm(path.join(PROJECT_DIR, filePath));

      // Assert
      await vi.waitFor(() =>
        expect(fs.readFile(path.join(EC_CORE_DIR, 'src/custom-defined-components', filename), 'utf-8')).rejects.toThrowError(
          /ENOENT: no such file or directory/
        )
      );
    });
  });

  describe('Public assets', () => {
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

    test('when a public asset is created, it adds it to the correct location in astro', async () => {
      const filename = 'logo.svg';

      // Arrange
      await mkdir(path.join(PROJECT_DIR, 'public'));

      // Act
      await fs.writeFile(path.join(PROJECT_DIR, 'public/', filename), logoSvg);

      await vi.waitFor(() => expect(fs.readFile(path.join(EC_CORE_DIR, 'public/', filename), 'utf-8')).resolves.toEqual(logoSvg));
    });

    test('when a public asset is updated, it updates the corresponding public asset in astro', async () => {
      const filename = 'logo.svg';
      const filePath = path.join('public/', filename);

      // Arrange
      await mkdir(path.join(PROJECT_DIR, 'public'));
      await fs.writeFile(path.join(PROJECT_DIR, filePath), logoSvg);

      // Act
      await fs.appendFile(path.join(PROJECT_DIR, filePath), 'UPDATE_TEST');

      // Assert
      await vi.waitFor(() => expect(fs.readFile(path.join(EC_CORE_DIR, filePath), 'utf-8')).resolves.toMatch(/UPDATE_TEST$/));
    });

    test('when a public asset is deleted, it deletes the corresponding public asset from astro', async () => {
      const filename = 'logo.svg';
      const filePath = path.join('public/', filename);

      // Arrange
      await mkdir(path.join(PROJECT_DIR, 'public'));
      await fs.writeFile(path.join(PROJECT_DIR, filePath), logoSvg);
      await vi.waitUntil(() => existsSync(path.join(EC_CORE_DIR, filePath)), { timeout: 3000 });

      // Act
      await fs.rm(path.join(PROJECT_DIR, filePath));

      // Assert
      await vi.waitFor(() =>
        expect(fs.readFile(path.join(EC_CORE_DIR, filePath))).rejects.toThrowError(/ENOENT: no such file or directory/)
      );
    });
  });

  describe('Config file', () => {
    test('when the config file is created, it adds it to the correct location in astro', async () => {
      const filePath = path.join('eventcatalog.config.js');

      // Act
      await fs.writeFile(path.join(PROJECT_DIR, filePath), 'export default {}');

      // Assert
      await vi.waitFor(() =>
        expect(fs.readFile(path.join(EC_CORE_DIR, filePath), 'utf-8')).resolves.toEqual('export default {}')
      );
    });

    test('when the config file is updated, it updates the config file in astro', async () => {
      const filePath = path.join('eventcatalog.config.js');

      // Arrange
      await fs.writeFile(path.join(PROJECT_DIR, filePath), 'export default {}');

      // Act
      const uuid = randomUUID();
      await fs.writeFile(path.join(PROJECT_DIR, filePath), `export default { cId: "${uuid}" }`);

      // Assert
      await vi.waitFor(() =>
        expect(fs.readFile(path.join(EC_CORE_DIR, filePath), 'utf-8')).resolves.toBe(`export default { cId: "${uuid}" }`)
      );
    });

    test('when the config file is deleted, it deletes the config file from astro', async () => {
      const filePath = path.join('eventcatalog.config.js');

      // Arrange
      await fs.writeFile(path.join(PROJECT_DIR, filePath), 'export default {}');
      await vi.waitUntil(() => existsSync(path.join(EC_CORE_DIR, filePath)), { timeout: 3000 });

      // Act
      await fs.rm(path.join(PROJECT_DIR, filePath));

      // Assert
      await vi.waitFor(() =>
        expect(fs.readFile(path.join(EC_CORE_DIR, filePath))).rejects.toThrow(/ENOENT: no such file or directory/)
      );
    });
  });

  describe('Custom css', () => {
    test('when the custom css file is created, it adds it to the correct location in astro', async () => {
      const filePath = path.join('eventcatalog.styles.css');

      // Act
      await fs.writeFile(path.join(PROJECT_DIR, filePath), '.ec-homepage{background:black}');

      // Assert
      await vi.waitFor(() =>
        expect(fs.readFile(path.join(EC_CORE_DIR, filePath), 'utf-8')).resolves.toEqual('.ec-homepage{background:black}')
      );
    });

    test('when the custom css is updated, it updates the custom css file in astro', async () => {
      const filePath = path.join('eventcatalog.styles.css');

      // Arrange
      await fs.writeFile(path.join(PROJECT_DIR, filePath), '.ec-homepage{background:black}');

      // Act
      await fs.writeFile(path.join(PROJECT_DIR, filePath), '.ec-homepage{background:yellow}');

      // Assert
      await vi.waitFor(() =>
        expect(fs.readFile(path.join(EC_CORE_DIR, filePath), 'utf-8')).resolves.toBe('.ec-homepage{background:yellow}')
      );
    });

    test('when the custom css file is deleted, it deletes the custom css file from astro', async () => {
      const filePath = path.join('eventcatalog.styles.css');

      // Arrange
      await fs.writeFile(path.join(PROJECT_DIR, filePath), '.ec-homepage{background:black}');
      await vi.waitUntil(() => existsSync(path.join(EC_CORE_DIR, filePath)), { timeout: 3000 });

      // Act
      await fs.rm(path.join(PROJECT_DIR, filePath));

      // Assert
      await vi.waitFor(() =>
        expect(fs.readFile(path.join(EC_CORE_DIR, filePath))).rejects.toThrow(/ENOENT: no such file or directory/)
      );
    });
  });
});

async function prepareProjectDir(projectDir: string, ecCoreDir: string) {
  await fs.mkdir(ecCoreDir, { recursive: true });
}

/**
 * This is a workaround to create path by path.
 *
 * For example: To create a file in the eventcatalog directory
 * `commands/FakeCommand/versioned/0.0.1/index.md` using `fs.mkdir(<file-dirname>, { recursive: true })`
 * for some unknown reason `@parcel/watcher` emit only one event for the first directory created.
 * Creating one by one, the `@parcel/watcher` emits all created directories, which is the same behavior
 * when an user create a deeply nested file inside the eventcatalog structure.
 *
 * @param fullDirname The full dirname
 */
async function mkdir(fullDirname: string) {
  const pathArr = path.normalize(fullDirname).split(path.sep);

  let currentPath = pathArr[0] === '' ? path.sep : pathArr[0];

  for (let i = 1; i < pathArr.length; i++) {
    currentPath = path.join(currentPath, pathArr[i]);

    try {
      await fs.mkdir(currentPath);
    } catch (err) {
      if ((err as { code: string })?.code === 'EEXIST') {
        // fail silently
      } else throw err;
    }
  }
}
