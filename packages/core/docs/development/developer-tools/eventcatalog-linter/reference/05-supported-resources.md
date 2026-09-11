---
sidebar_position: 5
sidebar_label: Supported resources
title: Supported resources and file locations
description: The resource types the linter validates and the folders and file names it scans to find them.
---

The linter validates every resource type EventCatalog supports. It finds resources by scanning the same file locations EventCatalog loads from; anything else under a resource folder is reported by [`structure/unrecognised-file`](./rules#structureunrecognised-file).

## Resource types and locations

Paths are relative to the catalog root. `<id>` is the resource's folder name and `<version>` a folder under `versioned/`. Both `index.md` and `index.mdx` are accepted.

| Resource type | Locations |
|---------------|-----------|
| Domain | `domains/<id>/index.mdx`, `domains/<id>/subdomains/<id>/index.mdx`, plus `versioned/<version>/index.mdx` under each |
| System | `systems/**/index.mdx` at any depth, including inside domains. Nested resource folders (`services/`, `containers/`, …) are loaded as their own types |
| Service | `services/<id>/index.mdx`, and inside a domain, subdomain or system: `domains/<d>/services/<id>/`, `domains/<d>/subdomains/<s>/services/<id>/`, `**/systems/**/services/<id>/` |
| Event | `**/events/<id>/index.mdx` |
| Command | `**/commands/<id>/index.mdx` |
| Query | `**/queries/<id>/index.mdx` |
| Channel | `**/channels/**/index.mdx` (channels may be nested, e.g. `channels/public/orders/`) |
| Flow | `**/flows/**/index.mdx` |
| Entity | `**/entities/<id>/index.mdx` |
| Agent | `**/agents/<id>/index.mdx` |
| Container | `**/containers/**/index.mdx` |
| Data product | `**/data-products/<id>/index.mdx` |
| Diagram | `**/diagrams/**/index.mdx` |
| ADR | `**/adrs/<id>/index.mdx` |
| User | `users/<id>.mdx` — a flat file, not a folder |
| Team | `teams/<id>.mdx` — a flat file, not a folder |

Every folder-based type also accepts `versioned/<version>/index.mdx` beneath the resource folder for historic versions.

## Federated content

Resources materialised by [Federation](/docs/federation/overview) under `federated/<catalog>/…` are scanned with the same patterns, so owners, services and messages from other catalogs resolve.

## Resource ids

The `id` in the frontmatter is what references resolve against. The folder or file name is used only as a fallback when `id` is missing, so `services/UserService/index.mdx` with `id: user-service` is referenced as `user-service`.

## Files that are not resources

These markdown files are loaded by EventCatalog through other collections and are deliberately not treated as resources or reported as unrecognised:

| Location | What it is |
|----------|------------|
| `**/docs/**/*.md(x)` | Resource documentation pages |
| `docs/**/*.md(x)` | Catalog-level documentation |
| `**/pages/*.md(x)` | Custom pages |
| `**/changelog.md(x)` | Resource changelogs |
| `domains/**/ubiquitous-language.md(x)` | Ubiquitous language dictionaries |

Build artifacts (`dist/`, `node_modules/`, `.astro/`) and the `dependencies/` folder EventCatalog generates are skipped.

## What is validated per resource

All resources are checked for frontmatter schema conformance, unknown keys, owners, summary, body content, duplicate ids and file references. Type-specific reference checks:

| Resource | References checked |
|----------|--------------------|
| Domain | `services`, `agents`, `domains` (subdomains), `systems`, `entities`, `data-products`/`dataProducts`, `flows`, `sends`, `receives` (incl. channels in `to`/`from`) |
| System | `services`, `flows`, `entities`, `containers`, `relationships` |
| Service, Agent | `sends`, `receives` (incl. channels), `writesTo`, `readsFrom`, `flows`, `entities` (services only) |
| Event, Command, Query | `producers`, `consumers`, `channels`, `messageChannels`; orphan detection; `schemaPath` / `schemas[]` files |
| Channel | `channels`, `routes`, `messages` |
| Flow | each step's `message`, `service`, `agent`, `flow`, `container`, `dataProduct` |
| Entity | `properties[].references`, `services`, `domains` |
| Container | `services`, `servicesThatWriteToContainer`, `servicesThatReadFromContainer`, `dataProductsThatWriteToContainer`, `dataProductsThatReadFromContainer` |
| Data product | `inputs`, `outputs` (any linkable type), `outputs[].contract.path` file |
| ADR | `decisionMakers`, typed `appliesTo`, `supersedes`, `supersededBy`, `amends`, `amendedBy`, `related` |
| User | `associatedTeams`, `owned*` lists |
| Team | `members`, `owned*` lists |
| All | `owners`, `diagrams`, `resourceGroups[].items` |
