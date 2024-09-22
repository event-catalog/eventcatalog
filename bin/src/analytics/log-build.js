import { getEventCatalogConfigFile, verifyRequiredFieldsAreInCatalogConfigFile } from '../eventcatalog-config-file-utils.js';
import { raiseEvent } from './analytics.js';

const main = async () => {
  if (process.env.NODE_ENV === 'CI') return;
  try {
    await verifyRequiredFieldsAreInCatalogConfigFile(process.env.PROJECT_DIR);
    const configFile = await getEventCatalogConfigFile(process.env.PROJECT_DIR);
    const { cId, organizationName, generators = [] } = configFile;
    const generatorNames = generators.length > 0 ? generators.map((generator) => generator[0]) : ['none'];
    await raiseEvent({
      command: 'build',
      org: organizationName,
      cId,
      generators: generatorNames.toString(),
    });
  } catch (error) {
    // Just swallow the error
  }
};

main();
