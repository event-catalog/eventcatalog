import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { getGitHistory } from '../git';

const FIRST_COMMIT = 1_600_000_000;
const SECOND_COMMIT = 1_700_000_000;
const THIRD_COMMIT = 1_750_000_000;

const git = (cwd: string, args: string[], { author = 'Fake Author One', time = FIRST_COMMIT } = {}) =>
  execFileSync('git', args, {
    cwd,
    stdio: 'pipe',
    env: {
      ...process.env,
      GIT_CONFIG_GLOBAL: '/dev/null',
      GIT_CONFIG_NOSYSTEM: '1',
      GIT_AUTHOR_NAME: author,
      GIT_AUTHOR_EMAIL: 'fake@example.com',
      GIT_COMMITTER_NAME: author,
      GIT_COMMITTER_EMAIL: 'fake@example.com',
      GIT_AUTHOR_DATE: `@${time} +0000`,
      GIT_COMMITTER_DATE: `@${time} +0000`,
    },
  });

const writeFile = (root: string, file: string, content: string) => {
  fs.mkdirSync(path.dirname(path.join(root, file)), { recursive: true });
  fs.writeFileSync(path.join(root, file), content);
};

const commitFile = (root: string, file: string, content: string, options: { author?: string; time?: number } = {}) => {
  writeFile(root, file, content);
  git(root, ['add', '--', file]);
  git(root, ['commit', '-q', '-m', `update ${file}`], options);
};

