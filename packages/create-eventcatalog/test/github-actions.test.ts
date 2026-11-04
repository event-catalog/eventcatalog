import { execSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { isInRepositorySubfolder } from '../helpers/git';
import { getGitHubActionsWorkflow, WORKFLOW_PATH, writeGitHubActionsWorkflow } from '../helpers/github-actions';

describe('getGitHubActionsWorkflow', () => {
  it('generates a lint, fitness and build job for npm', () => {
    const setup = `    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v7
      - uses: actions/setup-node@v7
        with:
          node-version: 24
          cache: npm
      - run: npm ci
`;

    expect(getGitHubActionsWorkflow('npm')).toBe(`# Checks your catalog on every pull request and every push to main.
name: EventCatalog

on:
  pull_request:
  push:
    branches: [main]

permissions:
  contents: read

jobs:
  lint:
    name: Lint
${setup}      - run: npm run lint

  fitness:
    name: Fitness functions
${setup}      - run: npm run fitness

  build:
    name: Build
${setup}      - run: npm run build
`);
  });

  it('sets up pnpm before Node, because the cache needs it, at the given version', () => {
    const workflow = getGitHubActionsWorkflow('pnpm', '10');

    expect(workflow).toContain(`      - uses: pnpm/action-setup@v6
        with:
          version: 10
      - uses: actions/setup-node@v7
        with:
          node-version: 24
          cache: pnpm
      - run: pnpm install --frozen-lockfile
`);
    expect(workflow).toContain('- run: pnpm run lint');
    expect(workflow).toContain('- run: pnpm run fitness');
    expect(workflow).toContain('- run: pnpm run build');
    expect(workflow).not.toContain('npm ci');
  });

  it('installs from the lockfile with yarn', () => {
    const workflow = getGitHubActionsWorkflow('yarn');

    expect(workflow).toContain(`          cache: yarn
      - run: yarn install --frozen-lockfile
`);
    expect(workflow).toContain('- run: yarn run fitness');
    expect(workflow).not.toContain('pnpm/action-setup');
  });
});

describe('with a catalog on disk', () => {
  let tmp: string;

  beforeEach(() => {
    tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'create-eventcatalog-'));
  });

  afterEach(() => {
    fs.rmSync(tmp, { recursive: true, force: true });
  });

  it('writes the workflow where GitHub looks for it', () => {
    writeGitHubActionsWorkflow(tmp, 'npm');

    expect(fs.readFileSync(path.join(tmp, '.github/workflows/eventcatalog.yml'), 'utf8')).toBe(getGitHubActionsWorkflow('npm'));
    expect(WORKFLOW_PATH).toBe(path.join('.github', 'workflows', 'eventcatalog.yml'));
  });

  describe('isInRepositorySubfolder', () => {
    it('is false outside a repository', () => {
      expect(isInRepositorySubfolder(tmp)).toBe(false);
    });

    it('is false at the top level of a repository', () => {
      execSync('git init', { cwd: tmp, stdio: 'ignore' });

      expect(isInRepositorySubfolder(tmp)).toBe(false);
    });

    it('is true in a subfolder of a repository', () => {
      execSync('git init', { cwd: tmp, stdio: 'ignore' });
      const catalog = path.join(tmp, 'apps', 'catalog');
      fs.mkdirSync(catalog, { recursive: true });

      expect(isInRepositorySubfolder(catalog)).toBe(true);
    });
  });
});
