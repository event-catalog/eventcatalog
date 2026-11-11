import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { getLastUpdated, getResourceFileLastUpdated, getResourceFiles } from '../last-updated';

const PAGE_COMMIT = 1_600_000_000;
const SCHEMA_COMMIT = 1_700_000_000;
const CHILD_COMMIT = 1_750_000_000;

const git = (cwd: string, args: string[], time = PAGE_COMMIT) =>
  execFileSync('git', args, {
    cwd,
    stdio: 'pipe',
    env: {
      ...process.env,
      GIT_CONFIG_GLOBAL: '/dev/null',
      GIT_CONFIG_NOSYSTEM: '1',
      GIT_AUTHOR_NAME: 'Fake Author',
      GIT_AUTHOR_EMAIL: 'fake@example.com',
      GIT_COMMITTER_NAME: 'Fake Author',
      GIT_COMMITTER_EMAIL: 'fake@example.com',
      GIT_AUTHOR_DATE: `@${time} +0000`,
      GIT_COMMITTER_DATE: `@${time} +0000`,
    },
  });

const commitFile = (root: string, file: string, content: string, time: number) => {
  fs.mkdirSync(path.dirname(path.join(root, file)), { recursive: true });
  fs.writeFileSync(path.join(root, file), content);
  git(root, ['add', '--', file]);
  git(root, ['commit', '-q', '-m', `update ${file}`], time);
};

describe('last updated', { timeout: 20_000 }, () => {
  const originalCwd = process.cwd();
  let tempDir: string;
  let repo: string;

  beforeEach(() => {
    tempDir = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'eventcatalog-last-updated-')));
    repo = path.join(tempDir, 'repo');
    fs.mkdirSync(repo);
    git(repo, ['init', '-q']);
    commitFile(repo, 'domains/Orders/index.mdx', 'domain', PAGE_COMMIT);
    commitFile(repo, 'domains/Orders/events/OrderPlaced/index.mdx', 'event', PAGE_COMMIT);
    commitFile(repo, 'domains/Orders/events/OrderPlaced/schema.json', '{}', SCHEMA_COMMIT);
    // A change to something inside the domain's folder, but not the domain itself
    commitFile(repo, 'domains/Orders/services/Checkout/index.mdx', 'service', CHILD_COMMIT);
    process.chdir(repo);
    vi.stubEnv('PROJECT_DIR', repo);
    vi.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    process.chdir(originalCwd);
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  describe('getResourceFiles', () => {
    it("is the resource's page, schema, specifications and changelog, skipping remote ones", () => {
      const files = getResourceFiles({
        filePath: 'domains/Orders/events/OrderPlaced/index.mdx',
        data: {
          schemaPath: 'schema.json',
          specifications: [
            { type: 'asyncapi', path: 'asyncapi.yml' },
            { type: 'openapi', path: 'https://example.com/openapi.yml' },
          ],
        },
      });

      const folder = path.join(repo, 'domains/Orders/events/OrderPlaced');
      expect(files).toEqual([
        path.join(folder, 'index.mdx'),
        path.join(folder, 'schema.json'),
        path.join(folder, 'asyncapi.yml'),
        path.join(folder, 'changelog.mdx'),
      ]);
    });

    it('is nothing for an entry without a file', () => {
      expect(getResourceFiles({ data: {} })).toEqual([]);
    });
  });

  describe('getLastUpdated', () => {
    it('is the newest commit to any of the resource files: a schema change updates the resource', () => {
      const date = getLastUpdated({
        filePath: 'domains/Orders/events/OrderPlaced/index.mdx',
        data: { schemaPath: 'schema.json' },
      });

      expect(date).toEqual(new Date(SCHEMA_COMMIT * 1000));
    });

    it('leaves the schema out with schemas: false, for where it is listed on its own', () => {
      const date = getLastUpdated(
        { filePath: 'domains/Orders/events/OrderPlaced/index.mdx', data: { schemaPath: 'schema.json' } },
        { schemas: false }
      );

      expect(date).toEqual(new Date(PAGE_COMMIT * 1000));
    });

    it("doesn't count changes to other resources in its folder", () => {
      const date = getLastUpdated({ filePath: 'domains/Orders/index.mdx', data: {} });

      expect(date).toEqual(new Date(PAGE_COMMIT * 1000));
    });

    it('is undefined in a shallow clone, where every file looks updated by its newest commit', () => {
      const shallow = path.join(tempDir, 'shallow');
      git(tempDir, ['clone', '-q', '--depth', '1', `file://${repo}`, shallow]);
      process.chdir(shallow);
      vi.stubEnv('PROJECT_DIR', shallow);

      expect(getLastUpdated({ filePath: 'domains/Orders/index.mdx', data: {} })).toBeUndefined();
      expect(console.warn).toHaveBeenCalledWith(expect.stringContaining('shallow git clone'));
    });

    it('is undefined outside a git repository, e.g. a catalog copied into a Docker image', () => {
      const copy = path.join(tempDir, 'copy');
      fs.cpSync(path.join(repo, 'domains'), path.join(copy, 'domains'), { recursive: true });
      process.chdir(copy);
      vi.stubEnv('PROJECT_DIR', copy);

      expect(getLastUpdated({ filePath: 'domains/Orders/index.mdx', data: {} })).toBeUndefined();
    });

    it("is undefined for a resource that isn't committed, rather than the file's date", () => {
      fs.mkdirSync(path.join(repo, 'domains/Payments'), { recursive: true });
      fs.writeFileSync(path.join(repo, 'domains/Payments/index.mdx'), 'new');

      expect(getLastUpdated({ filePath: 'domains/Payments/index.mdx', data: {} })).toBeUndefined();
    });
  });

  describe('getResourceFileLastUpdated', () => {
    it("is when one of the resource's files was last committed", () => {
      const date = getResourceFileLastUpdated({ filePath: 'domains/Orders/events/OrderPlaced/index.mdx' }, 'schema.json');

      expect(date).toEqual(new Date(SCHEMA_COMMIT * 1000));
    });

    it('is undefined for a remote file', () => {
      expect(
        getResourceFileLastUpdated({ filePath: 'domains/Orders/events/OrderPlaced/index.mdx' }, 'https://example.com/openapi.yml')
      ).toBeUndefined();
    });
  });
});
