import shell from 'shelljs';

export function hasGit() {
  return !!shell.which('git');
}

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

  const resultFormat = includeAuthor ? 'RESULT:%ct,%an' : 'RESULT:%ct';

  const args = [`--format=${resultFormat}`, '--max-count=1', age === 'oldest' ? '--follow --diff-filter=A' : undefined]
    .filter(Boolean)
    .join(' ');

  const command = `git -c log.showSignature=false log ${args} -- "${filePath}"`;

  const result = shell.exec(command, { silent: true });

  const regex = includeAuthor
    ? /(?:^|\n)RESULT:(?<timestamp>\d+),(?<author>.+)(?:$|\n)/
    : /(?:^|\n)RESULT:(?<timestamp>\d+)(?:$|\n)/;

  const output = result.stdout.trim();

  const match = output.match(regex);

  if (!match) {
    throw new Error(`Failed to retrieve the git history for file "${filePath}" with unexpected output: ${output}`);
  }

  const timestampInSeconds = Number(match.groups?.timestamp);
  const timestamp = timestampInSeconds * 1_000;
  const date = new Date(timestamp);
  const author = match.groups?.author;

  return {
    timestamp,
    date,
    author,
  };
}
