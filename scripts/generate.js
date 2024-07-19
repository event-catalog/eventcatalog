// const path = require('path');
// const chalk = require('chalk');
import { readFile, writeFile } from 'node:fs/promises';
import { createRequire } from 'module';



import path from 'node:path';

const generate = async () => {
  // Fix for the file
  const rawFile = await readFile(path.join(process.env.PROJECT_DIR, 'eventcatalog.config.js'), 'utf8');

//   const require = createRequire(process.env.PROJECT_DIR);
  const require = createRequire(import.meta.url);
//   const require = require('esm');
  const { default: esmRequire } = require('esm');

  // hack to get ready CJS etc...
  if (rawFile.includes('export default')) {
    const fixedFile = rawFile.replace('export default', 'module.exports =');
    await writeFile(path.join(process.env.PROJECT_DIR, 'eventcatalog.config.js'), fixedFile);
  }

  const config = esmRequire(path.join(process.env.PROJECT_DIR, 'eventcatalog.config.js'));

  const { generators = [] } = config;

  // Tidy up
  await writeFile(path.join(process.env.PROJECT_DIR, 'eventcatalog.config.js'), rawFile);

  const plugins = generators.map((generator) => {
    let plugin = generator[0];
    const pluginConfig = generator[1];

    if(plugin.startsWith('./')) {
        plugin = path.join(process.env.PROJECT_DIR, plugin);
    }

    if(plugin.includes('<rootDir>')) {
        plugin = plugin.replace('<rootDir>', process.env.PROJECT_DIR);
    }

    const importedGenerator = esmRequire(plugin);


    console.log(`Generating EventCatalog docs using: ${plugin}`);
    // console.log(chalk.blue(`Generating EventCatalog docs using: ${plugin}`));

    return importedGenerator({ eventCatalogConfig: config }, pluginConfig);
  });

  await Promise.all(plugins);
};

generate();
