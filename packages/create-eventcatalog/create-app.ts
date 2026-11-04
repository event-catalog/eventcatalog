/* eslint-disable import/no-extraneous-dependencies */
import chalk from 'chalk';
import path from 'path';
import { makeDir } from './helpers/make-dir';
import { isInRepositorySubfolder, tryGitInit } from './helpers/git';
import { WORKFLOW_PATH, writeGitHubActionsWorkflow } from './helpers/github-actions';
import { installEventCatalogSkills } from './helpers/install-skills';

import { isFolderEmpty } from './helpers/is-folder-empty';
import { getOnline } from './helpers/is-online';
import { isWriteable } from './helpers/is-writeable';
import type { PackageManager } from './helpers/get-pkg-manager';

import { installTemplate, TemplateMode, TemplateType } from './templates';

export class DownloadError extends Error {}

export async function createApp({
  appPath,
  packageManager,
  example,
  examplePath,
  typescript,
  eslint,
  experimentalApp,
  organizationName,
  initEmptyProject,
  installSkills,
  githubActions,
  template: templateName,
}: {
  appPath: string;
  packageManager: PackageManager;
  example?: string;
  examplePath?: string;
  typescript: boolean;
  eslint: boolean;
  experimentalApp: boolean;
  organizationName: string;
  initEmptyProject: boolean;
  installSkills: boolean;
  githubActions: boolean;
  template?: TemplateType;
}): Promise<void> {
  let repoInfo: any | undefined;
  const mode: TemplateMode = typescript ? 'ts' : 'js';
  const template: TemplateType = initEmptyProject ? 'empty' : templateName || 'default';

  const root = path.resolve(appPath);

  if (!(await isWriteable(path.dirname(root)))) {
    console.error('The application path is not writable, please check folder permissions and try again.');
    console.error('It is likely you do not have write permissions for this folder.');
    process.exit(1);
  }

  const appName = path.basename(root);

  await makeDir(root);
  if (!isFolderEmpty(root, appName)) {
    process.exit(1);
  }

  const useYarn = packageManager === 'yarn';
  const isOnline = !useYarn || (await getOnline());
  const originalDirectory = process.cwd();

  process.chdir(root);

  let hasPackageJson = false;

  /**
   * If an example repository is not provided for cloning, proceed
   * by installing from a template.
   */
  await installTemplate({
    appName,
    root,
    template,
    mode,
    packageManager,
    isOnline,
    eslint,
    organizationName,
  });

  const skillsInstalled = installSkills ? await installEventCatalogSkills(root) : false;

  // GitHub only runs workflows from the top level of a repository, so one in a subfolder would never run
  const workflowSkipped = githubActions && isInRepositorySubfolder(root);
  const workflowAdded = githubActions && !workflowSkipped;
  if (workflowAdded) {
    writeGitHubActionsWorkflow(root, packageManager);
  }

  // After the workflow, so it's part of the initial commit
  const gitInitialized = tryGitInit(root);

  let cdpath: string;
  if (path.join(originalDirectory, appName) === appPath) {
    cdpath = appName;
  } else {
    cdpath = appPath;
  }

  // Summary
  console.log();
  console.log(chalk.green('  Project initialized!'));
  console.log(`    ${chalk.dim('■')} Template copied`);
  console.log(`    ${chalk.dim('■')} Dependencies installed`);
  if (skillsInstalled) {
    console.log(`    ${chalk.dim('■')} EventCatalog Skills installed`);
  }
  if (workflowAdded) {
    console.log(`    ${chalk.dim('■')} GitHub Actions workflow added`);
  }
  if (workflowSkipped) {
    console.log(
      `    ${chalk.dim('■')} GitHub Actions workflow skipped (GitHub only runs workflows from the top of a repository)`
    );
  }
  if (gitInitialized) {
    console.log(`    ${chalk.dim('■')} Git initialized`);
  }

  // Next steps
  console.log();
  console.log(`  You're all set! Explore your catalog!`);
  console.log();
  console.log(`    ${chalk.dim('■')} ${chalk.cyan('cd ' + cdpath)}`);
  console.log(`    ${chalk.dim('■')} Run ${chalk.cyan(`${packageManager} run dev`)} to start the dev server.`);
  console.log();
  if (workflowAdded) {
    console.log(`  ${chalk.cyan(WORKFLOW_PATH)} runs your linter, fitness functions and build on every pull request.`);
    console.log(`  A pull request fails if, for example, it adds a message with no owner.`);
    console.log();
  }
  console.log(`  ${chalk.dim('Star us on GitHub:')} ${chalk.underline('https://github.com/event-catalog/eventcatalog')}`);
  console.log(`  ${chalk.dim('Join our Discord:')}  ${chalk.underline('https://eventcatalog.dev/discord')}`);
  console.log();
  console.log(`  ${chalk.dim('Want a better editing experience?')}`);
  console.log(`  Run ${chalk.cyan(`${packageManager} run editor`)} to open EventCatalog Editor.`);
  console.log();
}
