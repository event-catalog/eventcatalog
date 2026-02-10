export interface Badge {
  content: string;
  backgroundColor: string;
  textColor: string;
  icon?: string;
  link?: string;
}

export interface Specification {
  type: 'asyncapi' | 'openapi';
  path: string;
  name?: string;
}

export interface Repository {
  language: string;
  url: string;
}

export interface DraftObject {
  title: string;
  message: string;
}

export interface DeprecatedObject {
  date: string;
  message?: string;
}

export interface ResourceReference {
  id: string;
  version?: string;
}

export interface Parameter {
  enum?: string[];
  description?: string;
  examples?: string[];
  default?: string;
}

export interface FlowStep {
  id: string;
  title: string;
  summary?: string;
  actor?: {
    name: string;
  };
  message?: {
    id: string;
    version: string;
  };
  service?: {
    id: string;
    version: string;
  };
  externalSystem?: {
    name: string;
    summary?: string;
    url?: string;
  };
  next_step?: string;
  next_steps?: string[];
}

export interface EntityProperty {
  name: string;
  type: string;
  required?: boolean;
  description?: string;
  references?: string;
  referencesIdentifier?: string;
  relationType?: 'one-to-one' | 'one-to-many';
}

export interface ValidationError {
  type: 'schema' | 'reference';
  resource: string;
  field?: string;
  message: string;
  file: string;
  line?: number;
  severity?: 'error' | 'warning';
  rule?: string;
}

export interface LinterOptions {
  rootDir: string;
  failOnWarning?: boolean;
  verbose?: boolean;
}
