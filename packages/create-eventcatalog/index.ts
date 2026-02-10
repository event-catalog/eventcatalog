#!/usr/bin/env node
/* eslint-disable import/no-extraneous-dependencies */
import chalk from 'chalk';
import Commander from 'commander';
import path from 'path';
import prompts from 'prompts';
import checkForUpdate from 'update-check';
import { createApp, DownloadError } from './create-app';
import { getPkgManager } from './helpers/get-pkg-manager';
import { validateNpmName } from './helpers/validate-pkg';
import packageJson from './package.json';

let projectPath: string = '';
let organizationName: string = '';

const program = new Commander.Command(packageJson.name)
  .version(packageJson.version)
  .arguments('<project-directory>')
  .usage(`${chalk.green('<project-directory>')} [options]`)
  .action((name, options) => {
    projectPath = name;
    organizationName = options.organizationName || '';
  })
  .option(
    '--ts, --typescript',
    `

  Initialize as a TypeScript project. (default)
`
  )
  .option(
    '--js, --javascript',
    `

  Initialize as a JavaScript project.
`
  )
  .option(
    '--eslint',
    `

  Initialize with eslint config.
`
  )
  .option(
    '--experimental-app',
    `

  Initialize as a \`app/\` directory project.
`
  )
  .option(
    '--use-npm',
    `

  Explicitly tell the CLI to bootstrap the app using npm
`
  )
  .option(
    '--use-pnpm',
    `

  Explicitly tell the CLI to bootstrap the app using pnpm
`
  )
  .option(
    '-e, --example [name]|[github-url]',
    `

  An example to bootstrap the app with. You can use an example name
  from the official Next.js repo or a GitHub URL. The URL can use
  any branch and/or subdirectory
`
  )
  .option(
    '--example-path <path-to-example>',
    `

  In a rare case, your GitHub URL might contain a branch name with
  a slash (e.g. bug/fix-1) and the path to the example (e.g. foo/bar).
  In this case, you must specify the path to the example separately:
  --example-path foo/bar
`
  )
  .option(
    '--organization-name [name]',
    `

  The organization name.
`
  )
  .option(
    '--template [name]',
    `

  The template to use.
`
  )
  .option(
    '--empty',
    `

  Initialize the project with an empty template.
`
  )
  .allowUnknownOption()
  .parse(process.argv);

const packageManager = !!program.useNpm ? 'npm' : !!program.usePnpm ? 'pnpm' : getPkgManager();

async function run(): Promise<void> {
  console.log();
  console.log(`  ${chalk.bgCyan.black.bold(' EventCatalog ')}  ${chalk.bold('Setup wizard')}`);
  console.log();

  if (typeof projectPath === 'string') {
    projectPath = projectPath.trim();
  }

  if (!projectPath) {
    const res = await prompts({
      type: 'text',
      name: 'path',
      message: 'Where should we create your new project?',
      initial: 'my-event-catalog',
      validate: (name) => {
        const validation = validateNpmName(path.basename(path.resolve(name)));
        if (validation.valid) {
          return true;
        }
        return 'Invalid project name: ' + validation.problems![0];
      },
    });

    if (typeof res.path === 'string') {
      projectPath = res.path.trim();
    }
  }

  if (!projectPath) {
    console.log(
      '\nPlease specify the project directory:\n' +
        `  ${chalk.cyan(program.name())} ${chalk.green('<project-directory>')}\n` +
        'For example:\n' +
        `  ${chalk.cyan(program.name())} ${chalk.green('my-event-catalog')}\n\n` +
        `Run ${chalk.cyan(`${program.name()} --help`)} to see all options.`
    );
    process.exit(1);
  }

  if (!organizationName) {
    const res = await prompts({
      type: 'text',
      name: 'organizationName',
      message: 'What is your organization name?',
      initial: 'EventCatalog Ltd',
    });

    if (typeof res.organizationName === 'string') {
      organizationName = res.organizationName.trim();
    }
  }

  console.log();

  const template = program.template || 'default';

  const resolvedProjectPath = path.resolve(projectPath);
  const projectName = path.basename(resolvedProjectPath);

  const { valid, problems } = validateNpmName(projectName);
  if (!valid) {
    console.error(`Could not create a project called ${chalk.red(`"${projectName}"`)} because of npm naming restrictions:`);

    problems!.forEach((p) => console.error(`    ${chalk.red.bold('*')} ${p}`));
    process.exit(1);
  }

  if (program.example === true) {
    console.error('Please provide an example name or url, otherwise remove the example option.');
    process.exit(1);
  }

  const example = typeof program.example === 'string' && program.example.trim();

  const options = program.opts();
  const initEmptyProject = options.empty ?? false;

  try {
    await createApp({
      appPath: resolvedProjectPath,
      packageManager,
      example: example && example !== 'default' ? example : undefined,
      examplePath: program.examplePath,
      typescript: true,
      eslint: true,
      experimentalApp: false,
      organizationName: organizationName,
      initEmptyProject,
      template: template,
    });
  } catch (reason) {
    if (!(reason instanceof DownloadError)) {
      throw reason;
    }

    const res = await prompts({
      type: 'confirm',
      name: 'builtin',
      message:
        `Could not download "${example}" because of a connectivity issue between your machine and GitHub.\n` +
        `Do you want to use the default template instead?`,
      initial: true,
    });
    if (!res.builtin) {
      throw reason;
    }

    await createApp({
      appPath: resolvedProjectPath,
      packageManager,
      typescript: program.typescript,
      eslint: program.eslint,
      organizationName: organizationName,
      experimentalApp: program.experimentalApp,
      initEmptyProject,
    });
  }
}

const update = checkForUpdate(packageJson).catch(() => null);

async function notifyUpdate(): Promise<void> {
  try {
    const res = await update;
    if (res?.latest) {
      const updateMessage =
        packageManager === 'yarn'
          ? 'yarn global add @eventcatalog/create-eventcatalog'
          : packageManager === 'pnpm'
            ? 'pnpm add -g @eventcatalog/create-eventcatalog'
            : 'npm i -g @eventcatalog/create-eventcatalog';

      console.log(
        chalk.yellow.bold('A new version of `@eventcatalog/create-eventcatalog` is available!') +
          '\n' +
          'You can update by running: ' +
          chalk.cyan(updateMessage) +
          '\n'
      );
    }
    process.exit();
  } catch {
    // ignore error
  }
}

run()
  .then(notifyUpdate)
  .catch(async (reason) => {
    console.log();
    console.log('Aborting installation.');
    if (reason.command) {
      console.log(`  ${chalk.cyan(reason.command)} has failed.`);
    } else {
      console.log(chalk.red('Unexpected error. Please report it as a bug:') + '\n', reason);
    }
    console.log();

    await notifyUpdate();

    process.exit(1);
  });
