---
sidebar_position: 2
sidebar_label: Setup linter
title: Set up the linter
description: Run the EventCatalog Linter for the first time, read its output, fix a problem, create a configuration file, and add the check to CI.
---

This guide takes you from a fresh catalog to a linted, CI-checked one: run the linter, read what it reports, fix a problem, create a configuration file, and add a pull-request check. It takes about ten minutes.

## What you need

- An EventCatalog project. If you don't have one, `npx @eventcatalog/create-eventcatalog@latest my-catalog` creates one with example content.
- Node.js 18 or later.

## 1. Run the linter

From the root of your catalog (the folder containing `eventcatalog.config.js`):

```bash
npx @eventcatalog/linter
```

You don't need to install anything first. The linter scans your `domains/`, `services/`, `events/` and other resource folders, validates every file, and prints what it found:

```
✔ No problems found!
  178 files checked
```

If your catalog is already clean, congratulations — skip to [step 4](#4-create-a-configuration-file) to see how to customise it. Otherwise, keep reading.

## 2. Read the output

Let's introduce a couple of mistakes on purpose so there is something to look at. Open any service — for example `services/order-service/index.mdx` — and change `owners:` to `owner:`, then misspell one of the events it sends:

```yaml title="services/order-service/index.mdx"
---
id: order-service
name: Order Service
version: 1.0.0
summary: Handles orders
owner:
  - platform-team
sends:
  - id: OrderCreatd
---
```

Run the linter again:

```
services/order-service/index.mdx
   2:1 ✖ error At least one owner is required [owners] (best-practices/owner-required)
   6:1 ✖ error Unknown property "owner". Did you mean "owners"? [owner] (schema/unknown-field)
   9:5 ✖ error Referenced event/command/query "OrderCreatd" does not exist. Did you mean "OrderCreated"? [sends[0]] (refs/resource-exists)

✖ 3 problems (3 errors, 0 warnings) in 1 file
  178 files checked
```

Each line has the same shape:

| Part | Meaning |
|------|---------|
| `6:1` | Line and column in the file. Most terminals let you click `path:line:col`. |
| `✖ error` / `⚠ warning` | Severity. Errors fail the run; warnings don't unless you ask them to. |
| The message | What is wrong, and a suggestion when the linter can work one out. |
| `[owner]` | The frontmatter field the finding is about. |
| `(schema/unknown-field)` | The rule that produced it — look it up in the [rules reference](./reference/rules). |

Notice that one typo produced two findings: `owner` is unknown **and** `owners` is missing. That's expected — fixing the typo clears both.

## 3. Fix the problems

Change `owner` back to `owners` and `OrderCreatd` to `OrderCreated`, then re-run. You should be back to `✔ No problems found!`.

That loop — run, read, fix — is how you'll use the linter day to day. Because the message includes the line number and a suggestion, most fixes are a single edit. The [fix common problems](./how-to/fix-common-problems) guide covers the messages you're most likely to meet.

## 4. Create a configuration file

Defaults are sensible, but every team has its own standards. Let the linter write a starting point for you:

```bash
npx @eventcatalog/linter --init
```

```
✔ Created .eventcatalogrc.js
  178 catalog files found, CommonJS config written
```

Open `.eventcatalogrc.js`. Every rule is listed with a one-line description and its default severity:

```js title=".eventcatalogrc.js"
module.exports = {
  rules: {
    // Best practices
    // Resources have a summary
    'best-practices/summary-required': 'error',
    // Resources have at least one owner
    'best-practices/owner-required': 'error',
    // Resources have markdown body content beyond the frontmatter
    'best-practices/description-required': 'warn',
    // ...
  },
  ignorePatterns: [],
  overrides: [],
};
```

Try changing one rule. Perhaps your team doesn't want body content to be a warning yet:

```js
'best-practices/description-required': 'off',
```

Run the linter again and the warning is gone. The three values are `'error'`, `'warn'` and `'off'`; the [configure rules guide](./how-to/configure-rules) covers options, ignore patterns and per-folder overrides.

## 5. Add the check to your pipeline

The linter exits with code `1` when it finds errors, which is all a CI system needs. For GitHub Actions:

```yaml title=".github/workflows/lint-catalog.yml"
name: Lint catalog
on: [pull_request]

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

`--max-warnings 0` makes warnings fail the build too. If you'd rather let warnings through, drop the flag. In CI the linter automatically keeps its progress spinner out of the logs, so you only see findings. See [Run in CI](./how-to/run-in-ci) for GitLab and other pipelines.

## Next steps

- [Configure rules](./how-to/configure-rules) for your team's standards, including per-folder overrides.
- [Reference resources from other catalogs](./how-to/reference-external-catalogs) if your services consume events documented elsewhere.
- Browse the [rules reference](./reference/rules) to see everything the linter can catch.
