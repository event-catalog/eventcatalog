const path = require('path');
const chalk = require('chalk');

const generate = async () => {
    const config = require(path.join(process.env.PROJECT_DIR, 'eventcatalog.config.js'));

    const { generators } = config;

    const generatorPackage = generators[0][0];
    const generatorConfig = generators[0][1];

    const context = { eventCatalogConfig: config };

    console.log(`
${chalk.blue(`Generating EventCatalog docs using: ${generatorPackage}`)}
    `)

    const { default: importedGenerator } = require(generatorPackage);

    importedGenerator(context, generatorConfig)

}

generate();