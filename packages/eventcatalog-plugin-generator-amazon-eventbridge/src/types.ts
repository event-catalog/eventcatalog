/* eslint-disable no-unused-vars */
import { Credentials } from '@aws-sdk/types';

// eslint-disable-next-line no-shadow
export enum SchemaTypes {
  JSONSchemaDraft4,
  OpenAPI,
}

export interface PluginOptions {
  credentials: Credentials;
  region: string;
  eventBusName: string;
  registryName: string;
  schemaTypeToRenderToEvent?: SchemaTypes;
  versionEvents?: boolean;
}
