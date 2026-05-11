---
id: cli-custom-docs
title: Custom Docs
sidebar_label: Custom Docs
sidebar_position: 10
---

# Custom Docs CLI Commands

Manage custom docs in your EventCatalog from the command line.

## getCustomDoc

Returns a custom doc from EventCatalog by its path

**Arguments:**
| Name | Type | Required | Description |
|------|------|----------|-------------|
| path | string | Yes | Path to the custom doc |

**Examples:**

```bash
# Get a custom doc
npx @eventcatalog/cli getCustomDoc "/getting-started"
```

---

## getCustomDocs

Returns all custom docs from EventCatalog

**Arguments:**
| Name | Type | Required | Description |
|------|------|----------|-------------|
| options | json | No | Options: &#123;path?&#125; |

**Examples:**

```bash
# Get all custom docs
npx @eventcatalog/cli getCustomDocs
```

---

## writeCustomDoc

Writes a custom doc to EventCatalog

**Arguments:**
| Name | Type | Required | Description |
|------|------|----------|-------------|
| customDoc | json | Yes | Custom doc object with id, title, and markdown |
| options | json | No | Options: &#123;path?, override?&#125; |



---

## rmCustomDoc

Removes a custom doc by its path

**Arguments:**
| Name | Type | Required | Description |
|------|------|----------|-------------|
| path | string | Yes | Path to the custom doc to remove |

**Examples:**

```bash
# Remove a custom doc
npx @eventcatalog/cli rmCustomDoc "/getting-started"
```

---
