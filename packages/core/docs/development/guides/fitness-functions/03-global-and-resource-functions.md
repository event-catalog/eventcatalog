---
sidebar_position: 3
sidebar_label: Global and resource functions
title: Global and resource fitness functions
description: Put fitness functions at the root of your catalog for catalog-wide rules, or next to a domain, system, service or message so they're given that resource.
---

A fitness function can live in two places: the `fitness/` folder at the root of your catalog, or a `fitness/` folder inside a resource's folder. Where you put it decides which resource it's given when it runs. It doesn't limit what it can read: every function can query the whole catalog.

## Global fitness functions

Functions in the root `fitness/` folder are global. They aren't given a resource, so `resource` is `undefined`, and they check whatever they read from `catalog`.

```
fitness/
└── event-ownership.fitness.ts
```

Use them for standards that apply to everything, like ownership or schema rules. A platform team typically owns this folder.

## Resource fitness functions

Functions in a `fitness/` folder inside a resource's folder are given that resource as `resource`. This lets the team that owns a domain, system or service keep its rules next to its documentation.

```
domains/
└── Ordering/
    ├── index.mdx
    └── fitness/
        └── domain-boundaries.fitness.ts   # resource is the Ordering domain
```

The resource includes its frontmatter, as the SDK returns it, plus a `type` field. Check `type` before using fields that only some resources have, and TypeScript narrows the resource for you:

```ts title="domains/Ordering/fitness/domain-boundaries.fitness.ts"
import { defineFitnessFunction } from '@eventcatalog/fitness';

export default defineFitnessFunction({
  id: 'ordering-domain-boundaries',
  name: 'Ordering services only use Ordering data stores',
  description: 'Services in the Ordering domain must not read from or write to data stores that belong to other domains.',

  async run({ resource, catalog }) {
    if (resource?.type !== 'domain') return [];

    // The data stores and services that belong to the domain, through its systems
    const ownedStores = new Set<string>();
    const services = [...(resource.services ?? [])];
    for (const pointer of resource.systems ?? []) {
      const system = await catalog.getSystem(pointer.id, pointer.version);
      system?.containers?.forEach((container) => ownedStores.add(container.id));
      services.push(...(system?.services ?? []));
    }

    const violations = [];
    for (const pointer of services) {
      const service = await catalog.getService(pointer.id, pointer.version);
      if (!service) continue;

      for (const store of [...(service.readsFrom ?? []), ...(service.writesTo ?? [])]) {
        if (ownedStores.has(store.id)) continue;
        violations.push({
          message: `${service.name} uses ${store.id}, which belongs to another domain`,
          resources: [
            { type: 'service', id: service.id, version: service.version },
            { type: 'container', id: store.id },
          ],
          suggestion: 'Consume an event or call an API owned by the other domain instead',
        });
      }
    }
    return violations;
  },
});
```

The function starts from the domain it's given, then uses `catalog` to read the domain's [systems](/docs/development/guides/systems/introduction), their services, and the [data stores](/docs/development/guides/resources/data/introduction) those services [read from and write to](/docs/development/guides/resources/data/add-read-write-relationships). The resource sets where the rule starts, not how far it can look.

A service function works the same way. This one warns when a service has too many dependencies:

```ts title="services/OrderService/fitness/max-dependencies.fitness.ts"
import { defineFitnessFunction } from '@eventcatalog/fitness';

const MAX_DEPENDENCIES = 6;

export default defineFitnessFunction({
  id: 'order-service-max-dependencies',
  name: 'Order Service stays loosely coupled',
  severity: 'warning',

  run({ resource }) {
    if (resource?.type !== 'service') return [];

    const dependencies = [...(resource.receives ?? []), ...(resource.readsFrom ?? []), ...(resource.writesTo ?? [])];
    if (dependencies.length <= MAX_DEPENDENCIES) return [];

    return [
      {
        message: `${resource.name} has ${dependencies.length} dependencies (the limit is ${MAX_DEPENDENCIES})`,
        resources: [{ type: 'service', id: resource.id, version: resource.version }],
        details: 'Counts the messages it receives and the data stores it reads from or writes to.',
        suggestion: 'Split the service, or move work behind events another service handles',
      },
    ];
  },
});
```

