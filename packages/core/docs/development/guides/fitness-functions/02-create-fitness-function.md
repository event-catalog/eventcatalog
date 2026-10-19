---
sidebar_position: 2
sidebar_label: Create a fitness function
title: Create a fitness function
description: Write a fitness function that requires every event to have an owner, run it, read the results and fix what it finds.
---

import PromptBox from '@site/src/components/MDX/PromptBox';

<PromptBox preview="Help me write my first EventCatalog fitness function">
Read these EventCatalog docs first:

- https://www.eventcatalog.dev/docs/development/guides/fitness-functions/what-are-fitness-functions.md
- https://www.eventcatalog.dev/docs/development/guides/fitness-functions/create-fitness-function.md
- https://www.eventcatalog.dev/docs/development/guides/fitness-functions/global-and-resource-functions.md
- https://www.eventcatalog.dev/docs/development/guides/fitness-functions/api-reference.md
- https://www.eventcatalog.dev/docs/development/guides/fitness-functions/examples.md

Then help me write an architecture fitness function for my EventCatalog.

What you need to know: an architecture fitness function is an automated check that my documented architecture still follows a rule my team agreed on. In EventCatalog, it is a TypeScript file ending in .fitness.ts, inside a fitness/ folder. Put it in the fitness/ folder at the root of the catalog for a rule about the whole catalog, or in a fitness/ folder inside a resource's folder (for example domains/Orders/fitness/) to be given that resource when it runs. The file's default export is created with defineFitnessFunction from @eventcatalog/fitness, and has an id, a name, an optional description, a severity of 'error' or 'warning', and a run function. run is given resource (the resource the file sits alongside, if any) and catalog, and returns an array of violations. Each violation has a message, and optionally the resources it is about (type, id and version), details and a suggestion. An empty array means the check passed.

Use catalog to get resources out of my catalog. It has the same read methods as the EventCatalog SDK, such as getEvents, getServices, getDomain, getSystem, getDataStores, getTeams and getGraph. Methods that write to the catalog are not available. The SDK reference is at https://www.eventcatalog.dev/docs/sdk.md

Start by asking me what kind of fitness function I want to build:

- What rule or architectural decision should it check? For example ownership, domain boundaries, coupling between services, deprecated messages or documentation standards.
- Should it check the whole catalog, or one domain, system, service or message?
- Should violations fail the check (error), or only be reported (warning)?

Before writing it, look at my catalog to see which frontmatter fields and relationships it actually documents, so the function reads data that exists. Then create the file in the right fitness/ folder, run npx eventcatalog fitness check from the root of my catalog, and explain the results to me.
</PromptBox>

Copy this prompt and paste it into your coding agent. It reads these docs, asks what rule you want to check, looks at what your catalog documents, then writes and runs the function for you. To write one yourself, follow the steps below.

An architecture fitness function is an automated check that tells you whether your architecture still follows a decision you made. "Services in the Ordering domain don't touch another domain's database" or "every event has an owner" stops being a line in a wiki page and becomes a check that passes or fails.

In EventCatalog, a fitness function is a TypeScript function that reads your catalog and returns a list of violations: the places where the architecture your catalog describes breaks the rule. An empty list means the check passed. If you've written a unit test, the shape will feel familiar. The difference is that a test checks how your code behaves, and a fitness function checks your documented architecture. Read [What are fitness functions?](./01-what-are-fitness-functions.md) for more on why teams use them.

## What you'll build

This guide takes you from an existing catalog to your first working fitness function. You'll write a rule that every event must have an owner, run it, see it fail, and fix the catalog. It takes about five minutes.

## What you need

- An EventCatalog project with `@eventcatalog/core` installed. If you don't have one, `npx @eventcatalog/create-eventcatalog@latest my-catalog` creates one with example content.

Run every command in this guide from the root of your catalog (the folder containing `eventcatalog.config.js`).

:::info[New catalogs come with fitness functions]
Catalogs created with `create-eventcatalog` already have a `fitness/` folder with two starter functions: "Every message has an owner" and "Every event has a producer". They also have `@eventcatalog/fitness` installed and an `npm run fitness` script that runs `eventcatalog fitness check`. Run `npm run fitness` to see them work, then follow this guide to write your own.
:::

## 1. Create a fitness function

Fitness functions are files ending in `.fitness.ts`, in a folder called `fitness/`. Create the folder at the root of your catalog and add a file:

```
my-catalog/
├── fitness/
│   └── event-ownership.fitness.ts
├── domains/
└── eventcatalog.config.js
```

