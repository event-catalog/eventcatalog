#!/usr/bin/env node

const cli = require('commander');
const path = require('path');
const { execSync } = require('child_process');
const fs = require('fs-extra');

// this is the directory the users project is in
const projectDIR = process.cwd();
const coreDirectory = path.join(__dirname, '../');

// this is the directory where the eventcatalog core code is
const eventCatalogLibDir = path.join(projectDIR, '.eventcatalog-core');

const copyCoreApplicationCodeIntoUsersProjectDir = () => {
  const excludeFilesForCopy = ['.next', 'eventcatalog.config.js', 'bin', 'README.md'];
  const exclusions = excludeFilesForCopy.map((file) => path.join(eventCatalogLibDir, file));

  fs.ensureDirSync(eventCatalogLibDir);
  fs.copySync(coreDirectory, eventCatalogLibDir);

  // remove any files we don't care about
  exclusions.map((path) => {
    try {
      fs.lstatSync(path).isDirectory() ? fs.rmSync(path, { recursive: true, force: true }) : fs.unlinkSync(path);
    } catch (error) {}
  });

  fs.copyFileSync(path.join(projectDIR, 'eventcatalog.config.js'), path.join(eventCatalogLibDir, 'eventcatalog.config.js'));
};

cli
  .command('start [siteDir]')
  .description('Start the development server.')
  .action(() => {
    execSync(`cross-env PROJECT_DIR=${projectDIR} npm run start`, {
      cwd: eventCatalogLibDir,
      stdio: 'inherit',
    });
  });

cli
  .command('build [siteDir]')
  .description('Build eventcatalog project.')
  .action(() => {
    if (!fs.existsSync(eventCatalogLibDir)) {
      copyCoreApplicationCodeIntoUsersProjectDir();
    }

    // copy any public assets over (from users to the lib itself)
    fs.copySync(path.join(projectDIR, 'public'), path.join(eventCatalogLibDir, 'public'));

    // Move the schemas into public directory so we can download them from UI
    execSync(`cross-env PROJECT_DIR=${projectDIR} npm run scripts:move-schema-for-download`, {
      cwd: eventCatalogLibDir,
      stdio: 'inherit',
    });

    // build using nextjs
    execSync(`cross-env PROJECT_DIR=${projectDIR} npm run build`, {
      cwd: eventCatalogLibDir,
      stdio: 'inherit',
    });

    // everything is built make sure its back in the users project directory
    fs.copySync(path.join(eventCatalogLibDir, '.next'), path.join(projectDIR, '.next'));
    fs.copySync(path.join(eventCatalogLibDir, 'out'), path.join(projectDIR, 'out'));
  });

cli
  .command('dev [siteDir]')
  .description('Start the development server.')
  .action(() => {
    // Fix for https://github.com/boyney123/eventcatalog/issues/41, not the best but will do for now
    fs.rmSync(eventCatalogLibDir, { recursive: true, force: true });

    copyCoreApplicationCodeIntoUsersProjectDir();

    // copy any public assets over (from users to the lib itself)
    fs.copySync(path.join(projectDIR, 'public'), path.join(eventCatalogLibDir, 'public'));

    fs.copyFileSync(path.join(projectDIR, 'eventcatalog.config.js'), path.join(eventCatalogLibDir, 'eventcatalog.config.js'));

    // Move the schemas into public directory so we can download them from UI
    execSync(`cross-env PROJECT_DIR=${projectDIR} npm run scripts:move-schema-for-download`, {
      cwd: eventCatalogLibDir,
      stdio: 'inherit',
    });

    execSync(`cross-env PROJECT_DIR=${projectDIR} npm run dev`, {
      cwd: eventCatalogLibDir,
      stdio: 'inherit',
    });
  });

cli

  .command('generate [siteDir]')
  .description('Start the generator scripts.')
  .action(() => {
    if (!fs.existsSync(eventCatalogLibDir)) {
      // get the application ready
      copyCoreApplicationCodeIntoUsersProjectDir();
    }

    fs.copyFileSync(path.join(projectDIR, 'eventcatalog.config.js'), path.join(eventCatalogLibDir, 'eventcatalog.config.js'));

    execSync(`cross-env PROJECT_DIR=${projectDIR} npm run generate`, {
      cwd: eventCatalogLibDir,
      stdio: 'inherit',
    });
  });

async function run() {
  cli.parse(process.argv);

  if (!process.argv.slice(2).length) {
    cli.outputHelp();
  }
}

run();

process.on('unhandledRejection', (err) => {
  console.error(err);
  // console.error(chalk.red(err.stack));
  process.exit(1);
});
