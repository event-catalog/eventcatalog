import { copy } from '../helpers/copy';
import { install } from '../helpers/install';
import { formatValidTemplates, resolveTemplateDirectory } from '../helpers/cli-options';

import os from 'os';
import fs from 'fs';
import path from 'path';
import { v4 } from 'uuid';

import { GetTemplateFileArgs, InstallTemplateArgs } from './types';
import { raiseEvent } from './analytics';

/**
 * Get the file path for a given file in a template.
 */
export const getTemplateFile = ({ template, mode, file }: GetTemplateFileArgs): string => {
  return path.join(__dirname, template, mode, file);
};

const AGENT_RULES = `<!-- BEGIN:eventcatalog-agent-rules -->
# EventCatalog: ALWAYS read docs before coding

Before any EventCatalog work, find and read the relevant doc in \`node_modules/@eventcatalog/core/dist/docs/\`. Your training data may be outdated. The bundled docs are the source of truth.

<!-- END:eventcatalog-agent-rules -->
`;

const CLAUDE_RULES = '@AGENTS.md\n';

/**
 * Install an EventCatalog template into a given `root` directory.
 */
export const installTemplate = async ({
  appName,
  root,
  packageManager,
  isOnline,
  template,
  eslint,
  organizationName,
}: InstallTemplateArgs) => {
  const templateDirectory = resolveTemplateDirectory(template);
  if (!templateDirectory) {
    throw new Error(`Unknown template "${template}". Available templates: ${formatValidTemplates()}`);
  }

  const templatePath = path.join(__dirname, '../templates', templateDirectory);
  if (!fs.existsSync(templatePath)) {
    throw new Error(`Unknown template "${template}". Available templates: ${formatValidTemplates()}`);
  }

  /**
   * Create a package.json for the new project
   */
  const packageJson = {
    name: appName,
    version: '0.1.0',
    private: true,
    scripts: {
      dev: 'eventcatalog dev',
      editor: 'npx @eventcatalog/editor@latest',
      build: 'eventcatalog build',
      start: 'eventcatalog start',
      preview: 'eventcatalog preview',
      generate: 'eventcatalog generate',
      federate: 'eventcatalog federate',
      export: 'eventcatalog export',
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
  const dependencies = ['@eventcatalog/core', '@eventcatalog/linter'] as any;

  if (templateDirectory === 'asyncapi') {
    dependencies.push('@eventcatalog/generator-asyncapi');
  }

  if (templateDirectory === 'openapi') {
    dependencies.push('@eventcatalog/generator-openapi');
  }

  if (templateDirectory === 'graphql') {
    dependencies.push('@eventcatalog/generator-graphql');
  }

  if (templateDirectory === 'confluent') {
    dependencies.push('@eventcatalog/generator-confluent-schema-registry');
  }

  if (templateDirectory === 'eventbridge') {
    dependencies.push('@eventcatalog/generator-eventbridge');
  }

  if (templateDirectory === 'amazon-api-gateway') {
    dependencies.push('@eventcatalog/generator-amazon-apigateway');
    dependencies.push('@eventcatalog/generator-openapi');
  }

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

  fs.writeFileSync(path.join(root, 'AGENTS.md'), AGENT_RULES);
  fs.writeFileSync(path.join(root, 'CLAUDE.md'), CLAUDE_RULES);

  const cId = v4();

  // update the properties in the eventcatalog.config.js
  const eventCatalogConfigPath = path.join(root, 'eventcatalog.config.js');
  let eventCatalogConfig = fs.readFileSync(eventCatalogConfigPath, 'utf8');
  eventCatalogConfig = eventCatalogConfig.replace(/<organizationName>/g, organizationName);
  eventCatalogConfig = eventCatalogConfig.replace(/<cId>/g, cId);
  fs.writeFileSync(eventCatalogConfigPath, eventCatalogConfig);

  await raiseEvent({ command: 'create', org: organizationName, cId });

  if (!eslint) {
    const eslintConfigPath = path.join(root, '.eslintrc.json');
    if (fs.existsSync(eslintConfigPath)) {
      await fs.promises.unlink(eslintConfigPath);
    }
  }
};

export * from './types';
