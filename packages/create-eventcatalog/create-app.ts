/* eslint-disable import/no-extraneous-dependencies */
import chalk from 'chalk';
import path from 'path';
import { RepoInfo } from './helpers/examples';
import { makeDir } from './helpers/make-dir';
import { tryGitInit } from './helpers/git';

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
  template?: TemplateType;
}): Promise<void> {
  let repoInfo: RepoInfo | undefined;
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
  if (gitInitialized) {
    console.log(`    ${chalk.dim('■')} Git initialized`);
  }

  // Next steps
  console.log();
  console.log(`  ${chalk.cyan.bold('next')}  You're all set! Explore your project!`);
  console.log();
  console.log(`  Enter your project directory using ${chalk.cyan('cd ' + cdpath)}`);
  console.log(`  Run ${chalk.cyan(`${packageManager} run dev`)} to start the dev server. ${chalk.dim('CTRL+C to stop.')}`);
  console.log();
  console.log(`  ${chalk.dim('Star us on GitHub:')} ${chalk.underline('https://github.com/event-catalog/eventcatalog')}`);
  console.log(`  ${chalk.dim('Join our Discord:')}  ${chalk.underline('https://eventcatalog.dev/discord')}`);
  console.log();
}
