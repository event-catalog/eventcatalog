---
sidebar_position: 6
sidebar_label: Examples
title: Fitness function examples
description: Ready-to-use fitness functions for team ownership, shared databases, coupling, circular commands, deprecated messages and business-critical services.
---

These fitness functions check rules teams commonly agree on. Copy one into a `fitness/` folder in your catalog, change the names and limits to match your architecture, and run `npx eventcatalog fitness check`.

Each one only works with the relationships and metadata your catalog records. A rule about data stores needs `writesTo` on your services, a rule about deprecation needs `deprecated` on your messages, and so on. If a rule passes when you expect it to fail, check that your catalog documents what it reads.

| Example | Checks | Severity |
|---|---|---|
| [Every service is owned by a team](#every-service-is-owned-by-a-team) | Services list a team, not only people, in `owners` | `error` |
| [Each data store has one writer](#each-data-store-has-one-writer) | No data store is written to by more than one service | `warning` |
| [Services stay loosely coupled](#services-stay-loosely-coupled) | No service receives more than a set number of messages | `warning` |
| [No circular commands](#no-circular-commands) | Services don't send commands to each other in a loop | `error` |
| [No deprecated messages](#no-deprecated-messages) | No service sends or receives a deprecated message | `warning` |
| [Business-critical services are documented](#business-critical-services-are-documented) | Services with a "Business Critical" badge have a repository, owners and a specification | `error` |
| [Domain boundaries](#domain-boundaries) | A domain's services only use its own data stores | `error` |

## Every service is owned by a team

`owners` can list [teams and users](/docs/development/guides/owners/what-are-teams-and-users). A service owned only by a person loses its owner when that person moves on. This rule checks each owner with `catalog.getTeam`, and fails services that don't have at least one team.

```ts title="fitness/team-ownership.fitness.ts"
import { defineFitnessFunction } from '@eventcatalog/fitness';

export default defineFitnessFunction({
  id: 'services-owned-by-teams',
  name: 'Every service is owned by a team',
  description: 'People move on. A team keeps owning the service when they do.',

  async run({ catalog }) {
    const services = await catalog.getServices({ latestOnly: true });
    const violations = [];

    for (const service of services) {
      // owners can list teams and users. Keep the ones that are teams.
      const teams = [];
      for (const owner of service.owners ?? []) {
        if (await catalog.getTeam(owner)) teams.push(owner);
      }

      if (teams.length === 0) {
        violations.push({
          message: `${service.name} is not owned by a team`,
          resources: [{ type: 'service', id: service.id, version: service.version }],
          suggestion: 'Add the owning team to the owners field',
        });
      }
    }

    return violations;
  },
});
```

```
✗ Every service is owned by a team  1 violation
    • Payment Worker is not owned by a team
      Resources: payment-worker (service)
      Suggestion: Add the owning team to the owners field
```

## Each data store has one writer

When several services write to the same [data store](/docs/development/guides/resources/data/introduction), none of them can change its schema without coordinating with the others. This rule groups services by the data stores in their [`writesTo`](/docs/development/guides/resources/data/add-read-write-relationships) and warns about any data store with more than one writer.

```ts title="fitness/single-writer.fitness.ts"
import { defineFitnessFunction } from '@eventcatalog/fitness';

export default defineFitnessFunction({
  id: 'single-writer-per-data-store',
  name: 'Each data store has one writer',
  description: 'A data store written by several services is a shared database: none of them can change its schema safely.',
  severity: 'warning',

  async run({ catalog }) {
    const services = await catalog.getServices({ latestOnly: true });

    // Group the services by the data stores they write to
    const writers = new Map<string, typeof services>();
    for (const service of services) {
      for (const store of service.writesTo ?? []) {
        writers.set(store.id, [...(writers.get(store.id) ?? []), service]);
      }
    }

    return [...writers]
      .filter(([, services]) => services.length > 1)
      .map(([storeId, services]) => ({
        message: `${storeId} is written to by ${services.length} services`,
        // The data store first, then every service that writes to it
        resources: [
          { type: 'container', id: storeId },
          ...services.map((service) => ({ type: 'service', id: service.id, version: service.version })),
        ],
        suggestion: 'Give the data store one owning service, and have the others send it commands or events',
      }));
  },
});
```

```
! Each data store has one writer  5 warnings
    • review-database is written to by 2 services
      Resources: review-database (container), review-moderation-worker (service), review-api (service)
      Suggestion: Give the data store one owning service, and have the others send it commands or events
    • payment-database is written to by 2 services
      Resources: payment-database (container), payment-worker (service), payment-api (service)
      Suggestion: Give the data store one owning service, and have the others send it commands or events
    ...
```

A worker and an API that share a database can be a deliberate choice. Start this rule as a `warning`, and change it to `error` once the shared data stores you've decided to keep are documented.

## Services stay loosely coupled

A service that receives many messages usually has more than one reason to change. This rule warns when a service receives more messages than a limit you choose.

```ts title="fitness/max-dependencies.fitness.ts"
import { defineFitnessFunction } from '@eventcatalog/fitness';

const MAX_MESSAGES_RECEIVED = 8;

export default defineFitnessFunction({
  id: 'max-messages-received',
  name: `Services receive at most ${MAX_MESSAGES_RECEIVED} messages`,
  severity: 'warning',

  async run({ catalog }) {
    const services = await catalog.getServices({ latestOnly: true });

    return services
      .filter((service) => (service.receives ?? []).length > MAX_MESSAGES_RECEIVED)
      .map((service) => ({
        message: `${service.name} receives ${service.receives!.length} messages`,
        resources: [{ type: 'service', id: service.id, version: service.version }],
        details: 'A service that reacts to many messages usually has more than one reason to change.',
        suggestion: 'Look for a group of messages that could move to a service of its own',
      }));
  },
});
```

To set a different limit for one service, put a copy of the rule in that service's `fitness/` folder and check `resource` instead of every service. See [resource fitness functions](./03-global-and-resource-functions.md#resource-fitness-functions) for an example.

## No circular commands

Events often go back and forth between services, and that's fine: each service reacts to what happened. Commands are different. If service A tells B what to do, and B tells A what to do, the two can't be changed or deployed independently.

This rule builds a graph of which services send commands to which, from what each service `sends` and `receives`, and reports every loop it finds.

```ts title="fitness/no-circular-commands.fitness.ts"
import { defineFitnessFunction } from '@eventcatalog/fitness';

export default defineFitnessFunction({
  id: 'no-circular-commands',
  name: 'Services do not send commands in a circle',
  description: 'If A commands B and B commands A, neither can be deployed or understood without the other.',

  async run({ catalog }) {
    const services = await catalog.getServices({ latestOnly: true });
    const commands = new Set((await catalog.getCommands({ latestOnly: true })).map((command) => command.id));

    // Who sends each command, and who receives it
    const senders = new Map<string, string[]>();
    for (const service of services) {
      for (const message of service.sends ?? []) {
        if (commands.has(message.id)) senders.set(message.id, [...(senders.get(message.id) ?? []), service.id]);
      }
    }

    // An edge from each sender to the service that receives its command
    const edges = new Map<string, Set<string>>();
    for (const service of services) {
      for (const message of service.receives ?? []) {
        for (const sender of senders.get(message.id) ?? []) {
          if (sender === service.id) continue;
          edges.set(sender, (edges.get(sender) ?? new Set()).add(service.id));
        }
      }
    }

    // Depth-first search. Reaching a service that is already on the path means there's a cycle.
    const cycles = new Map<string, string[]>();
    const visit = (id: string, path: string[]) => {
      if (path.includes(id)) {
        const cycle = path.slice(path.indexOf(id));
        // Report each cycle once, however it was reached
        cycles.set([...cycle].sort().join(','), cycle);
        return;
      }
      for (const next of edges.get(id) ?? []) visit(next, [...path, id]);
    };
    for (const id of edges.keys()) visit(id, []);

    return [...cycles.values()].map((cycle) => ({
      message: `Commands go round in a circle: ${[...cycle, cycle[0]].join(' → ')}`,
      resources: cycle.map((id) => ({ type: 'service', id })),
      suggestion: 'Replace one of the commands with an event, so one service reacts instead of being told',
    }));
  },
});
```

```
✗ Services do not send commands in a circle  1 violation
    • Commands go round in a circle: order-service → checkout-orchestrator → order-service
      Resources: order-service (service), checkout-orchestrator (service)
      Suggestion: Replace one of the commands with an event, so one service reacts instead of being told
```

To check for loops through events and queries too, remove the `commands.has(...)` check. Expect more results: in an event-driven architecture, many of those loops are intended.

## No deprecated messages

When you [deprecate a message](/docs/development/guides/resources/messages/versioning-and-lifecycle/deprecate-messages), the services still using it need to move off it. This rule finds every service that still sends or receives a deprecated event, command or query, and includes the deprecation message from the frontmatter in the result.

```ts title="fitness/no-deprecated-messages.fitness.ts"
import { defineFitnessFunction } from '@eventcatalog/fitness';

export default defineFitnessFunction({
  id: 'no-deprecated-messages',
  name: 'Services do not use deprecated messages',
  severity: 'warning',

  async run({ catalog }) {
    // Every deprecated event, command and query, by id
    const messages = [
      ...(await catalog.getEvents({ latestOnly: true })).map((message) => ({ ...message, type: 'event' })),
      ...(await catalog.getCommands({ latestOnly: true })).map((message) => ({ ...message, type: 'command' })),
      ...(await catalog.getQueries({ latestOnly: true })).map((message) => ({ ...message, type: 'query' })),
    ];
    const deprecated = new Map(messages.filter((message) => message.deprecated).map((message) => [message.id, message]));

    const services = await catalog.getServices({ latestOnly: true });
    const violations = [];

    for (const service of services) {
      for (const pointer of [...(service.sends ?? []), ...(service.receives ?? [])]) {
        const message = deprecated.get(pointer.id);
        if (!message) continue;

        violations.push({
          message: `${service.name} still uses ${message.name}, which is deprecated`,
          resources: [
            { type: 'service', id: service.id, version: service.version },
            { type: message.type, id: message.id, version: message.version },
          ],
          // Use the deprecation message from the frontmatter when there is one
          details: typeof message.deprecated === 'object' ? message.deprecated.message : undefined,
        });
      }
    }

    return violations;
  },
});
```

```
! Services do not use deprecated messages  1 warning
    • Order Service still uses Order Amended, which is deprecated
      Resources: order-service (service), order-amended (event)
      Use OrderUpdated instead
```

## Business-critical services are documented

Some services need more documentation than others. This rule finds services marked as business-critical with a badge, and checks each one has a repository, owners and an API specification.

```ts title="fitness/critical-services.fitness.ts"
import { defineFitnessFunction } from '@eventcatalog/fitness';

export default defineFitnessFunction({
  id: 'critical-services-documented',
  name: 'Business-critical services are fully documented',

  async run({ catalog }) {
    const services = await catalog.getServices({ latestOnly: true });

    // Services are marked as critical with a badge in their frontmatter
    const critical = services.filter((service) =>
      service.badges?.some((badge) => badge.content === 'Business Critical')
    );

    const violations = [];
    for (const service of critical) {
      const resources = [{ type: 'service', id: service.id, version: service.version }];
      if (!service.repository?.url) {
        violations.push({ message: `${service.name} has no repository`, resources });
      }
      if (!service.owners?.length) {
        violations.push({ message: `${service.name} has no owners`, resources });
      }
      if (!service.specifications) {
        violations.push({ message: `${service.name} has no API specification`, resources });
      }
    }
    return violations;
  },
});
```

The badge is one way to mark a service. You can use any frontmatter your catalog agrees on, for example a custom `x-tier: critical` property, and check `service['x-tier'] === 'critical'` instead.

## Domain boundaries

A domain's services should only use the domain's own data stores. This rule lives in the domain's folder, so it's given the domain as `resource`, and the domain team owns it. The full example is on [Global and resource fitness functions](./03-global-and-resource-functions.md#resource-fitness-functions).

## Share code between fitness functions

Only files ending in `.fitness.ts` are run, so you can keep shared code in other files in a `fitness/` folder and import it. Type the catalog with `ReadOnlyCatalog`:

```ts title="fitness/helpers.ts"
import type { ReadOnlyCatalog } from '@eventcatalog/fitness';

/** The latest version of every event, command and query, with its type */
export const getMessages = async (catalog: ReadOnlyCatalog) => [
  ...(await catalog.getEvents({ latestOnly: true })).map((message) => ({ ...message, type: 'event' as const })),
  ...(await catalog.getCommands({ latestOnly: true })).map((message) => ({ ...message, type: 'command' as const })),
  ...(await catalog.getQueries({ latestOnly: true })).map((message) => ({ ...message, type: 'query' as const })),
];
```

```ts title="fitness/message-summaries.fitness.ts"
import { defineFitnessFunction } from '@eventcatalog/fitness';
import { getMessages } from './helpers';

export default defineFitnessFunction({
  id: 'message-summaries',
  name: 'Every message has a summary',
  severity: 'warning',

  async run({ catalog }) {
    const messages = await getMessages(catalog);

    return messages
      .filter((message) => !message.summary?.trim())
      .map((message) => ({
        message: `${message.name} has no summary`,
        resources: [{ type: message.type, id: message.id, version: message.version }],
      }));
  },
});
```

## Related

- [Create a fitness function](./02-create-fitness-function.md)
- [API reference](./05-api-reference.md): everything `run` is given and can return
- [Run in CI](./04-run-in-ci.md)
