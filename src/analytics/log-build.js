import { getEventCatalogConfigFile, verifyRequiredFieldsAreInCatalogConfigFile } from '../eventcatalog-config-file-utils.js';
import { raiseEvent } from './analytics.js';

const getFeatures = async (configFile) => {
  return {
    llmsTxt: configFile.llmsTxt?.enabled || false,
    rss: configFile.rss?.enabled || false,
    chat: configFile.chat?.enabled || false,
    output: configFile.output || 'static',
  };
};

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

    const features = await getFeatures(configFile);

    await raiseEvent({
      command: 'build',
      org: organizationName,
      cId,
      generators: generatorNames.toString(),
      features: Object.keys(features)
        .map((feature) => `${feature}:${features[feature]}`)
        .join(','),
    });
  } catch (error) {
    // Just swallow the error
  }
};

export default main;
