---
sidebar_position: 1
keywords:
- architecture fitness functions
- architecture rules
- architecture governance
- domain boundaries
- CI/CD
sidebar_label: What are fitness functions?
title: What are fitness functions?
description: Architecture fitness functions are your architecture rules written as TypeScript, run against your catalog to show which resources break them.
---

An architecture fitness function is a rule about your architecture, written as code. You write a TypeScript function that reads your catalog through the [EventCatalog SDK](/docs/sdk) and returns a list of violations. EventCatalog finds your functions, runs them, prints the results and writes them to a report.

```ts title="fitness/event-ownership.fitness.ts"
import { defineFitnessFunction } from '@eventcatalog/fitness';

export default defineFitnessFunction({
  id: 'event-ownership',
  name: 'Every event has an owner',

  async run({ catalog }) {
    const events = await catalog.getEvents({ latestOnly: true });

    return events
      .filter((event) => !event.owners?.length)
      .map((event) => ({
        message: `${event.name} has no owners`,
        resources: [{ type: 'event', id: event.id, version: event.version }],
      }));
  },
});
```

```bash
npx eventcatalog fitness check
```

```
EventCatalog Fitness

✗ Every event has an owner  1 violation
    • Order Amended has no owners
      Resources: order-amended (event)

1 fitness function evaluated

0 passed
1 failed

Report written to .eventcatalog/fitness/results.json
```

## Why use them

Teams agree on how their architecture should look: which domain owns which data, how coupled a service is allowed to be, what every event needs before it's published. Those decisions usually live in a wiki page or an ADR, and nothing tells you when the architecture stops following them.

Fitness functions turn those decisions into checks you can run on every change to your catalog. For example:

- Services in the Ordering domain don't read from or write to another domain's data stores.
- Every event has an owner and a schema.
- A service receives no more than a set number of messages.
- Nothing depends on a deprecated service.
- Business-critical services have the metadata your organization requires.

What you can check depends on what your catalog records. A rule about data store access needs `readsFrom` and `writesTo` on your services; a rule about ownership needs `owners`. Fitness functions read your documented architecture. They don't inspect your application code or production traffic.

## How they differ from tests

If you have written a unit test, you already know the shape: some code runs, makes assertions, and the result is pass or fail. The difference is what's being checked. A test checks how your application behaves. A fitness function checks the architecture your catalog describes: its domains, systems, services, messages, data stores, owners and the relationships between them.

## Where fitness functions live

Fitness functions are `*.fitness.ts` files in a `fitness/` folder. Put the folder in one of two places:

- **The root of your catalog** (`fitness/`), for rules that apply across the whole catalog.
- **A resource's folder** (`domains/Ordering/fitness/`, `services/OrderService/fitness/`), for rules about that resource. The function is given the resource it sits alongside, so a domain team can keep its rules next to its domain.

```
my-catalog/
├── fitness/
│   └── event-ownership.fitness.ts            # runs against the whole catalog
├── domains/
│   └── Ordering/
│       ├── index.mdx
│       └── fitness/
│           └── domain-boundaries.fitness.ts  # given the Ordering domain
└── eventcatalog.config.js
```

Every function can read the whole catalog, wherever it lives. See [Global and resource fitness functions](./03-global-and-resource-functions.md) for the folders EventCatalog recognises and how versions are handled.

## How results are reported

`eventcatalog fitness check` runs every function, one at a time, and:

- prints each function's result, its violations and any errors to the terminal,
- writes the full results to `.eventcatalog/fitness/results.json`,
- exits with `1` if any function failed or couldn't run, so CI fails the build.

Each violation lists the resources it's about. EventCatalog looks each one up in your catalog and records whether it exists and which version was checked, so you can go straight from a violation to the resource that caused it.

Results are shown in the terminal and in the JSON report. They aren't shown on pages in your catalog.

## Where to go next

- **[Create a fitness function](./02-create-fitness-function.md)**: write your first fitness function, run it and fix what it finds. Start here.
- **[Global and resource fitness functions](./03-global-and-resource-functions.md)**: where to put functions, and which resource each one is given.
- **[Run in CI](./04-run-in-ci.md)**: the command, its output, exit codes, the report file, and a GitHub Actions workflow.
- **[API reference](./05-api-reference.md)**: `defineFitnessFunction`, the run context, the violation format and the report schema.
- **[Examples](./06-examples.md)**: ready-to-use rules for team ownership, shared databases, coupling, circular commands, deprecated messages and more.

## Issues?

If you have any issues or feedback, please open an issue on [GitHub](https://github.com/event-catalog/eventcatalog/issues) or join our [Discord server](https://eventcatalog.dev/discord).
