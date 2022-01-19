const path = require('path');
const chalk = require('chalk');

const generate = async () => {
  const config = require(path.join(process.env.PROJECT_DIR, 'eventcatalog.config.js'));

  const { generators = [] } = config;

  const plugins = generators.map((generator) => {
    const plugin = generator[0];
    const pluginConfig = generator[1];
    const { default: importedGenerator } = require(plugin);

    console.log(chalk.blue(`Generating EventCatalog docs using: ${plugin}`));

    return importedGenerator({ eventCatalogConfig: config }, pluginConfig);
  });

  await Promise.all(plugins);
};

if (process.env.NODE_ENV !== 'test') {
  generate();
}

module.exports = {
  generate,
};
