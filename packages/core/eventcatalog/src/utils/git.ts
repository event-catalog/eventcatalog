import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import shell from 'shelljs';

type Commit = { timestamp: number; author: string };

const COMMIT_MARKER = '\x1e';

const newestCommitsByRepository = new Map<string, Map<string, Commit> | undefined>();

export function hasGit() {
  return !!shell.which('git');
}

const runGit = (args: string[]) => {
  try {
    return execFileSync('git', ['-c', 'log.showSignature=false', ...args], {
      encoding: 'utf8',
      maxBuffer: 1024 * 1024 * 1024,
      stdio: ['ignore', 'pipe', 'ignore'],
    });
  } catch {
    return undefined;
  }
};

const parseCommit = (header: string): Commit => {
  const [timestamp, ...author] = header.split(',');
  return { timestamp: Number(timestamp) * 1_000, author: author.join(',') };
};

// --no-renames and combined merge diffs list the same commits for a path as a per-file `git log -- <file>`.
const readNewestCommits = (): Map<string, Commit> | undefined => {
  const root = runGit(['rev-parse', '--show-toplevel'])?.trim();
  if (!root) return undefined;

  const output =
    runGit(['log', `--format=${COMMIT_MARKER}%ct,%an`, '--name-only', '--no-renames', '--diff-merges=combined', '-z']) ?? '';

  const realRoot = fs.realpathSync(root);
  const commits = new Map<string, Commit>();
  let current: Commit | undefined;
  for (const token of output.split('\0')) {
    const entry = token.startsWith('\n') ? token.slice(1) : token;
    if (entry.startsWith(COMMIT_MARKER)) {
      current = parseCommit(entry.slice(COMMIT_MARKER.length));
    } else if (entry && current) {
      const file = path.join(realRoot, entry);
      if (!commits.has(file)) commits.set(file, current);
    }
  }
  return commits;
};

const getNewestCommits = () => {
  const cwd = process.cwd();
  if (!newestCommitsByRepository.has(cwd)) {
    newestCommitsByRepository.set(cwd, readNewestCommits());
  }
  return newestCommitsByRepository.get(cwd);
};

const toRealPath = (filePath: string) => {
  const absolutePath = path.resolve(filePath);
  try {
    return path.join(fs.realpathSync(path.dirname(absolutePath)), path.basename(absolutePath));
  } catch {
    return absolutePath;
  }
};

const readCommit = (filePath: string, age: 'newest' | 'oldest'): Commit => {
  const followArgs = age === 'oldest' ? ['--follow', '--diff-filter=A'] : [];
  const output = runGit(['log', '--format=RESULT:%ct,%an', '--max-count=1', ...followArgs, '--', filePath])?.trim() ?? '';

  const match = output.match(/(?:^|\n)RESULT:(?<header>\d+,.*)(?:$|\n)/);
  if (!match?.groups) {
    throw new Error(`Failed to retrieve the git history for file "${filePath}" with unexpected output: ${output}`);
  }
  return parseCommit(match.groups.header);
};

export function getGitHistory(
  filePath: string,
  {
    includeAuthor = true,
    age = 'newest',
  }: {
    includeAuthor?: boolean;
    age?: 'newest' | 'oldest';
    maxCount?: number;
  }
): {
  timestamp: number;
  date: Date;
  author: string | undefined;
} {
  if (!hasGit()) {
    throw new Error('Git is not installed');
  }

  let commit: Commit | undefined;
  if (age === 'newest') {
    const newestCommits = getNewestCommits();
    if (!newestCommits) {
      throw new Error(`Failed to retrieve the git history for file "${filePath}": not a git repository`);
    }
    commit = newestCommits.get(toRealPath(filePath));
  }
  commit ??= readCommit(filePath, age);

  return {
    timestamp: commit.timestamp,
    date: new Date(commit.timestamp),
    author: includeAuthor ? commit.author : undefined,
  };
}
