import fs from 'fs';
import path from 'node:path';

const isDirectory = (directory: string) => {
  try {
    return fs.statSync(directory).isDirectory();
  } catch (error) {
    return false;
  }
};

const hasAstroDependency = (nodeModulesDirectory: string) => {
  const astroBin = process.platform === 'win32' ? 'astro.cmd' : 'astro';

  return (
    fs.existsSync(path.join(nodeModulesDirectory, 'astro', 'package.json')) ||
    fs.existsSync(path.join(nodeModulesDirectory, '.bin', astroBin))
  );
};

const isSymbolicLink = (targetPath: string) => {
  try {
    return fs.lstatSync(targetPath).isSymbolicLink();
  } catch (error) {
    return false;
  }
};

const isSameDirectory = (a: string, b: string) => {
  try {
    return fs.realpathSync.native(a) === fs.realpathSync.native(b);
  } catch (error) {
    return false;
  }
};

export const resolveInstalledCoreNodeModules = (currentDir: string) => {
  const candidates: string[] = [];
  const seen = new Set<string>();

  const addCandidate = (candidate: string) => {
    const resolvedCandidate = path.resolve(candidate);
    if (!seen.has(resolvedCandidate)) {
      candidates.push(resolvedCandidate);
      seen.add(resolvedCandidate);
    }
  };

  addCandidate(path.resolve(currentDir, '..', 'node_modules'));

  let directory = path.resolve(currentDir);

  while (true) {
    if (path.basename(directory) === 'node_modules') {
      addCandidate(directory);
    }

    addCandidate(path.join(directory, 'node_modules'));

    const parentDirectory = path.dirname(directory);
    if (parentDirectory === directory) {
      break;
    }

    directory = parentDirectory;
  }

  return candidates.find((candidate) => isDirectory(candidate) && hasAstroDependency(candidate)) ?? candidates.find(isDirectory);
};

export const linkCoreNodeModules = ({
  coreNodeModules,
  installedCoreNodeModules,
}: {
  coreNodeModules: string;
  installedCoreNodeModules?: string;
}) => {
  if (!installedCoreNodeModules) return;

  if (isSymbolicLink(coreNodeModules)) {
    if (isSameDirectory(coreNodeModules, installedCoreNodeModules)) {
      return;
    }

    fs.unlinkSync(coreNodeModules);
  } else if (fs.existsSync(coreNodeModules)) {
    return;
  }

  fs.symlinkSync(installedCoreNodeModules, coreNodeModules, process.platform === 'win32' ? 'junction' : 'dir');
};
