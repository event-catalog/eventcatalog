---
sidebar_position: 4
sidebar_label: Run in CI
title: Run fitness functions locally and in CI
description: The eventcatalog fitness check command, its options, output and exit codes, the report it writes, and how to run it in GitHub Actions or GitLab CI.
---

`eventcatalog fitness check` runs every fitness function in your catalog. Run it locally while you write rules, and in CI so every change to the catalog is checked.

## The command

```bash
npx eventcatalog fitness check
```

The command is part of `@eventcatalog/core`, the same package that runs `eventcatalog dev` and `eventcatalog build`. Run it from the root of your catalog. It always checks the whole catalog. Catalogs created with `create-eventcatalog` also have an `npm run fitness` script that runs it.

The [EventCatalog CLI](/docs/cli) has the same command. Use it to check a catalog without installing EventCatalog, or to point at a catalog in another folder with `--dir`:

```bash
npx @eventcatalog/cli --dir ./my-catalog fitness check
```

| Option | Default | Description |
|---|---|---|
| `-o, --output <path>` | `.eventcatalog/fitness/results.json` | Where to write the report, relative to the catalog |
| `--format <format>` | `text` | `text` prints the results for people to read. `json` prints the full report instead |

If your catalog has a `.env` file, it's loaded before your functions run, so they can read settings from `process.env`.

## What it does

1. Finds every `*.fitness.ts` file in a `fitness/` folder, [at the root or in a resource's folder](./03-global-and-resource-functions.md).
2. Runs them one at a time, in path order, so every run's results are in the same order.
3. Prints the results, writes the report, and exits with a code that tells CI whether the check passed.

## Reading the output

```
EventCatalog Fitness

✗ ordering / Ordering services only use Ordering data stores  1 violation
    • Order Service uses payment-database, which belongs to another domain
      Resources: order-service (service), payment-database (container)
      Suggestion: Consume an event or call an API owned by the other domain instead
! order-service / Order Service stays loosely coupled         1 warning
    • Order Service has 7 dependencies (the limit is 6)
      Resources: order-service (service)
      Counts the messages it receives and the data stores it reads from or writes to.
      Suggestion: Split the service, or move work behind events another service handles
✗ Critical services are documented                            Error
    Cannot read properties of undefined (reading 'owners')
    in fitness/critical-services.fitness.ts
✗ Every event has an owner                                    1 violation
    • Order Amended has no owners
      Resources: order-amended (event)
      Suggestion: Add a team or user to the owners field in the frontmatter
! Every event has a schema                                    1 warning
    • Order Amended has no schema
      Resources: order-amended (event)

5 fitness functions evaluated

0 passed
2 warnings
2 failed
1 error

Report written to .eventcatalog/fitness/results.json
```

Each function gets one line. Functions [next to a resource](./03-global-and-resource-functions.md#resource-fitness-functions) are labelled with the resource's id first.

| Symbol | Result | Meaning |
|---|---|---|
| `✓` | `Passed` | The function returned no violations |
| `!` | `n warnings` | A `warning` function found violations |
| `✗` | `n violations` | An `error` function found violations |
| `✗` | `Error` | The function couldn't be run. Its error and file are shown under it |

Under each function are its violations: the message, the resources it's about, any `details`, and the suggestion. A resource that doesn't match anything in the catalog is shown as `not found in the catalog`.

Output is coloured when the command runs in a terminal. Set `NO_COLOR` to turn colour off.

## Warnings and errors

Each function has a `severity`:

- **`error`** (the default): violations fail the check.
- **`warning`**: violations are reported, but the check still passes.

Use `warning` for a rule you're introducing to an existing catalog. Teams see the violations without their builds failing, and you can change it to `error` once they're fixed.

## Exit codes

| Code | When |
|---|---|
| `0` | Every function passed, or only `warning` functions found violations |
| `1` | An `error` function found violations, or a function couldn't be run |
| `2` | The check itself couldn't run, for example because the catalog folder doesn't exist |

A catalog with no fitness functions exits with `0`.

## When a function throws

A function that can't be run is reported with the status `Error`, not as a violation. This happens when:

- `run` throws an exception or returns a promise that rejects,
- `run` returns something other than an array of violations, or a violation without a `message`,
- the file has no default export, fails to load (a syntax error, for example), or the export isn't a valid fitness function,
- another function already uses the same `id`,
- EventCatalog can't find the resource the function sits alongside.

The other functions still run. Any error fails the check with exit code `1`, so a broken rule can't pass unnoticed. The error message is printed in the terminal, and the message and stack trace are in the report.

## The report

Every run writes a JSON report, to `.eventcatalog/fitness/results.json` by default. It's written even when there are no fitness functions, so a missing file always means the check didn't run.

The report has a summary, every function's result with its violations and errors, and any fitness files that weren't run.

For a catalog with one failing function, it looks like this:

```json title=".eventcatalog/fitness/results.json"
{
  "schemaVersion": 1,
  "evaluatedAt": "2026-10-18T14:34:11.778Z",
  "catalogRevision": "5b0bede",
  "summary": { "total": 1, "passed": 0, "warnings": 0, "failed": 1, "errors": 0 },
  "functions": [
    {
      "id": "event-ownership",
      "name": "Every event has an owner",
      "description": "Events without an owner have nobody to ask before they change.",
      "severity": "error",
      "status": "failed",
      "source": "fitness/event-ownership.fitness.ts",
      "scope": null,
      "violations": [
        {
          "message": "Order Amended has no owners",
          "resources": [{ "type": "event", "id": "order-amended", "version": "1.0.0", "resolved": true }],
          "suggestion": "Add a team or user to the owners field in the frontmatter"
        }
      ]
    }
  ],
  "diagnostics": []
}
```

`catalogRevision` is the git commit the catalog was checked at, or `null` when it isn't in a git repository. See [the report reference](./05-api-reference.md#the-report) for every field.

Write it somewhere else with `--output`:

```bash
npx eventcatalog fitness check --output reports/fitness.json
```

Or print it to standard output with `--format json` (it's still written to the file too):

```bash
npx eventcatalog fitness check --format json > fitness.json
```

The report is written again on every run, so add `.eventcatalog/fitness/` to your `.gitignore` unless you want to commit it. Catalogs created with `create-eventcatalog` already ignore it.

## GitHub Actions

```yaml title=".github/workflows/fitness.yml"
name: Architecture fitness
on:
  pull_request:
  push:
    branches: [main]

jobs:
  fitness:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
      - run: npm ci
      - run: npx eventcatalog fitness check
      - uses: actions/upload-artifact@v4
        if: always()
        with:
          name: fitness-report
          path: .eventcatalog/fitness/results.json
```

`if: always()` keeps the report when the check fails, which is when you'll want to look at it.

If the catalog lives in a subfolder of the repository, set the working directory for the step:

```yaml
      - run: npx eventcatalog fitness check
        working-directory: ./catalog
```

Or use the EventCatalog CLI with `--dir`: `npx @eventcatalog/cli --dir ./catalog fitness check`.

## GitLab CI

```yaml title=".gitlab-ci.yml"
fitness:
  stage: test
  image: node:20
  script:
    - npm ci
    - npx eventcatalog fitness check
  artifacts:
    when: always
    paths:
      - .eventcatalog/fitness/results.json
```

## Related

- [Create a fitness function](./02-create-fitness-function.md)
- [API reference](./05-api-reference.md)
