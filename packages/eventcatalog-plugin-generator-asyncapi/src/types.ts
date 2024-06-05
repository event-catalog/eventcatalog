export type AsyncAPIPluginOptions = {
  pathToSpec: string | string[];
  versionEvents?: boolean;
  externalAsyncAPIUrl?: string;
  renderMermaidDiagram?: boolean;
  renderNodeGraph?: boolean;
  renderAsyncAPI?: boolean;
  domainName?: string;
  domainSummary?: string;
};
