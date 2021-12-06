
export interface Owner {
  id: string
}

export interface User {
  id: string | number
  name: string
  role: string
  summary?: string
  avatarUrl?: string
}

export interface Schema {
  snippet: string,
  language: string
}

export interface Event {
  name: string
  version: string
  draft?: boolean
  summary?: string
  producers?: string[] | []
  consumers?: string[] | []
  owners?: Owner[] | string[] | []
  examples?: any
  schema?: any
}

export interface Repository {
  url: string
}

export interface Service {
  id: string
  name: string
  summary: string
  repository?: Repository
  draft?: boolean
  publishes?: Event[] | [],
  subscribes?: Event[] | [],
  owners?: Owner[] | string[] | []
}

export type PluginOptions = {
  file: string
}

export type PluginOpts = {id?: string} & Record<string, unknown>;

export type PluginConfig = | [string, PluginOpts];

export interface EventCataLogConfig {
  title: string;
  tagline: string;
  url: string;
  baseUrl: string;
  organizationName: string;
  projectName: string;
  generators?: PluginConfig[];
}

export type LoadContext = {
  eventCatalogConfig: EventCataLogConfig
}
