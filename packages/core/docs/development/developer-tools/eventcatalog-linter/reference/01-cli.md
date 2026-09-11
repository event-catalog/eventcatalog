---
sidebar_position: 1
sidebar_label: CLI
title: Linter CLI reference
description: Command, options, exit codes, output format and environment behaviour of eventcatalog-linter.
---

## Usage

```
eventcatalog-linter [options] [directory]
```

| Argument | Description | Default |
|----------|-------------|---------|
| `directory` | The catalog to lint — the folder containing `eventcatalog.config.js` | `.` |

Run it with `npx @eventcatalog/linter`, or install `@eventcatalog/linter` and use the `eventcatalog-linter` binary.

## Options

| Option | Description |
|--------|-------------|
| `-v, --verbose` | Show verbose output |
| `-q, --quiet` | Report errors only. Warnings are dropped from the output and from the counts |
| `--fail-on-warning` | Exit with code 1 when any warning is reported. Equivalent to `--max-warnings 0` |
| `--max-warnings <number>` | Exit with code 1 when more than `<number>` warnings are reported. Must be a non-negative integer |
| `--no-color` | Disable coloured output |
| `--init` | Write a commented `.eventcatalogrc.js` to the catalog directory and exit without linting. See [configuration](./configuration#scaffold-a-configuration-file) |
| `--force` | With `--init`, overwrite an existing `.eventcatalogrc.js` |
| `-V, --version` | Print the linter version |
| `-h, --help` | Print help |

## Exit codes

| Code | Meaning |
|------|---------|
| `0` | No errors. Warnings may have been reported, provided they don't exceed `--max-warnings` |
| `1` | At least one error was reported, warnings exceeded `--max-warnings` / `--fail-on-warning` was set, an option was invalid, or the linter itself failed |

`--init` exits `0` after writing the file and `1` if the file already exists (without `--force`).

## Output

Findings are grouped by file and sorted by position:

```
services/order-service/index.mdx
   6:1 ✖ error Unknown property "owner". Did you mean "owners"? [owner] (schema/unknown-field)
   9:5 ✖ error Referenced event/command/query "OrderCreatd" does not exist. Did you mean "OrderCreated"? [sends[0]] (refs/resource-exists)
  14:1 ⚠ warning Resource should have a markdown description (body content) beyond just frontmatter [description] (best-practices/description-required)

✖ 3 problems

✖ 3 problems (2 errors, 1 warning) in 1 file
  178 files checked, 3 files ignored
```

| Part | Meaning |
|------|---------|
| `6:1` | 1-based line and column of the finding. Keys are reported at the key; references at the value; missing fields at the nearest parent (line 2 for a missing top-level field); body-content findings at the first line after the frontmatter; YAML parse errors at the failing token |
| `✖ error` / `⚠ warning` | Severity after applying your configuration |
| `[owner]` | The frontmatter field path, including array indexes (`sends[0].to[1]`) |
| `(schema/unknown-field)` | The rule name. Parse failures use `(@eventcatalog/parse-error)` |
| `in 1 file` | Number of files with at least one finding |
| `178 files checked` | Number of files scanned and validated, after `ignorePatterns` |
| `3 files ignored` | Number of recognised files skipped by `ignorePatterns` (omitted when zero) |

When nothing is found:

```
✔ No problems found!
  178 files checked
```

When the directory contains no recognisable catalog files, the linter prints `⚠ No EventCatalog files found` and exits `0`.

## Progress output and terminals

A progress spinner is written to **stderr** while the linter runs. It is shown only when stderr is an interactive terminal, the `CI` environment variable is not set, and `TERM` is not `dumb`. In pipelines and when piping output, nothing is written to stderr, so logs contain only findings.

Colour follows [chalk](https://github.com/chalk/chalk) conventions: `--no-color`, `NO_COLOR=1` or `FORCE_COLOR=0` disable it; `FORCE_COLOR=1` enables it in non-TTY output.

## Files the linter reads

| File | Purpose |
|------|---------|
| `.eventcatalogrc.js` | Rule configuration. Optional; see [configuration](./configuration) |
| `eventcatalog.config.js` | Read for `dependencies` so references to external resources resolve. Optional |
| Resource `index.md` / `index.mdx` files | See [supported resources](./supported-resources) |
| Files referenced from frontmatter | `schemaPath`, `schemas[]`, `specifications`, contracts and `public/` icons are checked for existence by [`refs/file-exists`](./rules#refsfile-exists) |

The linter never modifies your catalog.

## Programmatic use

The package exports the pieces the CLI is built from — `scanCatalogFiles`, `parseAllFiles`, `validateCatalog`, `validateUnrecognisedFiles`, `attachLocations`, `loadConfig`, `applyRuleSeverity`, `reportErrors`, the rule registry (`RULES`) and version helpers — for use from your own scripts:

```ts
import { scanCatalogFiles, parseAllFiles, validateCatalog, loadConfig } from '@eventcatalog/linter';

const rootDir = process.cwd();
const config = loadConfig(rootDir);
const files = await scanCatalogFiles(rootDir);
const { parsed } = await parseAllFiles(files);
const findings = validateCatalog(parsed, undefined, config);
```

The public API is not yet frozen; expect it to be consolidated into a single `lint()` entry point in a future release.
