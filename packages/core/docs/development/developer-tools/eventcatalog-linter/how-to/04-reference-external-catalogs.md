---
sidebar_position: 4
sidebar_label: Reference external catalogs
title: Reference resources documented in other catalogs
description: Stop the linter reporting missing resources when a service sends or receives messages that another team documents.
---

Use this guide when your catalog references resources that live somewhere else — typically another team's catalog — and the linter reports them as missing:

```
services/order-service/index.mdx
  11:9 ✖ error Referenced event/command/query "PaymentAuthorised" does not exist [receives[0]] (refs/resource-exists)
```

## Declare the resources as dependencies

EventCatalog lets you list external resources in the `dependencies` section of `eventcatalog.config.js`. EventCatalog renders a placeholder page for each one, and the linter treats them as existing:

```js title="eventcatalog.config.js"
export default {
  // ...
  dependencies: {
    events: [
      { id: 'PaymentAuthorised' },
      { id: 'PaymentDeclined', version: '2.0.0' },
    ],
    services: [{ id: 'payment-service' }],
  },
};
```

- Without a `version`, the dependency satisfies any reference to that id (it behaves like `latest`).
- With a `version`, references must match that version, using the same [matching rules](../reference/versions) as local resources.
- Dependency messages are never reported as orphans.

Any resource type can be listed: `events`, `commands`, `queries`, `services`, `domains`, `systems`, `channels`, `flows`, `entities`, `containers`, `data-products`, `diagrams`, `agents`, `adrs`, `users`, `teams`.

The linter reads `eventcatalog.config.js` from the directory you point it at. Both CommonJS and ES module configs are supported on current Node.js versions; if the file can't be loaded, the linter prints a warning and continues without dependencies.

## Federated content

If you use [EventCatalog Federation](/docs/federation/overview), resources materialised under `federated/<catalog>/` are scanned like local ones. Owners, services and messages from federated catalogs resolve without any extra configuration.

## Ignore the generated `dependencies` folder

EventCatalog writes placeholder files for dependencies into a `dependencies/` folder. The linter ignores that folder by default, so you don't need to add it to `ignorePatterns`.

## Related

- [Mocking out dependencies (legacy federation guide)](/docs/federation/legacy-federation/setup-team-catalog#mocking-out-dependencies-in-your-catalog)
- [Version formats and matching](../reference/versions)
