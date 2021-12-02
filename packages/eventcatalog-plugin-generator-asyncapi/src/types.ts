export type PluginOpts = {id?: string} & Record<string, unknown>;

export type PluginConfig = | [string, PluginOpts];

export interface EventCataLogConfig {
  title: string;
  tagline: string;
  url: string;
  baseUrl: string;
  organizationName: string;
  projectName: string;
  eventsDir?:string;
  servicesDir?:string;
  generators?: PluginConfig[];
}

export type LoadContext = {
  eventCatalogConfig: EventCataLogConfig
}

export type PluginOptions = {
  file: string
}
