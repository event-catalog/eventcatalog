---
sidebar_position: 1
slug: /development/developer-tools/eventcatalog-linter
keywords:
- EventCatalog linter
- schema validation
- reference validation
- CI/CD
- quality assurance
sidebar_label: Overview
title: EventCatalog Linter
description: Catch broken references, typos, misplaced files and missing metadata in your EventCatalog before they reach a build or a reader.
---

import AddedIn from '@site/src/components/MDX/AddedIn';

The EventCatalog Linter is a command-line tool that checks your catalog for the mistakes EventCatalog itself would otherwise ignore or only surface at build time: a service that `sends` an event that doesn't exist, a typo like `owner:` instead of `owners:`, a `schemaPath` that points at nothing, or a file saved in a folder EventCatalog never reads.

Run it locally while you write documentation, or in CI so every pull request is checked.

```bash
npx @eventcatalog/linter
```

```
services/order-service/index.mdx
   6:1 ✖ error Unknown property "owner". Did you mean "owners"? [owner] (schema/unknown-field)
   9:5 ✖ error Referenced event/command/query "OrderCreatd" does not exist. Did you mean "OrderCreated"? [sends[0]] (refs/resource-exists)
  14:1 ⚠ warning Resource should have a markdown description (body content) beyond just frontmatter [description] (best-practices/description-required)

✖ 3 problems (2 errors, 1 warning) in 1 file
  178 files checked
```

## What it checks

| Area | Examples |
|------|----------|
| **Frontmatter schemas** | Required fields, field types, version formats, unknown or misspelled keys |
| **References** | Owners, messages, services, domains, channels, containers, flow steps and entity relationships point at resources (and versions) that exist |
| **Files** | `schemaPath`, `schemas[]`, `specifications`, data product contracts and `public/` icons resolve to real files |
| **Catalog structure** | Duplicate ids, markdown files in places EventCatalog won't load |
| **Documentation quality** | Summaries, owners, body content and message schemas are present |
| **Versioning** | References to deprecated resources |

Every finding comes with a `line:column` position, the rule that produced it, and — where the linter can work it out — a suggestion for the fix.

## Where to go next

- **[Set up the linter](./01-setup.md)** — a guided walk-through from the first run to a CI check. Start here if you haven't used the linter before.
- **[How-to guides](/docs/development/developer-tools/eventcatalog-linter/how-to)** — recipes for specific jobs: [configure rules](./how-to/01-configure-rules.md), [run in CI](./how-to/02-run-in-ci.md), [allow custom frontmatter](./how-to/03-use-custom-frontmatter.md), [reference resources from other catalogs](./how-to/04-reference-external-catalogs.md), [fix common problems](./how-to/05-fix-common-problems.md).
- **[Reference](/docs/development/developer-tools/eventcatalog-linter/reference)** — every [CLI option](./reference/01-cli.md), the [configuration file](./reference/02-configuration.md), [all rules](./reference/03-rules.md) with their messages and options, [version formats](./reference/04-versions.md) and the [files the linter scans](./reference/05-supported-resources.md).

## What's new

<AddedIn version="1.1.17" pkg="@eventcatalog/linter" url="https://github.com/event-catalog/eventcatalog" />

The latest release focuses on catching the mistakes people actually make and pointing at exactly where they are:

- **Line and column numbers** on every finding, so terminals and editors can jump straight to the problem.
- **Unknown frontmatter keys** are flagged with "did you mean" suggestions ([`schema/unknown-field`](./reference/03-rules.md#schemaunknown-field)). EventCatalog fails the build on these; the linter now catches them first.
- **Misplaced files** — `events/OrderCreated.mdx` instead of `events/OrderCreated/index.mdx`, `event/` instead of `events/`, users saved as folders — are reported with the intended location ([`structure/unrecognised-file`](./reference/03-rules.md#structureunrecognised-file)).
- **Broken file references** — `schemaPath`, specifications, contracts and icons that don't exist ([`refs/file-exists`](./reference/03-rules.md#refsfile-exists)).
- **Clearer reference errors**: "this resource doesn't exist — did you mean `OrderCreated`?" is now distinct from "this resource exists, but not at version `2.1.0` — available: `2.0.0`, `1.0.0`".
- **Version formats match EventCatalog**: `1`, `1.2`, `v1` and `V2` are accepted everywhere EventCatalog accepts them.
- `eventcatalog-linter --init` scaffolds a fully commented config; `--quiet`, `--max-warnings` and `--no-color` were added; progress output stays out of CI logs; the summary reports how many files were actually checked.

Read the [rules reference](./reference/03-rules.md) for the full list, or the [original announcement](/blog/eventcatalog-linter) for the background.

## Supported resources

The linter understands every resource type EventCatalog does: domains and subdomains, systems, services, events, commands, queries, channels, flows, entities, agents, containers, data products, diagrams, ADRs, users and teams — including versioned copies under `versioned/` and content pulled in through federation. See [Supported resources](./reference/05-supported-resources.md) for the exact folders and file names it scans.

## Issues?

If you have any issues or feedback, please open an issue on [GitHub](https://github.com/event-catalog/eventcatalog/issues) or join our [Discord server](https://eventcatalog.dev/discord).
