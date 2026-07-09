/**
 * Public utilities for user-defined custom pages, imported by catalog
 * authors as `@catalog/utils`.
 *
 * These re-exports are a documented, stable interface — internal utils can
 * change freely, this contract cannot. Getters return hydrated, cached
 * collection entries (pass { getAllVersions: false } for latest versions only).
 */
export { getDomains } from '@utils/collections/domains';
export { getServices } from '@utils/collections/services';
export { getSystems } from '@utils/collections/systems';
export { getEvents } from '@utils/collections/events';
export { getCommands } from '@utils/collections/commands';
export { getQueries } from '@utils/collections/queries';
export { getFlows } from '@utils/collections/flows';
export { getChannels } from '@utils/collections/channels';
export { getEntities } from '@utils/collections/entities';
export { getAgents } from '@utils/collections/agents';
export { getContainers } from '@utils/collections/containers';
export { getDataProducts } from '@utils/collections/data-products';
export { getAdrs } from '@utils/collections/adrs';
export { getTeams } from '@utils/collections/teams';
export { getUsers } from '@utils/collections/users';

// Resolve a specific version (semver) or the latest version of items in a collection
export { getItemsFromCollectionByIdAndSemverOrLatest } from '@utils/collections/util';
