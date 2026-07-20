---
keywords:
- EventCatalog diagrams
- Diagram frontmatter
sidebar_label: Reference
title: Diagrams reference
description: Frontmatter fields, paths, and routes for diagrams in EventCatalog.
---

This page lists the fields, paths, and routes supported by diagrams.

## Paths

Diagrams can be created in any `diagrams` folder:

```txt
/diagrams/{Diagram Name}/index.mdx
/domains/{Domain Name}/diagrams/{Diagram Name}/index.mdx
/systems/{System Name}/diagrams/{Diagram Name}/index.mdx
```

Versioned diagrams use:

```txt
/diagrams/{Diagram Name}/versioned/{version}/index.mdx
```

## Routes

| Route | Description |
|-------|-------------|
| `/docs/diagrams/{diagram-id}/{version}` | Diagram documentation page. |

## Required fields

### `id` {#id}

- Type: `string`

Unique id of the diagram. EventCatalog uses this for URLs and resource references.

```md title="Example"
---
id: checkout-sequence
---
```

### `name` {#name}

- Type: `string`

Display name of the diagram.

```md title="Example"
---
name: Checkout Sequence
---
```

### `version` {#version}

- Type: `string`

Version of the diagram documentation.

```md title="Example"
---
version: 1.0.0
---
```

## Optional fields

### `summary` {#summary}

- Type: `string`

Short description of the diagram.

```md title="Example"
---
summary: Sequence diagram for checkout orchestration.
---
```

### `owners` {#owners}

- Type: `array`

An array of team or user ids that own the diagram.

```md title="Example"
---
owners:
  - checkout-platform
---
```

### `badges` {#badges}

- Type: `array`

Badges rendered on the diagram page.

```md title="Example"
---
badges:
  - content: Mermaid
    backgroundColor: blue
    textColor: blue
---
```

### `repository` {#repository}

- Type: `object`

Repository metadata for the diagram.

```md title="Example"
---
repository:
  url: https://github.com/acme/architecture
---
```

### `attachments` {#attachments}

- Type: `array`

External links or supporting documents attached to the diagram.

```md title="Example"
---
attachments:
  - title: Source diagram
    url: https://miro.com/app/board/example
    type: miro
---
```

## Content

Diagram pages can contain any MDX supported by EventCatalog, including Mermaid, PlantUML, Miro, IcePanel, Lucid, Draw.io, FigJam, images, and normal markdown.

## Custom properties

You can add organization-specific metadata to this resource using frontmatter fields prefixed with `x-`. Learn how to define, render, and reference them in [Custom properties on resources](/docs/development/customization/custom-properties).
