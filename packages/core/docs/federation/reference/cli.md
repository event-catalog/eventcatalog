---
sidebar_position: 2
sidebar_label: CLI
title: Federation CLI reference
description: Command, option, environment variable, and output reference for eventcatalog federate.
---

import EventCatalogEnterprise from '@site/src/components/MDX/EventCatalogEnterprise';

<EventCatalogEnterprise />

Run Federation from the central catalog directory:

```bash
npx eventcatalog federate
```

The command loads `federation.sources` and `federation.rules` from `eventcatalog.config.js`.

## Requirements

- A central EventCatalog project
- An EventCatalog Enterprise offline license file
- At least one configured source, unless you are cleaning previous output
- Git for GitHub sources that do not publish an index
- Network and repository access for GitHub sources

## Options

| Option | Description | Default |
| --- | --- | --- |
| `--no-cache` | Disable content cache reads for this run and refresh fetched entries. | Reuse valid cached content |
| `--verbose`, `-v` | Show the attributes for warning diagnostics. Error attributes are always shown. | Concise warning summary |
| `--help`, `-h` | Show command help. |  |

## Examples

Run Federation:

```bash
npx eventcatalog federate
```

Show every warning:

```bash
npx eventcatalog federate --verbose
```

Refresh content without reading existing cache entries:

```bash
npx eventcatalog federate --no-cache
```

Pass options through an npm script:

```bash
npm run federate -- --verbose
```

Select local sources through a configuration environment variable:

```bash
EVENTCATALOG_FEDERATION_LOCAL=true npx eventcatalog federate
```

`EVENTCATALOG_FEDERATION_LOCAL` is not a built-in Federation variable. It is an example of using your own environment variable inside `eventcatalog.config.js`.

## Environment variables

Place the Enterprise `license.jwt` file in the central catalog root. You can commit it with the catalog or write it during CI/CD. If you store it elsewhere, set `EC_LICENSE` to its file path. Email [hello@eventcatalog.dev](mailto:hello@eventcatalog.dev?subject=EventCatalog%20Federation%20Trial) to request an offline trial key.

| Variable | Description |
| --- | --- |
| `EC_LICENSE` | Optional path to the Enterprise offline license file. Defaults to `license.jwt` in the catalog root. |
| `EVENTCATALOG_GITHUB_TOKEN` | Preferred GitHub token for private repositories and authenticated content requests. |
| `GITHUB_TOKEN` | GitHub token fallback when `EVENTCATALOG_GITHUB_TOKEN` is not set. |

The command loads variables from `.env` in the central catalog before Federation starts.

## Command stages

The command reports progress for:

1. Configured source discovery
2. Source fetching and indexing
3. Central catalog ownership indexing
4. Graph resolution and diagnostics
5. Content hydration and cache reuse
6. Public asset composition
7. Lockfile recording

## Warning and error output

Without `--verbose`, warnings produce a summary and a hint to rerun with verbose output.

With `--verbose`, each diagnostic includes:

- Severity
- Human-readable message
- Stable `federation/*` rule ID
- Rule-specific attributes

Errors always include their details and stop before new generated output is installed.

## No configured sources

When no sources are configured and no previous Federation state exists, the command reports that there is nothing to do.

When previous output exists, running with an empty source list removes the previous `federated/` output, managed public files, and lockfile.

## Generated files

A successful run can update:

- `federated/`
- `public/` for managed remote public assets
- `.eventcatalog-cache/federation/content/`
- `eventcatalog.lock`

See [Generated output reference](/docs/federation/reference/generated-output).