describe('getGitHistory', { timeout: 20_000 }, () => {
  const originalCwd = process.cwd();
  let tempDir: string;
  let repo: string;

  beforeEach(() => {
    tempDir = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'eventcatalog-git-')));
    repo = path.join(tempDir, 'repo');
    fs.mkdirSync(repo);
    git(repo, ['init', '-q']);
    commitFile(repo, 'catalog/events/OrderPlaced/index.mdx', 'v1');
    commitFile(repo, 'catalog/events/OrderPlaced/index.mdx', 'v2', { author: 'Fake Author Two', time: SECOND_COMMIT });
    commitFile(repo, 'catalog/services/Orders/index.mdx', 'v1');
    process.chdir(repo);
  });

  afterEach(() => {
    process.chdir(originalCwd);
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  describe('newest', () => {
    it('returns the most recent commit that changed the file', () => {
      const history = getGitHistory('catalog/events/OrderPlaced/index.mdx', { age: 'newest' });

      expect(history).toEqual({
        timestamp: SECOND_COMMIT * 1000,
        date: new Date(SECOND_COMMIT * 1000),
        author: 'Fake Author Two',
      });
    });

    it('omits the author when includeAuthor is false', () => {
      const history = getGitHistory('catalog/events/OrderPlaced/index.mdx', { age: 'newest', includeAuthor: false });

      expect(history.author).toBeUndefined();
      expect(history.timestamp).toBe(SECOND_COMMIT * 1000);
    });

    it('reads every file from one walk of the history, so a later commit is not seen by the same build', () => {
      getGitHistory('catalog/events/OrderPlaced/index.mdx', { age: 'newest' });
      commitFile(repo, 'catalog/services/Orders/index.mdx', 'v2', { author: 'Fake Author Two', time: THIRD_COMMIT });

      const history = getGitHistory('catalog/services/Orders/index.mdx', { age: 'newest' });

      expect(history.timestamp).toBe(FIRST_COMMIT * 1000);
      expect(history.author).toBe('Fake Author One');
    });

    it('falls back to reading the file on its own when it is missing from the walk', () => {
      getGitHistory('catalog/events/OrderPlaced/index.mdx', { age: 'newest' });
      commitFile(repo, 'catalog/events/OrderShipped/index.mdx', 'v1', { author: 'Fake Author Two', time: THIRD_COMMIT });

      const history = getGitHistory('catalog/events/OrderShipped/index.mdx', { age: 'newest' });

      expect(history.timestamp).toBe(THIRD_COMMIT * 1000);
      expect(history.author).toBe('Fake Author Two');
    });

    it('throws when the file has never been committed', () => {
      writeFile(repo, 'catalog/events/Draft/index.mdx', 'draft');

      expect(() => getGitHistory('catalog/events/Draft/index.mdx', { age: 'newest' })).toThrow();
    });

    it('treats a renamed file as changed by the rename commit', () => {
      git(repo, ['mv', 'catalog/services/Orders/index.mdx', 'catalog/services/Orders/renamed.mdx']);
      git(repo, ['commit', '-q', '-m', 'rename'], { author: 'Fake Author Two', time: THIRD_COMMIT });

      const history = getGitHistory('catalog/services/Orders/renamed.mdx', { age: 'newest' });

      expect(history.timestamp).toBe(THIRD_COMMIT * 1000);
      expect(history.author).toBe('Fake Author Two');
    });

    it('treats file names with spaces and shell characters as plain paths', () => {
      commitFile(repo, 'catalog/events/Odd $(name) "quoted"/index.mdx', 'v1', { time: THIRD_COMMIT });

      const history = getGitHistory('catalog/events/Odd $(name) "quoted"/index.mdx', { age: 'newest' });

      expect(history.timestamp).toBe(THIRD_COMMIT * 1000);
    });
  });

  describe('oldest', () => {
    it('returns the commit that added the file', () => {
      const history = getGitHistory('catalog/events/OrderPlaced/index.mdx', { age: 'oldest' });

      expect(history.timestamp).toBe(FIRST_COMMIT * 1000);
      expect(history.author).toBe('Fake Author One');
    });

    it('follows the file back through a rename', () => {
      git(repo, ['mv', 'catalog/services/Orders/index.mdx', 'catalog/services/Orders/renamed.mdx']);
      git(repo, ['commit', '-q', '-m', 'rename'], { author: 'Fake Author Two', time: THIRD_COMMIT });

      const history = getGitHistory('catalog/services/Orders/renamed.mdx', { age: 'oldest' });

      expect(history.timestamp).toBe(FIRST_COMMIT * 1000);
      expect(history.author).toBe('Fake Author One');
    });
  });

  describe('when the catalog is a subdirectory of the git repository', () => {
    beforeEach(() => {
      fs.mkdirSync(path.join(repo, 'catalog/.astro/eventcatalog'), { recursive: true });
    });

    it('resolves paths relative to the catalog directory', () => {
      process.chdir(path.join(repo, 'catalog'));

      expect(getGitHistory('events/OrderPlaced/index.mdx', { age: 'newest' }).timestamp).toBe(SECOND_COMMIT * 1000);
      expect(getGitHistory('events/OrderPlaced/index.mdx', { age: 'oldest' }).timestamp).toBe(FIRST_COMMIT * 1000);
    });

    it('resolves paths relative to a nested runtime directory', () => {
      process.chdir(path.join(repo, 'catalog/.astro/eventcatalog'));

      const history = getGitHistory('../../events/OrderPlaced/index.mdx', { age: 'newest' });

      expect(history.timestamp).toBe(SECOND_COMMIT * 1000);
    });

    it('resolves absolute paths', () => {
      process.chdir(path.join(repo, 'catalog'));

      const history = getGitHistory(path.join(repo, 'catalog/services/Orders/index.mdx'), { age: 'newest' });

      expect(history.timestamp).toBe(FIRST_COMMIT * 1000);
    });
  });

  describe('when the directory is not a git repository', () => {
    it('throws, so the caller can fall back to the file system', () => {
      const plain = path.join(tempDir, 'plain');
      writeFile(plain, 'events/OrderPlaced/index.mdx', 'v1');
      process.chdir(plain);

      expect(() => getGitHistory('events/OrderPlaced/index.mdx', { age: 'newest' })).toThrow();
      expect(() => getGitHistory('events/OrderPlaced/index.mdx', { age: 'oldest' })).toThrow();
    });
  });
});
