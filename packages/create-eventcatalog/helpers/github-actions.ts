import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import type { PackageManager } from './get-pkg-manager';

export const WORKFLOW_PATH = path.join('.github', 'workflows', 'eventcatalog.yml');

const INSTALL_COMMANDS: Record<PackageManager, string> = {
  npm: 'npm ci',
  pnpm: 'pnpm install --frozen-lockfile',
  yarn: 'yarn install --frozen-lockfile',
};

/**
 * The workflow is generated rather than copied from a template because its setup steps depend on the package manager.
 * Each job runs a script from package.json, so people can change what runs without editing the workflow.
 */
export const getGitHubActionsWorkflow = (packageManager: PackageManager, pnpmVersion = 'latest'): string => {
  const steps = [
    '      - uses: actions/checkout@v7',
    ...(packageManager === 'pnpm'
      ? ['      - uses: pnpm/action-setup@v6', '        with:', `          version: ${pnpmVersion}`]
      : []),
    '      - uses: actions/setup-node@v7',
    '        with:',
    '          node-version: 24',
    `          cache: ${packageManager}`,
    `      - run: ${INSTALL_COMMANDS[packageManager]}`,
  ].join('\n');

  const job = (id: string, name: string, script: string) =>
    `  ${id}:\n    name: ${name}\n    runs-on: ubuntu-latest\n    steps:\n${steps}\n      - run: ${packageManager} run ${script}\n`;

  return `# Checks your catalog on every pull request and every push to main.
name: EventCatalog

on:
  pull_request:
  push:
    branches: [main]

permissions:
  contents: read

jobs:
${[job('lint', 'Lint', 'lint'), job('fitness', 'Fitness functions', 'fitness'), job('build', 'Build', 'build')].join('\n')}`;
};

// pnpm/action-setup has no default version. Use the major that wrote the lockfile, so CI can read it.
const getPnpmMajorVersion = (root: string): string | undefined => {
  try {
    return execSync('pnpm --version', { cwd: root, stdio: ['ignore', 'pipe', 'ignore'] })
      .toString()
      .trim()
      .split('.')[0];
  } catch {
    return undefined;
  }
};

export const writeGitHubActionsWorkflow = (root: string, packageManager: PackageManager): void => {
  const pnpmVersion = packageManager === 'pnpm' ? getPnpmMajorVersion(root) : undefined;
  const workflowPath = path.join(root, WORKFLOW_PATH);

  fs.mkdirSync(path.dirname(workflowPath), { recursive: true });
  fs.writeFileSync(workflowPath, getGitHubActionsWorkflow(packageManager, pnpmVersion));
};
