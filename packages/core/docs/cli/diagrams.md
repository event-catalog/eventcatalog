---
id: cli-diagrams
title: Diagrams
sidebar_label: Diagrams
sidebar_position: 14
---

# Diagrams CLI Commands

Manage diagrams in your EventCatalog from the command line.

## getDiagram

Returns a diagram from EventCatalog by its ID

**Arguments:**
| Name | Type | Required | Description |
|------|------|----------|-------------|
| id | string | Yes | The ID of the diagram to retrieve |
| version | string | No | Specific version to retrieve |

**Examples:**

```bash
# Get the latest diagram
npx @eventcatalog/cli getDiagram "ArchitectureDiagram"

# Get a specific version
npx @eventcatalog/cli getDiagram "ArchitectureDiagram" "1.0.0"
```

---

## getDiagrams

Returns all diagrams from EventCatalog

**Arguments:**
| Name | Type | Required | Description |
|------|------|----------|-------------|
| options | json | No | Options: &#123;latestOnly?&#125; |

**Examples:**

```bash
# Get all diagrams
npx @eventcatalog/cli getDiagrams
```

---

## writeDiagram

Writes a diagram to EventCatalog

**Arguments:**
| Name | Type | Required | Description |
|------|------|----------|-------------|
| options | json | No | Options: &#123;path?, override?, versionExistingContent?&#125; |



---

## rmDiagram

Removes a diagram by its path

**Arguments:**
| Name | Type | Required | Description |
|------|------|----------|-------------|
| path | string | Yes | Path to the diagram |

**Examples:**

```bash
# Remove a diagram
npx @eventcatalog/cli rmDiagram "/ArchitectureDiagram"
```

---

## rmDiagramById

Removes a diagram by its ID

**Arguments:**
| Name | Type | Required | Description |
|------|------|----------|-------------|
| id | string | Yes | The ID of the diagram to remove |
| version | string | No | Specific version to remove |

**Examples:**

```bash
# Remove a diagram
npx @eventcatalog/cli rmDiagramById "ArchitectureDiagram"
```

---

## versionDiagram

Moves the current diagram to a versioned directory

**Arguments:**
| Name | Type | Required | Description |
|------|------|----------|-------------|
| id | string | Yes | The ID of the diagram to version |

**Examples:**

```bash
# Version a diagram
npx @eventcatalog/cli versionDiagram "ArchitectureDiagram"
```

---

## addFileToDiagram

Adds a file to a diagram

**Arguments:**
| Name | Type | Required | Description |
|------|------|----------|-------------|
| id | string | Yes | The ID of the diagram |
| file | json | Yes | File object: &#123;content, fileName&#125; |
| version | string | No | Specific version |



---

## diagramHasVersion

Checks if a specific version of a diagram exists

**Arguments:**
| Name | Type | Required | Description |
|------|------|----------|-------------|
| id | string | Yes | The ID of the diagram |
| version | string | Yes | Version to check |



---
