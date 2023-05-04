export interface FunctionInitInterface {
  catalogDirectory: string;
}

export interface WriteServiceToCatalogInterface {
  useMarkdownContentFromExistingService?: boolean;
  renderMermaidDiagram?: boolean;
  renderNodeGraph?: boolean;
  asyncApiFile?: AsyncApiFile;
}

export interface WriteServiceToCatalogInterfaceReponse {
  path: string;
}

export interface WriteEventToCatalogResponse {
  path: string;
}

export interface SchemaFile {
  extension: string;
  fileContent: string;
}
export interface AsyncApiFile {
  extension: string;
  fileContent: string;
}

export interface CodeExample {
  fileName: string;
  fileContent: string;
}

export interface FrontMatterAllowedToCopy {
  owners?: boolean;
  externalLinks?: boolean;
  domains?: boolean;
  consumers?: boolean;
  producers?: boolean;
  summary?: boolean;
}

export interface GetEventFromCatalogOptions {
  version?: string;
}

export interface WriteEventToCatalogOptions {
  schema?: SchemaFile;
  codeExamples?: CodeExample[];
  useMarkdownContentFromExistingEvent?: boolean;
  renderMermaidDiagram?: boolean;
  renderNodeGraph?: boolean;
  markdownContent?: string;
  frontMatterToCopyToNewVersions?: FrontMatterAllowedToCopy;
  versionExistingEvent?: boolean;
  isLatestVersion?: boolean;
}

export interface WriteDomainToCatalogOptions {
  useMarkdownContentFromExistingDomain?: boolean;
  renderMermaidDiagram?: boolean;
  renderNodeGraph?: boolean;
}

export interface WriteDomainToCatalogResponse {
  path: string;
}
