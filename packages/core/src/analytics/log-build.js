import { getEventCatalogConfigFile, verifyRequiredFieldsAreInCatalogConfigFile } from '../eventcatalog-config-file-utils.js';
import { raiseEvent } from './analytics.js';
import { countResources, serializeCounts } from './count-resources.js';

const getFeatures = async (configFile) => {
  return {
    llmsTxt: configFile.llmsTxt?.enabled || false,
    rss: configFile.rss?.enabled || false,
    chat: configFile.chat?.enabled || false,
    changelog: configFile.changelog?.enabled || false,
    auth: configFile.auth?.enabled || false,
    environments: Array.isArray(configFile.environments) && configFile.environments.length > 0,
    output: configFile.output || 'static',
  };
};

const getDirectoryProvider = (source) => {
  if (!source?.name || typeof source.name !== 'string') return 'unknown';
  return source.name.split(':')[0] || 'unknown';
};

const serializeDirectorySources = (configFile) => {
  const sources = configFile.directory?.sources;
  if (!Array.isArray(sources) || sources.length === 0) return 'none';

  const providerCounts = sources.reduce((counts, source) => {
    const provider = getDirectoryProvider(source);
    counts[provider] = (counts[provider] || 0) + 1;
    return counts;
  }, {});

  const providers = Object.keys(providerCounts)
    .sort()
    .map((provider) => `${provider}:${providerCounts[provider]}`)
    .join(',');

  const hasUsers = sources.some((source) => typeof source?.loadUsers === 'function');
  const hasTeams = sources.some((source) => typeof source?.loadTeams === 'function');

  return `sources:${sources.length},providers:${providers},users:${hasUsers},teams:${hasTeams}`;
};

const CLOUD_ANALYTICS_ENDPOINT = 'https://api.ecingest.dev/v1/analytics/ingest';

const toCloudResourceCounts = (counts) => ({
  adrs: counts.adrs || 0,
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
      directorySources: serializeDirectorySources(configFile),
      resources: serializeCounts(resourceCounts),
    });
  } catch (error) {
    // Just swallow the error
  }
};

export default main;