`run` can be synchronous when it doesn't need to read the catalog.

In the results, resource functions are labelled with the resource's id:

```
✗ ordering / Ordering services only use Ordering data stores  1 violation
    • Order Service uses payment-database, which belongs to another domain
      Resources: order-service (service), payment-database (container)
      Suggestion: Consume an event or call an API owned by the other domain instead
! order-service / Order Service stays loosely coupled         1 warning
    • Order Service has 7 dependencies (the limit is 6)
      Resources: order-service (service)
      Counts the messages it receives and the data stores it reads from or writes to.
      Suggestion: Split the service, or move work behind events another service handles
```

## Which resource a function is given

EventCatalog works out the resource from the folder that contains `fitness/`. That folder must have an `index.mdx` or `index.md` with an `id`, and it must sit inside one of these folders:

| Folder | Resource type |
|---|---|
| `domains/`, `subdomains/` | `domain` |
| `systems/` | `system` |
| `services/` | `service` |
| `agents/` | `agent` |
| `events/` | `event` |
| `commands/` | `command` |
| `queries/` | `query` |
| `flows/` | `flow` |
| `channels/` | `channel` |
| `entities/` | `entity` |
| `containers/` | `container` |
| `data-products/` | `data-product` |
| `adrs/` | `adr` |
| `diagrams/` | `diagram` |

Resources can be nested, as they can anywhere in EventCatalog. A function is given the resource whose folder holds its `fitness/` folder, not that resource's parents:

```
domains/Ordering/
├── fitness/                               # the Ordering domain
└── systems/order-management-system/
    ├── fitness/                           # the order-management-system system
    └── services/OrderService/
        ├── fitness/                       # the OrderService service
        └── events/OrderCreated/
            └── fitness/                   # the OrderCreated event
```

Inside a `fitness/` folder you can organise files into subfolders. They're given the same resource:

```
domains/Ordering/fitness/
├── boundaries/
│   └── data-stores.fitness.ts             # still the Ordering domain
└── helpers.ts
```

## Versions

A resource function is given the version of the resource in its folder. In the resource's main folder, that's the version in its `index.mdx`, usually the latest. To check an older version, put the function in that version's folder:

```
services/OrderService/
├── index.mdx                              # version 1.0.0
├── fitness/
│   └── max-dependencies.fitness.ts        # given OrderService 1.0.0
└── versioned/
    └── 0.0.1/
        ├── index.mdx
        └── fitness/
            └── legacy.fitness.ts          # given OrderService 0.0.1
```

Each file runs once, against the version it sits alongside. A function in the main folder doesn't run against the versions under `versioned/`. See [versioning resources](/docs/development/guides/versioning-resources) for how versions are stored.

## Rules for fitness files

- Only files ending in `.fitness.ts` are run. Other files in a `fitness/` folder, like `helpers.ts`, are not, so you can use them for code your functions share and import it with a relative path.
- A `*.fitness.ts` file outside a `fitness/` folder isn't run. EventCatalog lists it as a warning at the end of the results so you can move it. It doesn't fail the check.
- `node_modules/`, `dist/` and folders that start with a `.` are ignored.
- Fitness functions in `federated/` aren't run. If your catalog [federates](/docs/federation/overview) other catalogs, only your own catalog's functions run, never theirs.
- If EventCatalog can't work out a function's resource, for example because the folder has no `index.mdx`, has no `id`, or isn't in one of the folders above, the function isn't run and is reported as an `Error`.
- Ids must be unique across the catalog. If two files use the same `id`, the first one (in path order) runs and the others are reported as errors.

## Related

- [Create a fitness function](./02-create-fitness-function.md)
- [API reference](./05-api-reference.md): the `resource` and `catalog` types
