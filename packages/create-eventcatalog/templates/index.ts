import { copy } from '../helpers/copy';
import { install } from '../helpers/install';

import os from 'os';
import fs from 'fs';
import path from 'path';
import { v4 } from 'uuid';

import { GetTemplateFileArgs, InstallTemplateArgs } from './types';
import { raiseEvent } from './analytics';

/**
 * Get the file path for a given file in a template, e.g. "next.config.js".
 */
export const getTemplateFile = ({ template, mode, file }: GetTemplateFileArgs): string => {
  return path.join(__dirname, template, mode, file);
};

/**
 * Install a Next.js internal template to a given `root` directory.
 */
export const installTemplate = async ({
  appName,
  root,
  packageManager,
  isOnline,
  template,
  mode,
  eslint,
  organizationName,
}: InstallTemplateArgs) => {
  /**
   * Create a package.json for the new project
   */
  const packageJson = {
    name: appName,
    version: '0.1.0',
    private: true,
    scripts: {
      dev: 'eventcatalog dev',
      build: 'eventcatalog build',
      start: 'eventcatalog start',
      preview: 'eventcatalog preview',
      generate: 'eventcatalog generate',
      lint: 'eventcatalog-linter',
      test: 'echo "Error: no test specified" && exit 1',
    },
  };
  /**
   * Write it to disk.
   */
  fs.writeFileSync(path.join(root, 'package.json'), JSON.stringify(packageJson, null, 2) + os.EOL);
  /**
   * These flags will be passed to `install()`, which calls the package manager
   * install process.
   */
  const installFlags = { packageManager, isOnline };

  /**
   * Default dependencies.
   */
  // const dependencies = ["@eventcatalog/eventcatalog-2"];
  const dependencies = ['@eventcatalog/core', '@eventcatalog/linter'] as any;

  // if asyncapi is selected, add the asyncapi dependencies
  if (template === 'asyncapi') {
    dependencies.push('@eventcatalog/generator-asyncapi');
  }

  if (template === 'openapi') {
    dependencies.push('@eventcatalog/generator-openapi');
  }

  if (template === 'graphql') {
    dependencies.push('@eventcatalog/generator-graphql');
  }

  if (template === 'confluent') {
    dependencies.push('@eventcatalog/generator-confluent-schema-registry');
  }

  if (template === 'eventbridge') {
    dependencies.push('@eventcatalog/generator-eventbridge');
  }

  if (template === 'amazon-apigateway') {
    dependencies.push('@eventcatalog/generator-amazon-apigateway');
    dependencies.push('@eventcatalog/generator-openapi');
  }

  // "@myuser/my-package": "file:../lib"
  const devDependencies = [] as any;

  /**
   * Install package.json dependencies if they exist.
   */
  if (dependencies.length) {
    await install(root, dependencies, installFlags);
  }

  if (devDependencies.length) {
    const devInstallFlags = { devDependencies: true, ...installFlags };
    await install(root, devDependencies, devInstallFlags);
  }
  /**
   * Copy the template files to the target directory.
   */
  const templatePath = path.join(__dirname, '../templates', template);
  // console.log("templatePath", templatePath, __dirname, template);
  await copy('**', root, {
    parents: true,
    cwd: templatePath,
    rename: (name) => {
      switch (name) {
        case 'env':
        case 'gitignore':
        case 'npmrc':
        case 'dockerignore':
        case 'eslintrc.json': {
          return '.'.concat(name);
        }
        // README.md is ignored by webpack-asset-relocator-loader used by ncc:
        // https://github.com/vercel/webpack-asset-relocator-loader/blob/e9308683d47ff507253e37c9bcbb99474603192b/src/asset-relocator.js#L227
        case 'README-template.md': {
          return 'README.md';
        }
        default: {
          return name;
        }
      }
    },
  });

  const cId = v4();

  // update the properties in the eventcatalog.config.js
  const eventCatalogConfigPath = path.join(root, 'eventcatalog.config.js');
  let eventCatalogConfig = fs.readFileSync(eventCatalogConfigPath, 'utf8');
  eventCatalogConfig = eventCatalogConfig.replace(/<organizationName>/g, organizationName);
  eventCatalogConfig = eventCatalogConfig.replace(/<cId>/g, cId);
  fs.writeFileSync(eventCatalogConfigPath, eventCatalogConfig);

  await raiseEvent({ command: 'create', org: organizationName, cId });

  if (!eslint) {
    // remove un-necessary template file if eslint is not desired
    await fs.promises.unlink(path.join(root, '.eslintrc.json'));
  }
};

export * from './types';
