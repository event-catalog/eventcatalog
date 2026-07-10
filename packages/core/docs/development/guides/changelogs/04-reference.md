---
keywords:
- EventCatalog changelogs
- Changelog frontmatter
sidebar_label: Reference
title: Changelogs reference
description: Frontmatter fields and paths for changelogs in EventCatalog.
---

This page lists the fields and paths supported by changelogs.

## Paths

Changelogs can be created for versioned resources using `changelog.md` or `changelog.mdx`.

```txt
/{collection}/{Resource Name}/versioned/{version}/changelog.mdx
```

For example:

```txt
/services/PaymentService/versioned/1.0.0/changelog.mdx
/domains/Payments/versioned/1.0.0/changelog.mdx
```

## Optional fields

### `createdAt` {#createdAt}

- Type: `date`

Date the changelog entry was created.

```md title="Example"
---
createdAt: 2026-05-26
---
```

### `badges` {#badges}

- Type: `array`

Badge metadata for the changelog entry.

```md title="Example"
---
badges:
  - content: Breaking change
    backgroundColor: red
    textColor: red
---
```

## Badge fields

| Field | Type | Description |
|-------|------|-------------|
| `content` | `string` | Badge text. |
| `backgroundColor` | `string` | Badge background color. |
| `textColor` | `string` | Badge text color. |
| `icon` | `string` | Optional icon. |

## Example

```md
---
createdAt: 2026-05-26
badges:
  - content: Breaking change
    backgroundColor: red
    textColor: red
---

Updated the payment authorization event contract.
```
