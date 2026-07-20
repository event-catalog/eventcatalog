---
sidebar_position: 7
keywords:
- components
- custom properties
- resource metadata
sidebar_label: CustomProperties
title: CustomProperties
description: Render custom x-* resource properties in EventCatalog.
---

import AddedIn from '@site/src/components/MDX/AddedIn';

<AddedIn version="4.3.0" />

`<CustomProperties />` and `<CustomProperty />` render organization-specific `x-*` properties from the current resource.

Both are built-in components, so you can use them in resource MDX without importing them.

Read [Custom properties on resources](/docs/development/customization/custom-properties) to learn how to define `x-*` properties and reference them from MDX or your own components.

## Render all custom properties

Add custom properties to the resource frontmatter, then add `<CustomProperties />` to its Markdown content.

```jsx title="/adrs/adr-001-use-transactional-outbox/index.mdx"
---
id: adr-001-use-transactional-outbox
name: 'ADR-001: Publish product events via a transactional outbox'
version: 1.0.0
status: accepted
date: 2026-02-10
x-next-review-date: '2027-02-10'
x-risk-level: medium
---

## Context

The Product Catalog System publishes product changes through a transactional outbox.

<CustomProperties title="Review metadata" />
```

### Output

![CustomProperties rendering review metadata on an architecture decision record](/img/docs/components/custom-properties.png)

Property names are converted into readable labels. For example, `x-next-review-date` is displayed as **Next Review Date**. The information icon beside each label shows the original `x-*` property name.

Strings, numbers, and booleans are rendered directly. Arrays are rendered as bullet lists, and nested objects are rendered recursively as grouped values.

### CustomProperties props

| Name | Type | Default | Description |
| --- | --- | --- | --- |
| `title` | `string` | `Custom properties` | Heading displayed above the properties table. Pass an empty string to hide the heading. |

## Render one custom property

Use `<CustomProperty />` when you only want to render one `x-*` value.

```mdx
<CustomProperty name="x-risk-level" />
```

Use `label` to override the generated property label.

```mdx
<CustomProperty name="x-next-review-date" label="Review again on" />
```

If the named property is not defined on the current resource, the component renders nothing.

### CustomProperty props

| Name | Type | Required | Description |
| --- | --- | --- | --- |
| `name` | `string` | Yes | Name of the `x-*` property to render. |
| `label` | `string` | No | Label displayed for the property. By default, EventCatalog generates a label from `name`. |

## Support

`<CustomProperties />` and `<CustomProperty />` are supported on domains, systems, services, agents, events, commands, queries, channels, flows, containers, entities, data products, diagrams, and ADRs.

The components require an `.mdx` resource file. Plain `.md` files do not evaluate MDX components.
