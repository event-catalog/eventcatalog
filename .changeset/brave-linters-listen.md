---
'@eventcatalog/linter': patch
---

Add `schema/unknown-field` and `schema/unknown-nested-field` rules that flag misspelled or unknown frontmatter keys (with "did you mean" suggestions and support for `x-` extension properties), sync the container `purpose` and `receives[].triggers` fields with core, and stop requiring a `summary` on users since the user schema has no such field.

Add `structure/unrecognised-file` rule that warns about markdown files under resource folders which no scan pattern recognises (e.g. `events/OrderCreated.mdx` instead of `events/OrderCreated/index.mdx`) and suggests the intended location.

Add `refs/file-exists` rule that errors when `schemaPath`, `schemas[]`, `specifications`, data product contract paths or `public/` icon paths point at files that do not exist.

Align version handling with EventCatalog core: `schema/valid-semver` now accepts number-like versions (`1`, `1.2`, `v1`, `V2`) and any semver range, and reference resolution treats `1`, `v1` and `1.0.0` as equivalent. Reference errors now distinguish a missing resource (`refs/resource-exists`, with "did you mean" suggestions and a hint when the id exists as another resource type) from a resource that exists at a different version (`refs/valid-version-range`, listing the available versions). Previously any versioned reference to a missing resource was reported under `refs/valid-version-range`.

Every finding now reports its `line:column` in the source file (keys for unknown/missing-field rules, values for reference rules, the body start for description rules, and YAML parse errors at the failing token). Findings within a file are printed in source order.
\n\nCLI: the summary now reports how many files were checked and ignored (previously it printed the number of files with problems), counts are pluralised correctly, progress output goes to stderr and is silenced when not in an interactive terminal (piped, `CI=true`), `--version` reports the real package version, and new `--quiet`, `--max-warnings <n>` and `--no-color` options were added.\n

Add `--init` (with `--force`) to scaffold a fully commented `.eventcatalogrc.js` listing every rule, its default severity and example options. Rule defaults now come from a single registry; the never-implemented `naming/*`, `versions/consistent-format` and `versions/no-deprecated` entries were removed from the defaults (they never reported anything).

`schema/valid-type` (missing required fields and wrong field types, e.g. a resource with no `version`) is now enabled by default. It was documented as a default rule but missing from the defaults, so those errors were silently dropped.
