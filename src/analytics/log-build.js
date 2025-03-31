import { getEventCatalogConfigFile, verifyRequiredFieldsAreInCatalogConfigFile } from '../eventcatalog-config-file-utils.js';
import { raiseEvent } from './analytics.js';

/**
 *
 * @param {string} projectDir
 */
const main = async (projectDir, { isEventCatalogStarterEnabled, isEventCatalogScaleEnabled, isBackstagePluginEnabled }) => {
  if (process.env.NODE_ENV === 'CI') return;
  try {
    await verifyRequiredFieldsAreInCatalogConfigFile(projectDir);
    const configFile = await getEventCatalogConfigFile(projectDir);
    const { cId, organizationName, generators = [] } = configFile;
    let generatorNames = generators.length > 0 ? generators.map((generator) => generator[0]) : ['none'];

    // Check if EventCatalog Pro is enabled
    if (isEventCatalogStarterEnabled) {
      generatorNames.push('@eventcatalog/eventcatalog-starter');
    }

    if (isEventCatalogScaleEnabled) {
      generatorNames.push('@eventcatalog/eventcatalog-scale');
    }

    if (isBackstagePluginEnabled) {
      generatorNames.push('@eventcatalog/backstage-plugin-eventcatalog');
    }

    console.log('generatorNames', generatorNames);

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
