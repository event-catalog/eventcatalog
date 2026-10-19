---
sidebar_position: 5
sidebar_label: API reference
title: Fitness function API reference
description: defineFitnessFunction, the run context, the resource and catalog it is given, the violation format, and the schema of the results report.
---

Everything on this page is exported from `@eventcatalog/fitness`. Import the types you need:

```ts
import { defineFitnessFunction } from '@eventcatalog/fitness';
import type { FitnessContext, FitnessViolation } from '@eventcatalog/fitness';
```

## `defineFitnessFunction`

```ts
defineFitnessFunction<T extends FitnessFunction>(definition: T): T
```

Defines a fitness function. Make it the default export of a `*.fitness.ts` file in a [`fitness/` folder](./03-global-and-resource-functions.md):

```ts
export default defineFitnessFunction({
  id: 'event-ownership',
  name: 'Every event has an owner',
  async run({ resource, catalog }) {
    return [];
  },
});
```

It returns the definition unchanged, and throws if the definition is invalid (the runner reports that as an `Error` for the file).

### `FitnessFunction`

| Property | Type | Required | Description |
|---|---|---|---|
| `id` | `string` | Yes | Identifies the function. Must be unique across the catalog |
| `name` | `string` | Yes | Shown in the results |
| `description` | `string` | No | What the function checks. Included in the report |
| `severity` | `'error' \| 'warning'` | No | `error` (the default) fails the check when violations are found. `warning` reports them without failing it |
| `run` | `(context: FitnessContext) => FitnessViolation[] \| Promise<FitnessViolation[]>` | Yes | Checks the architecture and returns the violations it finds. An empty array means the check passed |

```ts
type FitnessFunction = {
  id: string;
  name: string;
  description?: string;
  severity?: 'error' | 'warning';
  run(context: FitnessContext): Promise<FitnessViolation[]> | FitnessViolation[];
};
```

## The run context

`run` is given one argument:

```ts
type FitnessContext = {
  resource?: CatalogResource;
  catalog: ReadOnlyCatalog;
};
```

### `resource`

The resource the function sits alongside, as the SDK returns it, with a `type` field added. For `domains/Ordering/fitness/boundaries.fitness.ts` it's the Ordering domain. For functions in the root `fitness/` folder it's `undefined`.

`CatalogResource` is a union of every resource type, so checking `type` narrows it:

```ts
async run({ resource }) {
  if (resource?.type !== 'service') return [];
  resource.receives; // resource is a Service here
  return [];
}
```

| `type` | SDK type |
|---|---|
| `'domain'` | `Domain` |
| `'system'` | `System` |
| `'service'` | `Service` |
| `'agent'` | `Agent` |
| `'event'` | `Event` |
| `'command'` | `Command` |
| `'query'` | `Query` |
| `'flow'` | `Flow` |
| `'channel'` | `Channel` |
| `'entity'` | `Entity` |
| `'container'` | `Container` |
| `'data-product'` | `DataProduct` |
| `'adr'` | `Adr` |
| `'diagram'` | `Diagram` |

