---
sidebar_position: 2
sidebar_label: Run in CI
title: Run the linter in CI
description: Fail pull requests on catalog problems with GitHub Actions, GitLab CI, or any pipeline that can run npx.
---

Use this guide to make the linter a required check on every change to your catalog.

## How the linter signals failure

- Exit code `1` when any **error** is reported, or when warnings exceed `--max-warnings`.
- Exit code `0` otherwise, including when only warnings are reported.
- Progress output (the spinner) is written to stderr and switched off automatically when the process is not attached to a terminal or `CI=true` is set, so logs contain only findings.

Pick the strictness you want:

```bash
npx @eventcatalog/linter                    # fail on errors only
npx @eventcatalog/linter --max-warnings 0   # fail on any warning too
npx @eventcatalog/linter --max-warnings 10  # tolerate up to 10 warnings
npx @eventcatalog/linter --quiet            # hide warnings from the log entirely
```

`--fail-on-warning` is the same as `--max-warnings 0`.

## GitHub Actions

```yaml title=".github/workflows/lint-catalog.yml"
name: Lint catalog
on:
  pull_request:
  push:
    branches: [main]

jobs:
  lint:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
      - run: npx @eventcatalog/linter --max-warnings 0
```

If the catalog lives in a subfolder of the repository, pass the path: `npx @eventcatalog/linter ./catalog`.

## GitLab CI

```yaml title=".gitlab-ci.yml"
lint-catalog:
  stage: test
  image: node:20
  script:
    - npx @eventcatalog/linter --max-warnings 0
```

## Pin the version

`npx @eventcatalog/linter` resolves the latest release every time. For reproducible builds, add it to your catalog's `package.json` and run the local copy:

```bash
npm install --save-dev @eventcatalog/linter
```

```json title="package.json"
{
  "scripts": {
    "lint": "eventcatalog-linter --max-warnings 0"
  }
}
```

Then use `npm run lint` in the pipeline. The version is bumped through your normal dependency-update process.

## Run before every commit

If you use a pre-commit tool such as Husky or lefthook, call the same script. The linter checks the whole catalog rather than only changed files, which keeps reference checks accurate — a change to one service can break a reference in another.

## Keep CI green while you adopt the linter

On an existing catalog the first run may report a lot. Two approaches that work well:

1. **Start permissive, tighten over time.** Set noisy rules to `'warn'` in `.eventcatalogrc.js`, run with `--max-warnings <current count>`, and lower the number as you fix things.
2. **Scope by folder.** Use [`overrides`](./configure-rules#apply-different-rules-to-different-folders) to relax rules for legacy areas while enforcing them fully for new content.

Either way, keep `schema/*`, `refs/*` and `structure/*` as errors — those are the findings that mean EventCatalog will silently drop or fail to build something.

## Related

- [CLI reference](../reference/cli) — every option and exit code
- [Configure rules](./configure-rules)
