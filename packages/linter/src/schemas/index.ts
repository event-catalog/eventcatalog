export * from './common';
export * from './domain';
export * from './service';
export * from './message';
export * from './channel';
export * from './flow';
export * from './entity';
export * from './user';
export * from './team';
export * from './data-store';

import { domainSchema } from './domain';
import { serviceSchema } from './service';
import { eventSchema, commandSchema, querySchema } from './message';
import { channelSchema } from './channel';
import { flowSchema } from './flow';
import { entitySchema } from './entity';
import { userSchema } from './user';
import { teamSchema } from './team';
import { dataStoreSchema } from './data-store';

export const schemas = {
  domain: domainSchema,
  service: serviceSchema,
  event: eventSchema,
  command: commandSchema,
  query: querySchema,
  channel: channelSchema,
  flow: flowSchema,
  entity: entitySchema,
  user: userSchema,
  team: teamSchema,
  dataStore: dataStoreSchema,
} as const;

export type ResourceType = keyof typeof schemas;
