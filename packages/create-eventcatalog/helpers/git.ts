/* eslint-disable import/no-extraneous-dependencies */
import { execSync } from 'child_process';
import path from 'path';
import { sync as rimrafSync } from 'rimraf';

function isInGitRepository(): boolean {
  try {
    execSync('git rev-parse --is-inside-work-tree', { stdio: 'ignore' });
    return true;
  } catch (_) {}
  return false;
}

function isInMercurialRepository(): boolean {
  try {
    execSync('hg --cwd . root', { stdio: 'ignore' });
    return true;
  } catch (_) {}
  return false;
}

/**
 * Whether `root` sits below the top level of an existing git repository, as a catalog in a monorepo does.
 */
export function isInRepositorySubfolder(root: string): boolean {
  try {
    // The path from the top level of the repository to `root`: empty at the top level, an error outside a repository
    return (
      execSync('git rev-parse --show-prefix', { cwd: root, stdio: ['ignore', 'pipe', 'ignore'] })
        .toString()
        .trim() !== ''
    );
  } catch (_) {
    return false;
  }
}

export function tryGitInit(root: string): boolean {
  let didInit = false;
  try {
    execSync('git --version', { stdio: 'ignore' });
    if (isInGitRepository() || isInMercurialRepository()) {
      return false;
    }

    execSync('git init', { stdio: 'ignore' });
    didInit = true;

    execSync('git checkout -b main', { stdio: 'ignore' });

    execSync('git add -A', { stdio: 'ignore' });
    execSync('git commit -m "Initial commit from EventCatalog"', {
      stdio: 'ignore',
    });
    return true;
  } catch (e) {
    if (didInit) {
      try {
        rimrafSync(path.join(root, '.git'));
      } catch (_) {}
    }
    return false;
  }
}
