import { getEventCatalogConfigFile, verifyRequiredFieldsAreInCatalogConfigFile } from '../eventcatalog-config-file-utils.js';
import { raiseEvent } from './analytics.js';
import { countResources, serializeCounts } from './count-resources.js';

const getFeatures = async (configFile) => {
  return {
    llmsTxt: configFile.llmsTxt?.enabled || false,
    rss: configFile.rss?.enabled || false,
    chat: configFile.chat?.enabled || false,
    output: configFile.output || 'static',
  };
};

const CLOUD_ANALYTICS_ENDPOINT = 'https://api.ecingest.dev/v1/analytics/ingest';

const toCloudResourceCounts = (counts) => ({
  agents: counts.agents || 0,
  domains: counts.domains || 0,
  services: counts.services || 0,
  events: counts.events || 0,
  commands: counts.commands || 0,
  queries: counts.queries || 0,
  flows: counts.flows || 0,
  channels: counts.channels || 0,
  entities: counts.entities || 0,
  containers: counts.containers || 0,
  dataProducts: counts['data-products'] || 0,
  teams: counts.teams || 0,
  users: counts.users || 0,
  designs: counts.designs || 0,
  diagrams: counts.diagrams || 0,
  ubiquitousLanguages: counts.ubiquitousLanguages || 0,
});

const reportCloudResourceInventory = async (configFile, resourceCounts) => {
  const analytics = configFile.cloud?.analytics;
  if (!analytics?.enabled || !analytics.trackingId || !analytics.writeKey) return;

  const endpoint = analytics.endpoint || CLOUD_ANALYTICS_ENDPOINT;
  await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-EventCatalog-Analytics-Key': analytics.writeKey,
    },
    body: JSON.stringify({
      trackingId: analytics.trackingId,
      event: 'catalog.resource_inventory_reported',
      timestamp: new Date().toISOString(),
      counts: toCloudResourceCounts(resourceCounts),
    }),
  });
};

/**
 *
 * @param {string} projectDir
 */
const main = async (projectDir, { isEventCatalogStarterEnabled, isEventCatalogScaleEnabled, isBackstagePluginEnabled }) => {
  // if (process.env.NODE_ENV === 'CI') return;
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
    const resourceCounts = await countResources(projectDir);

    await reportCloudResourceInventory(configFile, resourceCounts);

    await raiseEvent({
      command: 'build',
      org: organizationName,
      cId,
      generators: generatorNames.toString(),
      features: Object.keys(features)
        .map((feature) => `${feature}:${features[feature]}`)
        .join(','),
      resources: serializeCounts(resourceCounts),
    });
  } catch (error) {
    // Just swallow the error
  }
};

export default main;
