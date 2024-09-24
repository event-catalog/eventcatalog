import { getEventCatalogConfigFile, verifyRequiredFieldsAreInCatalogConfigFile } from '../eventcatalog-config-file-utils.js';
import { raiseEvent } from './analytics.js';

/**
 *
 * @param {string} dir
 * @returns
 */
export const main = async (dir) => {
  const projectDir = dir || process.env.PROJECT_DIR;

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

// main();
