---
sidebar_position: 3
sidebar_label: Allow custom frontmatter
title: Allow custom frontmatter fields
description: Add your own metadata to resources without tripping the unknown-field rule.
---

Use this guide when you need extra fields in frontmatter — a cost centre, a data classification, a Jira key — and the linter reports them as unknown.

## Why the linter complains

EventCatalog validates frontmatter against a schema and rejects top-level keys it doesn't know at build time. The linter's [`schema/unknown-field`](../reference/rules#schemaunknown-field) rule mirrors that, so a typo like `owner:` is caught before the build, and so is any custom field:

```
services/order-service/index.mdx
  8:1 ✖ error Unknown property "costCenter". Custom properties must start with "x-". [costCenter] (schema/unknown-field)
```

## Option 1: use the `x-` prefix (recommended)

EventCatalog reserves the `x-` prefix for custom properties. Both EventCatalog and the linter accept any key that starts with it, at any level of the frontmatter:

```yaml title="services/order-service/index.mdx"
---
id: order-service
name: Order Service
version: 1.0.0
x-cost-center: CC-1234
x-jira-project: ORD
sends:
  - id: OrderCreated
    x-internal: true
---
```

Custom properties are rendered in the catalog and available to your own components — see [Custom properties on resources](/docs/development/customization/custom-properties).

## Option 2: allow specific keys

If you can't rename a field yet, tell the rule to ignore it. `allow` takes exact key names or `prefix*` patterns and applies to both the top-level and nested rules:

```js title=".eventcatalogrc.js"
module.exports = {
  rules: {
    'schema/unknown-field': ['error', { allow: ['costCenter', 'legacy*'] }],
  },
};
```

:::warning
Allowed keys are still unknown to EventCatalog. Top-level ones will fail `eventcatalog build`; nested ones are silently ignored. Treat `allow` as a stepping stone to the `x-` prefix, not a destination.
:::

## Turn off the suggestions

The rule adds "Did you mean …?" hints and tells you when a key belongs to a different resource type. To keep only the bare message:

```js title=".eventcatalogrc.js"
module.exports = {
  rules: {
    'schema/unknown-field': ['error', { suggestions: false }],
  },
};
```

## Relax nested-field checks

Unknown keys inside nested objects (`sends[0].too`) are reported by a separate rule, [`schema/unknown-nested-field`](../reference/rules#schemaunknown-nested-field), which defaults to `warn` because EventCatalog ignores them rather than failing. Adjust it independently:

```js title=".eventcatalogrc.js"
module.exports = {
  rules: {
    'schema/unknown-nested-field': 'off',
  },
};
```

## Related

- [Custom properties on resources](/docs/development/customization/custom-properties)
- [Rules reference: schema rules](../reference/rules#schema-validation)
