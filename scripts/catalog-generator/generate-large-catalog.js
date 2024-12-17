#!/usr/bin/env node

import * as fs from 'node:fs';
import { globSync } from 'glob';
import { join } from 'node:path';
import { execSync } from 'node:child_process';

const rootDir = join(process.cwd());
const catalogName = 'large-catalog';
const catalogBasePath = join(rootDir, '/examples');
const catalogPath = join(catalogBasePath, catalogName);

const baseConfig = {
  title: 'Service Catalog',
  tagline: 'Discover, Explore and Document your Event Driven Architectures',
  organizationName: 'Example Organization',
  homepageLink: 'https://example.com',
  landingPage: '',
  editUrl: 'https://github.com/eventcatalog/event-catalog.git',
  trailingSlash: false,
  showPageHeadings: true,
  base: '/',
  logo: {
    alt: 'Catalog Logo',
    src: '/logo.png',
  },
  docs: {
    sidebar: {
      showPageHeadings: true,
      services: { visible: true },
      messages: { visible: true },
      domains: { visible: true },
      teams: { visible: true },
      users: { visible: true },
      flows: { visible: false },
    },
  },
};

if (fs.existsSync(catalogPath)) fs.rmdirSync(catalogPath, { recursive: true });

execSync(`npx @eventcatalog/create-eventcatalog@latest ${catalogName} --empty`, { cwd: catalogBasePath, stdio: 'inherit' });

const createGenerators = (specpath, generator) => {
  let generators = [];

  const schemas = globSync(specpath)
    ?.sort((a, b) => b.localeCompare(a))
    .reverse();
  if (!schemas) return [];

  schemas.map((schemaName) => {
    generators.push([
      `${generator}`,
      {
        domain: {
          id: schemaName.split('/')[2].toUpperCase(),
          name: schemaName.split('/')[2].toUpperCase(),
          version: '1.0.0',
        },
        services: [
          {
            path: join(process.cwd(), `${schemaName}`),
            id: schemaName.split('/')[4],
          },
        ],
        debug: true,
        saveParsedSpecFile: true,
        parseChannels: true,
      },
    ]);
  });

  return generators;
};

const sourceFolder = 'scripts/big-system/specs/DOMAIN/APP/1.0.0';
const sourceContent = fs.readFileSync(`${sourceFolder}/APP.yaml`, 'utf8').toString();

for (let i = 0; i < 500; i++) {
  const destinationFolder = `scripts/big-system/specs/DOMAIN/asyncapi/MyService${i}/1.0.0`;
  const copyFolderRecursiveSync = (target) => {
    if (!fs.existsSync(target)) fs.mkdirSync(target, { recursive: true });
    fs.writeFileSync(`${destinationFolder}/APP.yaml`, sourceContent.replace(/<APP>/g, i.toString()), 'utf8');
  };

  copyFolderRecursiveSync(destinationFolder);
}

const asyncapiSpecsPath = 'scripts/big-system/specs/**/*.{yml,yaml,json}';
const generators = [createGenerators(asyncapiSpecsPath, '@eventcatalog/generator-asyncapi')].flat();

fs.writeFileSync(
  join(catalogPath, 'eventcatalog.config.js'),
  `/** @type {import('@eventcatalog/core/bin/eventcatalog.config').Config} */
export default ${JSON.stringify({ ...baseConfig, generators }, null, 2)}`,
  'utf8'
);

execSync(`npm install @eventcatalog/generator-asyncapi`, { cwd: catalogPath, stdio: 'inherit' });
execSync(`npm run generate`, { cwd: catalogPath, stdio: 'inherit' });
// execSync(`npm run build`, { cwd: catalogPath, stdio: 'inherit' });
