---
sidebar_position: 6
sidebar_label: Troubleshooting
title: Troubleshooting EventCatalog Federation
description: Fix common source, ownership, relationship, asset, cache, and generated-output problems.
---

import EventCatalogEnterprise from '@site/src/components/MDX/EventCatalogEnterprise';

<EventCatalogEnterprise />

Run with verbose diagnostics before investigating a warning:

```bash
npx eventcatalog federate --verbose
```

Errors always include details. Verbose mode adds the attributes for warnings.

## Federation is not enabled

If the command reports that Federation is an Enterprise feature:

- Confirm the Enterprise `license.jwt` file is in the central catalog root
- If the file is stored elsewhere, confirm `EC_LICENSE` points to it
- Confirm the license has not expired
- Email [hello@eventcatalog.dev](mailto:hello@eventcatalog.dev?subject=EventCatalog%20Federation%20Trial) to request or replace an offline trial key
- Review [offline license validation](/docs/development/license-keys/license-validation#offline-validation)

## No sources are configured

Add at least one entry to `federation.sources`:

```js title="eventcatalog.config.js"
export default {
  federation: {
    sources: [
      {
        id: 'acme/payments',
        source: 'github:acme/payments-catalog',
      },
    ],
  },
};
```

If previous Federation output exists, an empty source list intentionally removes it and its managed public files.

## A source ID is configured more than once

Every source entry needs a unique stable `id`. Change or remove the duplicate configuration entry.

This configuration error is different from `federation/duplicate-source`, which means several catalogs own the same resource ID.

## GitHub source errors

### Unsupported GitHub locator

Use:

```text
github:owner/repository
```

Do not use a full `https://github.com/...` URL.

### Repository cannot be fetched

Check:

- The owner and repository name
- The configured `ref`
- Network access to GitHub
- Git is installed when the source does not publish an index
- `EVENTCATALOG_GITHUB_TOKEN` or `GITHUB_TOKEN` has repository contents read access

### Published index source does not match

The `source` value inside `catalog.index.json` must equal the configured source `id`.

Either correct the published index or configure the matching stable ID.

### Catalog path escapes the source

`path` must be a safe relative path inside the selected repository. Remove absolute paths, `..` segments, or backslashes.

## Filesystem source errors

### Source does not exist

`file:` paths are resolved from the central catalog directory, not from the terminal's parent directory.

For sibling catalogs:

```js
{
  id: 'acme/payments',
  source: 'file:../payments-catalog',
}
```

Confirm that the resolved directory exists and contains an EventCatalog project.

### Filesystem source does not support `ref`

Remove `ref` from the source. Filesystem sources always read the current local files.

### Source or artifact escapes its allowed directory

Federation rejects paths and symbolic links that resolve outside the selected filesystem source. Keep the catalog and its referenced files within the source root.

## Ownership and type errors

### `federation/duplicate-source`

Several catalogs own the same resource ID. Choose one owner and remove copied or placeholder definitions from the other catalogs.

### `federation/type-collision`

The same ID is documented with different resource types. Correct the type or assign distinct IDs.

### `federation/pointer-type-mismatch`

A relationship expects one type but resolves to another. Correct the relationship pointer or its target ID.

Use the [diagnostic rule reference](/docs/federation/reference/diagnostic-rules) to interpret the printed attributes.

## Relationship warnings

### Referenced resource does not exist

For `federation/missing-resource`:

- Check the referenced ID for a typo
- Add the owning catalog to `federation.sources`
- Confirm the owner documents the resource
- Keep the warning if the external reference is deliberate

### Referenced resource version does not exist

For `federation/unresolved-version`:

- Compare `requested version` with `available versions`
- Correct the exact version or semantic range
- Publish the required version in the owning catalog

## Public assets or components are not correct

For `federation/asset-collision`, run with `--verbose` to see the source order and winner.

Then:

- Namespace remote asset paths by team or domain
- Make intentionally shared files identical
- Reorder sources only when last-source-wins is deliberate
- Check whether the central catalog owns the public path
- Check whether a local component overrides the federated component

If a custom component imports an npm package, install that dependency in the central catalog.

Top-level source `snippets/` are not currently federated. Move required content into the page, provide it centrally, or avoid the remote snippet import.

## Content hash mismatch

Federation fetched bytes that did not match the hash recorded by the source index.

Rerun the command first. If the error remains:

- Regenerate or remove a stale published `catalog.index.json`
- Confirm the source content still exists at the indexed commit
- Check whether content was changed without updating the index

Federation does not install content that fails integrity validation.

## The lockfile cannot be read

Check that `eventcatalog.lock` contains valid JSON and was not partially edited.

If you do not need its audit or managed public-file state, move the malformed file aside and rerun Federation. Review public assets carefully because the new run will not know which existing files were managed by the unreadable lockfile.

## Federated content looks stale

Run Federation again before starting or building EventCatalog:

```bash
npx eventcatalog federate
npm run dev
```

For a local source, remember there is no watcher integration yet.

Use `--no-cache` when investigating cache behavior:

```bash
npx eventcatalog federate --no-cache
```

The cache is content-addressed and verified, so changing source content normally produces a different cache key without this option.

## A failed run left the previous content visible

This is expected. Federation preserves or restores the previous successful output when validation or a normal output update fails.

Fix the reported problem and rerun the command. New output and a new lockfile are installed only after Federation succeeds.

## Get help

Share the command output, relevant source configuration with secrets removed, and the expected ownership model in the [EventCatalog Discord](https://eventcatalog.dev/discord) or [open an issue](https://github.com/event-catalog/eventcatalog/issues).
