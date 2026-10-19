import type {
  Adr,
  Agent,
  Channel,
  Command,
  Container,
  DataProduct,
  Diagram,
  Domain,
  Entity,
  Event,
  Flow,
  Query,
  Service,
  System,
} from '@eventcatalog/sdk';
import type { ReadOnlyCatalog } from './catalog';

export type { ReadOnlyCatalog } from './catalog';

/** The resources a fitness function can live alongside, by the type name EventCatalog uses for them. */
export type CatalogResourceMap = {
  domain: Domain;
  system: System;
  service: Service;
  agent: Agent;
  event: Event;
  command: Command;
  query: Query;
  flow: Flow;
  channel: Channel;
  entity: Entity;
  container: Container;
  'data-product': DataProduct;
  adr: Adr;
  diagram: Diagram;
};

export type CatalogResourceType = keyof CatalogResourceMap;

/** A catalog resource with its `type`, so `resource.type === 'domain'` narrows it to a Domain. */
export type CatalogResource = {
  [Type in CatalogResourceType]: CatalogResourceMap[Type] & { type: Type };
}[CatalogResourceType];

export type FitnessSeverity = 'error' | 'warning';

export type FitnessContext = {
  /** The resource the function sits alongside (e.g. the Orders domain for `domains/Orders/fitness/*`). Undefined for functions in the root `fitness/` folder. */
  resource?: CatalogResource;
  /** Read-only access to the whole catalog, with the same methods and arguments as `@eventcatalog/sdk`. */
  catalog: ReadOnlyCatalog;
};

export type FitnessResourceReference = {
  /** e.g. `service`, `event`, `domain`, `container` (`dataStore` is accepted too) */
  type: string;
  id: string;
  version?: string;
};

export type FitnessViolation = {
  message: string;
  /** The resources the violation is about. They are linked from the violation in EventCatalog. */
  resources?: FitnessResourceReference[];
  details?: string;
  /** How to fix it */
  suggestion?: string;
};

export type FitnessFunction = {
  id: string;
  name: string;
  description?: string;
  /** `error` (default) fails `eventcatalog fitness check`, `warning` is reported without failing it. */
  severity?: FitnessSeverity;
  /** Returns the violations it finds. An empty array means the check passed. */
  run(context: FitnessContext): Promise<FitnessViolation[]> | FitnessViolation[];
};

/**
 * - `passed`: ran and found no violations
 * - `warning` / `failed`: ran and found violations (by the function's severity)
 * - `error`: could not be evaluated (it threw, returned something invalid, or could not be loaded or scoped)
 * - `not_run`: defined but has no result
 */
export type FitnessStatus = 'passed' | 'warning' | 'failed' | 'error' | 'not_run';

export type FitnessReportResourceReference = FitnessResourceReference & {
  /** Whether the reference matches a resource in the catalog. Unresolved references are kept but not linked. */
  resolved: boolean;
};

export type FitnessReportViolation = {
  message: string;
  resources: FitnessReportResourceReference[];
  details?: string;
  suggestion?: string;
};

export type FitnessFunctionResult = {
  id: string;
  name: string;
  description?: string;
  severity: FitnessSeverity;
  status: FitnessStatus;
  /** Path of the fitness function file, relative to the catalog */
  source: string;
  /** The resource the function sits alongside, or null for functions in the root `fitness/` folder */
  scope: { type: CatalogResourceType; id: string; version?: string } | null;
  violations: FitnessReportViolation[];
  /** Why the function could not be evaluated (only when status is `error`) */
  error?: { message: string; stack?: string };
};

export type FitnessReportSummary = {
  total: number;
  passed: number;
  warnings: number;
  failed: number;
  errors: number;
};

export type FitnessDiagnostic = {
  source: string;
  message: string;
};

export type FitnessReport = {
  schemaVersion: 1;
  evaluatedAt: string;
  /** The git commit the catalog was evaluated at, when it is in a git repository */
  catalogRevision: string | null;
  summary: FitnessReportSummary;
  functions: FitnessFunctionResult[];
  /** Problems with fitness files that are not functions' results, such as `*.fitness.ts` files outside a `fitness/` folder */
  diagnostics: FitnessDiagnostic[];
};