```ts title="fitness/event-ownership.fitness.ts"
import { defineFitnessFunction } from '@eventcatalog/fitness';

export default defineFitnessFunction({
  id: 'event-ownership',
  name: 'Every event has an owner',
  description: 'Events without an owner have nobody to ask before they change.',
  severity: 'error',

  async run({ catalog }) {
    return [];
  },
});
```

Every fitness function is the default export of its file, created with `defineFitnessFunction`. It needs:

- an `id`, unique across your catalog,
- a `name`, which is what you'll see in the results,
- a `run` function, which returns the violations it finds. An empty array means the check passed.

`severity` is optional. `error` (the default) fails the check; `warning` reports violations without failing it.

:::tip[Editor support]
You don't need to install anything to run fitness functions: EventCatalog provides `@eventcatalog/fitness` when it loads them. Catalogs created with `create-eventcatalog` already have it installed for editor types. In an older catalog, add the package as a dev dependency to get types and autocomplete:

```bash
npm install --save-dev @eventcatalog/fitness
```

If your catalog has a `tsconfig.json`, make sure its `include` covers `**/fitness/**/*.ts`.
:::

## 2. Read the catalog

`run` is given a `catalog`: read-only access to your whole catalog, with the same methods and arguments as the [EventCatalog SDK](/docs/sdk). Use it to get every event:

```ts title="fitness/event-ownership.fitness.ts"
  async run({ catalog }) {
    const events = await catalog.getEvents({ latestOnly: true });
    return [];
  },
```

`latestOnly: true` returns the latest version of each event, so old versions you've kept under `versioned/` aren't checked. Methods that write to the catalog, like `writeEvent`, aren't available. See [the catalog API](./05-api-reference.md#catalog) for every method you can call.

## 3. Return a violation

Return one violation for each event without an owner:

```ts title="fitness/event-ownership.fitness.ts"
import { defineFitnessFunction } from '@eventcatalog/fitness';

export default defineFitnessFunction({
  id: 'event-ownership',
  name: 'Every event has an owner',
  description: 'Events without an owner have nobody to ask before they change.',
  severity: 'error',

  async run({ catalog }) {
    const events = await catalog.getEvents({ latestOnly: true });

    return events
      .filter((event) => !event.owners?.length)
      .map((event) => ({
        message: `${event.name} has no owners`,
        resources: [{ type: 'event', id: event.id, version: event.version }],
        suggestion: 'Add a team or user to the owners field in the frontmatter',
      }));
  },
});
```

A violation needs a `message`. The rest is optional, but worth filling in:

- `resources` lists the resources the violation is about. EventCatalog checks that each one exists in your catalog and records the version it checked.
- `suggestion` tells whoever reads the result how to fix it.
- `details` adds any extra explanation.

## 4. Run it

```bash
npx eventcatalog fitness check
```

In a catalog created with `create-eventcatalog`, `npm run fitness` does the same. EventCatalog finds every `*.fitness.ts` file in your catalog, runs each one, and prints the results. If an event has no owner, you'll see something like this:

```
EventCatalog Fitness

✗ Every event has an owner  1 violation
    • Order Amended has no owners
      Resources: order-amended (event)
      Suggestion: Add a team or user to the owners field in the frontmatter

1 fitness function evaluated

0 passed
1 failed

Report written to .eventcatalog/fitness/results.json
```

## 5. Read the results

Each function gets one line:

| Symbol | Result | Meaning |
|---|---|---|
| `✓` | `Passed` | The function returned no violations |
| `!` | `n warnings` | A `warning` function found violations. The check still passes |
| `✗` | `n violations` | An `error` function found violations. The check fails |
| `✗` | `Error` | The function couldn't run, for example because it threw an exception |

Under each line are the function's violations, with the resources they're about and the suggestion. Resources that aren't in your catalog are shown as `not found in the catalog`, which usually means a typo in the id or type.

Because a violation was found, the command exits with code `1`.

## 6. Fix the catalog and run it again

Add an owner to the event:

```md title="events/OrderAmended/index.mdx" {5-6}
---
id: order-amended
name: Order Amended
version: 1.0.0
owners:
  - ordering-platform
---
```

Run the check again:

```bash
npx eventcatalog fitness check
```

```
EventCatalog Fitness

✓ Every event has an owner  Passed

1 fitness function evaluated

1 passed

Report written to .eventcatalog/fitness/results.json
```

The command now exits with code `0`.

## Next steps

- [Run your fitness functions in CI](./04-run-in-ci.md), so every pull request is checked, and read the report each run writes.
- [Put fitness functions next to the resources they're about](./03-global-and-resource-functions.md), so a domain team can own its rules.
- Read the [API reference](./05-api-reference.md) for everything `run` is given and can return.
