---
id: cli-fitness
title: Fitness
sidebar_label: Fitness
sidebar_position: 20
---

# Fitness CLI Commands

Run your architecture fitness functions from the command line.

## fitnessCheck

Run the architecture fitness functions (`*.fitness.ts` files in `fitness/` folders) against the catalog, print the results and write them to a JSON report. Exits with 1 when a function fails or errors, so it can gate CI.

Also available as `npx eventcatalog fitness check` in a catalog project.

**Arguments:**
| Name | Type | Required | Description |
|------|------|----------|-------------|
| --output | string | No | Where to write the report, relative to the catalog (default: .eventcatalog/fitness/results.json) |
| --format | string | No | Output format: text or json (default: text) |

**Examples:**

```bash
# Run every fitness function in the catalog
npx @eventcatalog/cli fitness check

# Run the fitness functions of a catalog in another directory
npx @eventcatalog/cli --dir ./my-catalog fitness check

# Print the report as JSON
npx @eventcatalog/cli fitness check --format json
```

**Exit codes:**
| Code | Meaning |
|------|---------|
| 0 | Every function passed, or only warned |
| 1 | A function found error-severity violations, or could not be evaluated |
| 2 | The check itself could not run (for example, the catalog directory does not exist) |

---
