import { getLastCommitDate, hasGit, isGitRepository, isShallowRepository } from '@utils/git';
import { getAbsoluteFilePathForAstroFile } from '@utils/files';
import { processSpecifications } from '@utils/collections/util';

/** The fields of a collection entry that say which files make up the resource */
export type LastUpdatedEntry = {
  filePath?: string;
  data: {
    schemaPath?: string;
    specifications?: Parameters<typeof processSpecifications>[0];
  };
};

const isRemote = (file: string) => /^[a-z]+:\/\//i.test(file);

/**
 * The files that make up a resource, as absolute paths: its page, its schema, its specifications and its changelog.
 * Not the rest of its folder: a domain's folder holds its services, and their changes aren't the domain's.
 */
export const getResourceFiles = (entry: LastUpdatedEntry, { schemas = true }: { schemas?: boolean } = {}): string[] => {
  if (!entry.filePath) return [];
  const related = [
    ...(schemas
      ? [entry.data.schemaPath, ...processSpecifications(entry.data.specifications).map((specification) => specification.path)]
      : []),
    // Beside the page, for the latest version and for each version in `versioned/`
    'changelog.mdx',
  ].filter((file): file is string => Boolean(file) && !isRemote(file as string));

  return [
    getAbsoluteFilePathForAstroFile(entry.filePath),
    ...related.map((file) => getAbsoluteFilePathForAstroFile(entry.filePath as string, file)),
  ];
};

// Why git's history can't give dates here, if it can't
const getHistoryProblem = () => {
  if (!hasGit()) return 'git is not available';
  if (!isGitRepository()) return 'the catalog is not in a git repository';
  if (isShallowRepository()) {
    // Its oldest commit lists every file as added, so every page would look updated that day
    return (
      'this is a shallow git clone, where every file looks updated by its newest commit. Build from a full clone ' +
      '(in GitHub Actions, set fetch-depth: 0 on actions/checkout; on Vercel, set VERCEL_DEEP_CLONE=true)'
    );
  }
  return undefined;
};

let warned = false;

/** Whether git's history can give dates: without it, no dates rather than wrong ones (and one warning a build, saying why) */
const canReadHistory = () => {
  const problem = getHistoryProblem();
  if (problem && !warned) {
    warned = true;
    console.warn(`[EventCatalog] lastUpdated is on, but ${problem}. Pages show no last updated date.`);
  }
  return !problem;
};

/** When one file was last committed (an absolute path), e.g. a schema. Undefined without git history for it */
export const getFileLastUpdated = (file: string): Date | undefined => (canReadHistory() ? getLastCommitDate(file) : undefined);

/**
 * When one of a resource's files was last committed, by its path relative to the resource (e.g. a specification's
 * `openapi.yml`). Undefined for remote files, or without git history for it.
 */
export const getResourceFileLastUpdated = (entry: Pick<LastUpdatedEntry, 'filePath'>, relativePath: string) =>
  entry.filePath && !isRemote(relativePath)
    ? getFileLastUpdated(getAbsoluteFilePathForAstroFile(entry.filePath, relativePath))
    : undefined;

/**
 * When a resource last changed: the newest commit to any of its files (its page, schema, specifications or changelog;
 * `schemas: false` leaves its schema and specifications out, e.g. where they're listed on their own).
 * Undefined without git history for them, e.g. no git, or files that aren't committed yet: no date rather than a wrong one.
 */
export const getLastUpdated = (entry: LastUpdatedEntry, options: { schemas?: boolean } = {}): Date | undefined => {
  if (!canReadHistory()) return undefined;
  const timestamps = getResourceFiles(entry, options)
    .map((file) => getLastCommitDate(file)?.getTime())
    .filter((timestamp): timestamp is number => timestamp !== undefined);
  return timestamps.length > 0 ? new Date(Math.max(...timestamps)) : undefined;
};
