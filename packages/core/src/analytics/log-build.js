import { getEventCatalogConfigFile, verifyRequiredFieldsAreInCatalogConfigFile } from '../eventcatalog-config-file-utils.js';
import { raiseEvent } from './analytics.js';
import { countResources, hashCatalogContent, serializeCounts } from './count-resources.js';
import { isTelemetryDisabled, TELEMETRY_REQUEST_TIMEOUT_MS } from './telemetry';
import { getLicenseAnalytics } from '../utils/license-status';

// Mirrors isEventCatalogMCPEnabled so the flag reflects whether the MCP server actually runs
const isMCPEnabled = (configFile) => configFile.output === 'server' && (configFile.mcp?.enabled ?? true);

const getFeatures = async (configFile) => {
  const mcp = isMCPEnabled(configFile);
  return {
    llmsTxt: configFile.llmsTxt?.enabled || false,
    rss: configFile.rss?.enabled || false,
    chat: configFile.chat?.enabled || false,
    changelog: configFile.changelog?.enabled || false,
    auth: configFile.auth?.enabled || false,
    environments: Array.isArray(configFile.environments) && configFile.environments.length > 0,
    output: configFile.output || 'static',
    mcp,
    mcpAuth: mcp && (configFile.mcp?.auth?.enabled ?? false),
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
  customPages: counts.customPages || 0,
  customApis: counts.customApis || 0,
});

// Cloud inventory sends only when it is explicitly enabled and has a tracking id and write key.
const getEnabledCloudAnalytics = (configFile) => {
  const analytics = configFile.cloud?.analytics;
  if (!analytics?.enabled || !analytics.trackingId || !analytics.writeKey) return null;
  return analytics;
};

const reportCloudResourceInventory = async (configFile, resourceCounts) => {
  const analytics = getEnabledCloudAnalytics(configFile);
  if (!analytics) return;

  const endpoint = analytics.endpoint || CLOUD_ANALYTICS_ENDPOINT;
  try {
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
      signal: AbortSignal.timeout(TELEMETRY_REQUEST_TIMEOUT_MS),
    });
  } catch {
    // A failed or timed-out inventory report must not fail the build.
  }
};

/**
 *
 * @param {string} projectDir
 * @param {{ command?: 'build' | 'dev', license?: import('../utils/license-status').LicenseStatus }} [options]
 */
const main = async (projectDir, { command = 'build', license } = {}) => {
  try {
    await verifyRequiredFieldsAreInCatalogConfigFile(projectDir);
    const configFile = await getEventCatalogConfigFile(projectDir);

    // Stop before counting resources or hashing docs. Cloud inventory is a separate
    // opt-in and still runs when it is configured.
    if (isTelemetryDisabled(configFile, process.env)) {
      if (getEnabledCloudAnalytics(configFile)) {
        const resourceCounts = await countResources(projectDir);
        await reportCloudResourceInventory(configFile, resourceCounts);
      }
      return;
    }

    const { cId, tsd, organizationName, generators = [] } = configFile;
    const generatorNames = generators.length > 0 ? generators.map((generator) => generator[0]) : ['none'];

    const features = await getFeatures(configFile);
    const resourceCounts = await countResources(projectDir);
    const contentHash = await hashCatalogContent(projectDir);

    await reportCloudResourceInventory(configFile, resourceCounts);

    await raiseEvent(
      {
        command,
        org: organizationName,
        cId,
        // Trial start date (unix ms) from eventcatalog.config.js
        tsd,
        // Commercial license or trial, and when each expires (unix ms)
        ...getLicenseAnalytics(license, tsd),
        // CI redeploys and human-run builds are different signals; tag rather than suppress
        ci: process.env.CI ? 'true' : 'false',
        contentHash,
        generators: generatorNames.toString(),
        features: Object.keys(features)
          .map((feature) => `${feature}:${features[feature]}`)
          .join(','),
        directorySources: serializeDirectorySources(configFile),
        resources: serializeCounts(resourceCounts),
      },
      configFile
    );
  } catch (error) {
    // Just swallow the error
  }
};

export default main;
