#!/usr/bin/env node
import { Command } from 'commander';
import { exec, execSync } from 'node:child_process';
import { join } from 'node:path';
import fs from 'fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const currentDir = path.dirname(fileURLToPath(import.meta.url));

const program = new Command();

// The users dierctory
const dir = process.cwd();

// The tmp core directory
const core = join(dir, '.eventcatalog-core');

// The project itself
const eventCatalogDir = join(currentDir, '../../');

program.name('eventcatalog').description('Documentation tool for event-driven architectures');

const copyFile = (from: string, to: string) => {
  if (fs.existsSync(from)) {
    // fs.copyFileSync(from, to);
    fs.cpSync(from, to);
  }
};

const copyFolder = (from: string, to: string) => {
  if (fs.existsSync(from)) {
    fs.cpSync(from, to, { recursive: true });
  }
};

const ensureDir = (dir: string) => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir);
  }
};

const copyCore = () => {
  // make sure the core folder exists
  ensureDir(core);

  // Copy required eventcatlog files into users directory
  fs.cpSync(eventCatalogDir, core, {
    recursive: true,
    filter: (src) => {
      // if(src.includes('node_modules')) {
      //   return false;
      // }
      return true;
    },
  });
};

const clearCore = () => {
  if (fs.existsSync(core)) fs.rmSync(core, { recursive: true });
};

program
  .command('dev')
  .description('Run development server of EventCatalog')
  .option('-d, --debug', 'Output EventCatalog application information into your terminal')
  .option('--force-recreate', 'Recreate the eventcatalog-core directory', false)
  .action((options) => {
    // // Copy EventCatalog core over
    console.log('Setting up EventCatalog....');

    if (options.debug) {
      console.log('Debug mode enabled');
      console.log('PROJECT_DIR', dir);
      console.log('CATALOG_DIR', core);
    }

    if (options.forceRecreate) clearCore();
    copyCore();

    // // Copy the config and styles
    copyFolder(join(dir, 'public'), join(core, 'public'));
    copyFile(join(dir, 'eventcatalog.config.js'), join(core, 'eventcatalog.config.js'));
    copyFile(join(dir, 'eventcatalog.styles.css'), join(core, 'eventcatalog.styles.css'));

    console.log('EventCatalog is starting at http://localhost:3000/docs');

    execSync(`cross-env PROJECT_DIR='${dir}' CATALOG_DIR='${core}' npm run dev`, {
      cwd: core,
      // @ts-ignore
      stdio: 'inherit',
    });
  });

program
  .command('build')
  .description('Run build of EventCatalog')
  .action((options) => {
    console.log('Building EventCatalog...');

    copyCore();

    // Copy the config and styles
    copyFolder(join(dir, 'public'), join(core, 'public'));
    copyFile(join(dir, 'eventcatalog.config.js'), join(core, 'eventcatalog.config.js'));
    copyFile(join(dir, 'eventcatalog.styles.css'), join(core, 'eventcatalog.styles.css'));

    execSync(`cross-env PROJECT_DIR='${dir}' CATALOG_DIR='${core}' npm run build`, {
      cwd: core,
      stdio: 'inherit',
    });

    // // everything is built make sure its back in the users project directory
    copyFolder(join(core, 'dist'), join(dir, 'dist'));
  });

const previewCatalog = () => {
  copyCore();

  // Copy the config and styles
  copyFolder(join(dir, 'public'), join(core, 'public'));
  copyFile(join(dir, 'eventcatalog.config.js'), join(core, 'eventcatalog.config.js'));
  copyFile(join(dir, 'eventcatalog.styles.css'), join(core, 'eventcatalog.styles.css'));

  execSync(`cross-env PROJECT_DIR='${dir}' CATALOG_DIR='${core}' npm run preview -- --root ${dir} --port 3000`, {
    cwd: core,
    stdio: 'inherit',
  });

  // // everything is built make sure its back in the users project directory
  copyFolder(join(core, 'dist'), join(dir, 'dist'));
};

program
  .command('preview')
  .description('Serves the contents of your eventcatalog build directory')
  .action((options) => {
    console.log('Starting preview of your build...');
    previewCatalog();
  });

program
  .command('start')
  .description('Serves the contents of your eventcatalog build directory')
  .action((options) => {
    console.log('Starting preview of your build...');
    previewCatalog();
  });

program
  .command('generate [siteDir]')
  .description('Start the generator scripts.')
  .action(() => {
    copyCore();

    copyFolder(join(dir, 'public'), join(core, 'public'));
    copyFile(join(dir, 'eventcatalog.config.js'), join(core, 'eventcatalog.config.js'));
    copyFile(join(dir, 'eventcatalog.styles.css'), join(core, 'eventcatalog.styles.css'));

    execSync(`cross-env PROJECT_DIR='${dir}' npm run generate`, {
      cwd: core,
      stdio: 'inherit',
    });
  });

program.parse();
