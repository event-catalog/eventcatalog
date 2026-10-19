## @eventcatalog/fitness

Architecture fitness functions for [EventCatalog](https://www.eventcatalog.dev). Write your architecture rules in TypeScript, run them against your catalog locally or in CI, and get a report of what breaks them.

You decide what a healthy architecture looks like. EventCatalog gives each rule the catalog to inspect, runs it and reports the results.

> Fitness functions check the architecture your catalog **documents**. They don't inspect your running systems.

### Installation

`npx eventcatalog fitness check` runs fitness functions without installing anything else. Install the package for types and editor support:

```bash
npm install --save-dev @eventcatalog/fitness
```

### Write a fitness function

A fitness function is the default export of a `*.fitness.ts` file in a `fitness/` folder:

```ts
// fitness/events-have-owners.fitness.ts
import { defineFitnessFunction } from '@eventcatalog/fitness';

export default defineFitnessFunction({
  id: 'events-have-owners',
  name: 'Every event has an owner',
  severity: 'error', // or 'warning', which is reported without failing the check

  async run({ catalog }) {
    const events = (await catalog.getEvents({ latestOnly: true })) ?? [];

    // One violation per problem; an empty array means the rule passed
    return events
      .filter((event) => !event.owners?.length)
      .map((event) => ({
        message: `${event.name} has no owners`,
        resources: [{ type: 'event', id: event.id, version: event.version }],
        suggestion: 'Add the team responsible for the event to its owners.',
      }));
  },
});
```

### Where fitness functions live

```text
my-catalog/
├── fitness/                                  # Global rules: no `resource`
│   ├── events-have-owners.fitness.ts
│   └── naming/message-names.fitness.ts       # Folders inside fitness/ are fine
└── domains/
    └── Orders/
        ├── index.mdx
        └── fitness/
            └── domain-boundaries.fitness.ts  # `resource` is the Orders domain
```

- Only `*.fitness.ts` files are run. Other files (for example shared helpers) can be imported by fitness functions.
- A `fitness/` folder inside a resource's folder (a domain, system, service, event, command, query, channel, flow, entity, data store, data product, ADR or diagram) gives its functions that resource as `resource`. A folder inside `versioned/<version>/` gives that version.
- The location sets `resource`, not what a function can see: every function can query the whole catalog.
- `*.fitness.ts` files outside a `fitness/` folder are not run, and are reported as diagnostics.

### The context

`run({ resource, catalog })` gets:

| Name       | Description                                                                                                                                                                                               |
| ---------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `resource` | The resource the function sits alongside, with its `type` (`domain`, `service`, `event`, `container`, …), `id`, `version` and frontmatter. `undefined` for global functions.                              |
| `catalog`  | Read-only access to the catalog: the read methods of the [EventCatalog SDK](https://www.eventcatalog.dev/docs/development/sdk), such as `getEvents`, `getService`, `getGraph` and `getOwnersForResource`. |

`catalog` has no methods that write to the catalog, and each call returns a copy, so changing what it returns doesn't change what other calls or functions see.

### Violations

```ts
type FitnessViolation = {
  message: string;
  resources?: { type: string; id: string; version?: string }[]; // linked from the violation in EventCatalog
  details?: string;
  suggestion?: string;
};
```

Resources are matched to the catalog. References that don't match a resource are kept in the report, marked `resolved: false`.

### Run them

```bash
npx eventcatalog fitness check
# or, without @eventcatalog/core installed
npx @eventcatalog/cli fitness check
```

| Option              | Description                                                                               |
| ------------------- | ----------------------------------------------------------------------------------------- |
| `--output <path>`   | Where to write the report, relative to the catalog (`.eventcatalog/fitness/results.json`) |
| `--format <format>` | `text` (default) or `json`                                                                |

| Exit code | When                                                                       |
| --------- | -------------------------------------------------------------------------- |
| `0`       | Every function passed, or only warned                                      |
| `1`       | A function found error-severity violations, or could not be evaluated      |
| `2`       | The check could not run (for example, the catalog directory doesn't exist) |

A function that throws, returns something that isn't a list of violations, or can't be loaded is reported as an `error`, separately from violations.

### In CI

```yaml
# .github/workflows/fitness.yml
name: Architecture fitness
on: pull_request
jobs:
  fitness:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
      - run: npm ci
      - run: npx eventcatalog fitness check
```

### The report

Each run writes `.eventcatalog/fitness/results.json`: the time, the catalog's git commit, a summary and every function's status (`passed`, `warning`, `failed` or `error`), resource, violations and errors.

### Trust

Fitness functions are code from your catalog, run with the same access as any other script in your project. Only run fitness functions you trust, locally or in CI. EventCatalog never runs them in the browser or on page requests.

### Programmatic use

```ts
import { evaluateFitness, formatFitnessReport, getFitnessExitCode } from '@eventcatalog/fitness';

const report = await evaluateFitness({ dir: './my-catalog' });
console.log(formatFitnessReport(report));
process.exitCode = getFitnessExitCode(report);
```

### Documentation

See the [EventCatalog documentation](https://www.eventcatalog.dev/docs) for more.
