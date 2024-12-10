import { getEventCatalogConfigFile, verifyRequiredFieldsAreInCatalogConfigFile } from '../eventcatalog-config-file-utils.js';
import { raiseEvent } from './analytics.js';

/**
 *
 * @param {string} projectDir
 */
const main = async (projectDir) => {
  if (process.env.NODE_ENV === 'CI') return;
  try {
    await verifyRequiredFieldsAreInCatalogConfigFile(projectDir);
    const configFile = await getEventCatalogConfigFile(projectDir);
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

export default main;
