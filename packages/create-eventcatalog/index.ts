#!/usr/bin/env node
/* eslint-disable import/no-extraneous-dependencies */
import chalk from 'chalk';
import Commander from 'commander';
import path from 'path';
import prompts from 'prompts';
import checkForUpdate from 'update-check';
import { createApp } from './create-app';
import { formatValidTemplates, isValidTemplate, resolveInstallSkills } from './helpers/cli-options';
import { getPkgManager } from './helpers/get-pkg-manager';
import { validateNpmName } from './helpers/validate-pkg';
import packageJson from './package.json';

let projectPath: string = '';
let organizationName: string = '';
let installSkills: boolean = false;

const program = new Commander.Command(packageJson.name)
  .version(packageJson.version)
  .arguments('[project-directory]')
  .usage(`${chalk.green('[project-directory]')} [options]`)
  .action((name, options) => {
    projectPath = name;
    organizationName = options.organizationName || '';
  })
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
    '--organization-name [name]',
    `

  The organization name.
`
  )
  .option(
    '--template [name]',
    `

  The template to use (${formatValidTemplates()}).
`
  )
  .option(
    '--empty',
    `

  Initialize the project with an empty template.
`
  )
  .option(
    '--skills',
    `

  Install EventCatalog skills without prompting.
`
  )
  .option(
    '--no-skills',
    `

  Skip installing EventCatalog skills without prompting.
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

  const requestedTemplate = program.empty ? 'empty' : typeof program.template === 'string' ? program.template.trim() : 'default';
  if (!isValidTemplate(requestedTemplate)) {
    console.error(`Unknown template ${chalk.red(`"${requestedTemplate}"`)}.`);
    console.error(`Available templates: ${formatValidTemplates()}`);
    process.exit(1);
  }

  if (!organizationName) {
    const res = await prompts({
      type: 'text',
      name: 'organizationName',
      message: 'What is your organization name?',
      initial: 'Acme Inc',
    });

    if (typeof res.organizationName === 'string') {
      organizationName = res.organizationName.trim();
    }
  }

  const skillsFromFlag = resolveInstallSkills(process.argv);
  if (skillsFromFlag === 'prompt') {
    const installSkillsResponse = await prompts({
      type: 'confirm',
      name: 'installSkills',
      message: 'Would you like to install EventCatalog Skills?',
      initial: true,
    });
    installSkills = installSkillsResponse.installSkills ?? false;
  } else {
    installSkills = skillsFromFlag;
  }

  console.log();

  const resolvedProjectPath = path.resolve(projectPath);
  const projectName = path.basename(resolvedProjectPath);

  const { valid, problems } = validateNpmName(projectName);
  if (!valid) {
    console.error(`Could not create a project called ${chalk.red(`"${projectName}"`)} because of npm naming restrictions:`);

    problems!.forEach((p) => console.error(`    ${chalk.red.bold('*')} ${p}`));
    process.exit(1);
  }

  const options = program.opts();
  const initEmptyProject = options.empty ?? false;

  await createApp({
    appPath: resolvedProjectPath,
    packageManager,
    organizationName: organizationName,
    initEmptyProject,
    installSkills,
    template: requestedTemplate,
  });
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
