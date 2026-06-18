export * from './common';
export * from './domain';
export * from './service';
export * from './message';
export * from './channel';
export * from './flow';
export * from './entity';
export * from './user';
export * from './team';
export * from './agent';
export * from './adr';
export * from './container';
export * from './data-product';
export * from './diagram';
export * from './data-store';

import { domainSchema } from './domain';
import { serviceSchema } from './service';
import { eventSchema, commandSchema, querySchema } from './message';
import { channelSchema } from './channel';
import { flowSchema } from './flow';
import { entitySchema } from './entity';
import { userSchema } from './user';
import { teamSchema } from './team';
import { agentSchema } from './agent';
import { adrSchema } from './adr';
import { containerSchema } from './container';
import { dataProductSchema } from './data-product';
import { diagramSchema } from './diagram';
import { dataStoreSchema } from './data-store';

export const schemas = {
  domain: domainSchema,
  service: serviceSchema,
  agent: agentSchema,
  adr: adrSchema,
  event: eventSchema,
  command: commandSchema,
  query: querySchema,
  channel: channelSchema,
  flow: flowSchema,
  entity: entitySchema,
  container: containerSchema,
  dataProduct: dataProductSchema,
  diagram: diagramSchema,
  user: userSchema,
  team: teamSchema,
  // Backwards-compatible alias for older linter integrations.
  dataStore: dataStoreSchema,
} as const;

export type ResourceType = keyof typeof schemas;
