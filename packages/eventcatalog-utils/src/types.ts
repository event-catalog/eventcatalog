export interface FunctionInitInterface {
  catalogDirectory: string;
}

export interface WriteServiceToCatalogInterface {
  useMarkdownContentFromExistingService?: boolean;
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

export interface WriteEventToCatalogOptions {
  schema?: SchemaFile;
  codeExamples?: CodeExample[] | [];
  useMarkdownContentFromExistingEvent?: boolean;
  markdownContent?: string;
  frontMatterToCopyToNewVersions?: FrontMatterAllowedToCopy;
  versionExistingEvent?: boolean;
}