The SDK types are exported from `@eventcatalog/sdk`. See [which resource a function is given](./03-global-and-resource-functions.md#which-resource-a-function-is-given) for how the folder maps to a resource.

### `catalog`

Read-only access to the whole catalog. Its methods are the [EventCatalog SDK](/docs/sdk) methods that read the catalog, with the same arguments and return values. Methods that write to the catalog aren't on it.

```ts
const events = await catalog.getEvents({ latestOnly: true });
const service = await catalog.getService('order-service');
const graph = await catalog.getGraph({ type: 'domain', id: 'ordering' }, { flat: true });
```

Every call returns a copy, so changing a resource you read doesn't change what the next call, or the next function, sees.

A getter like `getService` returns `undefined` when the resource doesn't exist. Check for it before using the result.

| Area | Methods |
|---|---|
| **Messages** | `getEvent`, `getEvents`, `eventHasVersion`, `getExamplesFromEvent`, `getCommand`, `getCommands`, `commandHasVersion`, `getExamplesFromCommand`, `getQuery`, `getQueries`, `queryHasVersion`, `getExamplesFromQuery`, `getMessageBySchemaPath`, `getProducersAndConsumersForMessage`, `getConsumersOfSchema`, `getProducersOfSchema`, `getSchemaForMessage` |
| **Architecture** | `getDomain`, `getDomains`, `domainHasVersion`, `getUbiquitousLanguageFromDomain`, `getSystem`, `getSystems`, `systemHasVersion`, `getService`, `getServices`, `serviceHasVersion`, `getSpecificationFilesForService`, `getAgent`, `getAgents`, `agentHasVersion`, `getChannel`, `getChannels`, `channelHasVersion`, `getFlow`, `getFlows`, `flowHasVersion`, `getEntity`, `getEntities`, `entityHasVersion`, `getDataStore`, `getDataStores`, `dataStoreHasVersion`, `getDataProduct`, `getDataProducts`, `dataProductHasVersion`, `getDiagram`, `getDiagrams`, `diagramHasVersion`, `getAdr`, `getAdrs`, `adrHasVersion` |
| **People and docs** | `getTeam`, `getTeams`, `getUser`, `getUsers`, `getOwnersForResource`, `getCustomDoc`, `getCustomDocs`, `getChangelog` |
| **Relationships** | `getGraph`, `getResourcesByProperty`, `getResourcePath`, `getResourceFolderName`, `getEventCatalogConfigurationFile` |

`getGraph` walks the relationships from a resource. See the [architecture graph](/docs/development/guides/architecture-graph) for what it returns.

## Violations

`run` returns an array of violations:

```ts
type FitnessViolation = {
  message: string;
  resources?: FitnessResourceReference[];
  details?: string;
  suggestion?: string;
};
```

| Property | Type | Required | Description |
|---|---|---|---|
| `message` | `string` | Yes | What's wrong. One line, shown as the violation |
| `resources` | `FitnessResourceReference[]` | No | The resources the violation is about |
| `details` | `string` | No | More explanation, shown under the resources |
| `suggestion` | `string` | No | How to fix it |

```ts
return [
  {
    message: 'Order Service uses payment-database, which belongs to another domain',
    resources: [
      { type: 'service', id: 'order-service', version: '1.0.0' },
      { type: 'container', id: 'payment-database' },
    ],
    suggestion: 'Consume an event or call an API owned by the other domain instead',
  },
];
```

### Resource references

```ts
type FitnessResourceReference = {
  type: string;
  id: string;
  version?: string;
};
```

EventCatalog looks up every reference in the catalog and records in the report whether it was found (`resolved`). Without a `version`, it resolves to the latest version and records that version, so the report says exactly which version was checked.

`type` can be any of these:

| `type` | Also accepted |
|---|---|
| `domain` | `subdomain` |
| `system` | |
| `service` | |
| `agent` | |
| `event` | |
| `command` | |
| `query` | |
| `flow` | |
| `channel` | |
| `entity` | |
| `container` | `dataStore` |
| `data-product` | `dataProduct` |
| `adr` | |
| `diagram` | |
| `team` | |
| `user` | |

Types are matched without regard to case. A reference with an unknown type, or to a resource that doesn't exist, is kept in the report with `resolved: false` and shown as `not found in the catalog`. It doesn't stop the function.

## Errors

A function is reported with the status `error`, and fails the check, when:

- it throws, or the promise it returns rejects,
- it returns something other than an array,
- a violation isn't an object, or has no `message`, or `details`, `suggestion`, `resources` or a reference has the wrong type,
- the file has no default export, fails to load, or the export isn't a valid definition,
- its `id` is already used by another function,
- the resource it sits alongside can't be found.

The other functions still run. The report records the error's `message` and, for exceptions, its `stack`, with paths relative to the catalog.

To report something you found as a problem in the architecture, return a violation. Throw only when the function itself can't do its job.

## The report

`eventcatalog fitness check` writes the results to `.eventcatalog/fitness/results.json` (change it with [`--output`](./04-run-in-ci.md#the-command)). These types are exported for tools that read it.

```ts
type FitnessReport = {
  schemaVersion: 1;
  evaluatedAt: string;               // ISO 8601
  catalogRevision: string | null;    // short git commit, or null outside a git repository
  summary: {
    total: number;
    passed: number;
    warnings: number;
    failed: number;
    errors: number;
  };
  functions: FitnessFunctionResult[];
  diagnostics: { source: string; message: string }[];
};

type FitnessFunctionResult = {
  id: string;
  name: string;
  description?: string;
  severity: 'error' | 'warning';
  status: 'passed' | 'warning' | 'failed' | 'error' | 'not_run';
  source: string;                    // path of the file, relative to the catalog
  scope: { type: CatalogResourceType; id: string; version?: string } | null;
  violations: {
    message: string;
    resources: { type: string; id: string; version?: string; resolved: boolean }[];
    details?: string;
    suggestion?: string;
  }[];
  error?: { message: string; stack?: string };
};
```

| `status` | Meaning |
|---|---|
| `passed` | The function ran and found no violations |
| `warning` | A `warning` function found violations |
| `failed` | An `error` function found violations |
| `error` | The function couldn't be run. See `error` |
| `not_run` | The function has no result |

`scope` is the resource the function sits alongside, or `null` for functions in the root `fitness/` folder. Its `version` is left out for resources that don't have one. `diagnostics` lists fitness files that weren't run because they aren't in a `fitness/` folder.

## Running fitness functions from code

`@eventcatalog/fitness` also exports what the command uses, for running checks from your own scripts:

| Export | Description |
|---|---|
| `runFitnessCheck({ dir, output?, format?, color? })` | Does what `eventcatalog fitness check` does: runs the functions, writes the report, prints the results, and returns the exit code (`0`, `1` or `2`) |
| `evaluateFitness({ dir })` | Runs the functions and returns the `FitnessReport`, without writing or printing anything |
| `formatFitnessReport(report, { color? })` | The text the command prints for a report |
| `writeFitnessReport(report, path)` | Writes a report as JSON |
| `getFitnessExitCode(report)` | `1` when a function failed or couldn't be run, otherwise `0` |
| `discoverFitnessFiles(dir)` | The fitness files in a catalog and the resource each one sits alongside |

```ts
import { evaluateFitness } from '@eventcatalog/fitness';

const report = await evaluateFitness({ dir: './my-catalog' });
console.log(`${report.summary.failed} failed`);
```
