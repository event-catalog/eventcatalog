import fs from 'node:fs/promises';
import path from 'node:path';

type PublicPathSnapshot =
  | { destinationPath: string; state: 'missing' }
  | { backupPath: string; destinationPath: string; state: 'file' };

const getSafePublicPath = (publicDirectory: string, relativePath: string) => {
  const normalizedPath = path.posix.normalize(relativePath);
  const unsafe =
    relativePath.length === 0 ||
    relativePath.includes('\0') ||
    relativePath.includes('\\') ||
    path.posix.isAbsolute(relativePath) ||
    /^[a-zA-Z]:\//.test(relativePath) ||
    normalizedPath !== relativePath ||
    normalizedPath === '..' ||
    normalizedPath.startsWith('../');

  if (unsafe) return undefined;

  const destinationPath = path.resolve(publicDirectory, relativePath);
  const relativeDestinationPath = path.relative(publicDirectory, destinationPath);
  return relativeDestinationPath !== '' &&
    relativeDestinationPath !== '..' &&
    !relativeDestinationPath.startsWith(`..${path.sep}`) &&
    !path.isAbsolute(relativeDestinationPath)
    ? destinationPath
    : undefined;
};

const beginFederationOutputTransaction = async (
  projectDirectory: string,
  outDir: string,
  relativePublicPaths: Iterable<string>
) => {
  const transactionDirectory = await fs.mkdtemp(path.join(projectDirectory, '.eventcatalog-federation-transaction-'));
  const previousOutDir = path.join(transactionDirectory, 'federated');
  const publicBackupDirectory = path.join(transactionDirectory, 'public');
  const publicDirectory = path.resolve(projectDirectory, 'public');
  const publicSnapshots: PublicPathSnapshot[] = [];
  const missingPublicDirectories = new Set<string>();
  let hadPreviousOutDir = false;

  try {
    for (const relativePath of new Set(relativePublicPaths)) {
      const destinationPath = getSafePublicPath(publicDirectory, relativePath);
      if (!destinationPath) continue;

      try {
        const stat = await fs.lstat(destinationPath);
        if (!stat.isFile()) continue;

        const backupPath = path.join(publicBackupDirectory, `${publicSnapshots.length}`);
        await fs.mkdir(path.dirname(backupPath), { recursive: true });
        await fs.copyFile(destinationPath, backupPath);
        publicSnapshots.push({ backupPath, destinationPath, state: 'file' });
      } catch (error) {
        const code = (error as NodeJS.ErrnoException).code;
        if (code === 'ENOTDIR') continue;
        if (code !== 'ENOENT') throw error;

        publicSnapshots.push({ destinationPath, state: 'missing' });
        let directory = path.dirname(destinationPath);
        while (directory !== publicDirectory) {
          try {
            await fs.lstat(directory);
            break;
          } catch (directoryError) {
            const directoryCode = (directoryError as NodeJS.ErrnoException).code;
            if (directoryCode === 'ENOTDIR') break;
            if (directoryCode !== 'ENOENT') throw directoryError;
            missingPublicDirectories.add(directory);
            directory = path.dirname(directory);
          }
        }
      }
    }

    try {
      await fs.rename(outDir, previousOutDir);
      hadPreviousOutDir = true;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
    }
  } catch (error) {
    await fs.rm(transactionDirectory, { recursive: true, force: true });
    throw error;
  }

  return {
    commit: async () => {
      // The new output and lock are already installed. A failed backup cleanup must not turn a successful run into a rollback.
      await fs.rm(transactionDirectory, { recursive: true, force: true }).catch(() => undefined);
    },
    rollback: async () => {
      const rollbackErrors: unknown[] = [];
      const attempt = async (operation: () => Promise<unknown>) => {
        try {
          await operation();
        } catch (error) {
          rollbackErrors.push(error);
        }
      };

      await attempt(() => fs.rm(outDir, { recursive: true, force: true }));
      if (hadPreviousOutDir) await attempt(() => fs.rename(previousOutDir, outDir));

      for (const snapshot of publicSnapshots) {
        if (snapshot.state === 'missing') {
          await attempt(() => fs.rm(snapshot.destinationPath, { force: true }));
          continue;
        }

        await attempt(async () => {
          await fs.mkdir(path.dirname(snapshot.destinationPath), { recursive: true });
          await fs.copyFile(snapshot.backupPath, snapshot.destinationPath);
        });
      }

      for (const directory of [...missingPublicDirectories].sort((left, right) => right.length - left.length)) {
        await attempt(async () => {
          try {
            await fs.rmdir(directory);
          } catch (error) {
            if (!['ENOENT', 'ENOTEMPTY'].includes((error as NodeJS.ErrnoException).code ?? '')) throw error;
          }
        });
      }

      await attempt(() => fs.rm(transactionDirectory, { recursive: true, force: true }));
      if (rollbackErrors.length > 0) throw new AggregateError(rollbackErrors, 'Failed to restore the previous federation output');
    },
  };
};

export const withFederationOutputTransaction = async <Result>(
  projectDirectory: string,
  outDir: string,
  relativePublicPaths: Iterable<string>,
  update: () => Promise<Result>
) => {
  const transaction = await beginFederationOutputTransaction(projectDirectory, outDir, relativePublicPaths);

  try {
    const result = await update();
    await transaction.commit();
    return result;
  } catch (error) {
    try {
      await transaction.rollback();
    } catch (rollbackError) {
      throw new AggregateError([error, rollbackError], 'Federation failed and the previous output could not be restored');
    }
    throw error;
  }
};
