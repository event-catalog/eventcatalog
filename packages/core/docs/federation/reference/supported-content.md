---
sidebar_position: 4
sidebar_label: Supported content
title: Federation supported content
description: Reference for resources, files, assets, and catalog-level content included by Federation.
---

import EventCatalogEnterprise from '@site/src/components/MDX/EventCatalogEnterprise';

<EventCatalogEnterprise />

Federation indexes and materializes normal EventCatalog resource content from every configured source.

## Supported resources

The current release supports:

- Architecture decision records (ADRs)
- Agents
- Channels
- Commands
- Data products
- Data stores (`container` resources)
- Diagrams
- Domains and subdomains
- Entities
- Events
- Flows
- Queries
- Services
- Systems
- Teams
- Users

Resource versions remain with their owner and are included in cross-catalog version resolution.

## Resource files

Federation includes files associated with supported resources:

- Markdown and MDX resource documentation
- Schemas attached to events, commands, and queries
- OpenAPI, AsyncAPI, and GraphQL specifications
- Resource-local sidecar documentation
- Resource-local images, diagrams, examples, and other files
- Changelog and version documentation stored with the resource

Paths and content hashes from the source index are used to fetch and verify these files.

## Teams and users

Top-level teams and users are included. Give shared people and teams one owning catalog to avoid organization-wide duplicate ownership.

## Public assets

Files under a source catalog's top-level `public/` directory are included and composed into the central `public/` directory.

Remote collisions use last-configured-source-wins and report `federation/asset-collision`. Existing central public files are preserved.

See [Share public assets and custom components](/docs/federation/how-to/share-assets-and-components).

## Custom components

Files under a source catalog's top-level `components/` directory are included in the federated component layer.

Central components override federated components at the same relative path. Any npm packages imported by a federated component must be installed in the central catalog.

## Content not included

The current release does not federate:

- Top-level reusable `snippets/`
- Custom pages and API routes
- `eventcatalog.config.js` settings from source catalogs
- Source catalog themes, navigation, or global styles
- Source `package.json` dependencies
- `node_modules/`, build output, or cache directories
- Content already under a source catalog's generated `federated/` directory

The central catalog owns its application configuration, navigation, theme, custom pages, global dependencies, and build process.

## Why generated Federation content is excluded

When a source catalog is itself a central view, its generated `federated/` directory is excluded from indexing. This prevents generated paths from being nested repeatedly and avoids treating copied output as newly authored ownership.

Only content owned by the selected source catalog is indexed for the next composition level.
