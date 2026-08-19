# Repository Guidelines

## Project Structure & Module Organization
This repository is a `pnpm` + Turborepo monorepo. Packages live in `packages/*`:
- `packages/core`: main EventCatalog app (Astro + React) and local scripts.
- `packages/cli`, `packages/sdk`, `packages/linter`, `packages/visualiser`, `packages/create-eventcatalog`.

Examples and integration checks live in `examples/` (notably `examples/default`). Shared release metadata is in `.changeset/`.

## Build, Test, and Development Commands
Run from repo root unless noted:
- `pnpm i`: install workspace dependencies.
- `pnpm build:bin`: build distributable artifacts across packages.
- `pnpm build`: run full Turbo build graph.
- `pnpm test`: run package tests.
- `pnpm test:ci`: CI-style test run used by GitHub Actions.
- `pnpm format` / `pnpm format:diff`: format or check formatting.
- `pnpm start:catalog`: run local catalog via `@eventcatalog/core`.
- `pnpm --filter @eventcatalog/<pkg> run <script>`: work on one package (example: `pnpm --filter @eventcatalog/sdk test`).

## Coding Style & Naming Conventions
Code is primarily TypeScript. Follow package Prettier rules:
- 2 spaces, semicolons, single quotes, trailing commas (`es5`), print width 130.
- Astro files in core use `prettier-plugin-astro`.

Naming patterns:
- React components: `PascalCase` (for example `NodeGraph.tsx`).
- Utility/module files: existing local style (`kebab-case` or descriptive lowercase) within that package.
- Keep public API names explicit and package-scoped.

## Testing Guidelines
Vitest is the default test framework across packages. Tests are placed either near source (`src/test`, `test`, `tests`) or under `__tests__`.
- Use `*.test.ts` or `*.spec.ts` to match existing suites.
- Add/adjust tests with every behavior change.
- For CLI tests (especially under `packages/cli/src/test/import-export`), use descriptive, rule-style test names that read in plain English, for example: `when we import a domain that does not exist in the catalog, a domain resource is created`.
- For CLI export tests, assert exact expected outputs and errors (prefer `toBe` with full strings) instead of partial-match assertions like `toContain`.
- For multiline CLI export DSL assertions, use the shared `dsl` template tag with `toBe(...)` so expected blocks stay readable and indented in the test file.
- For core/UI-impacting changes, also verify catalog build paths (`pnpm verify-build:catalog`).

## Federation Pipeline Checks

Federation is a three-stage pipeline in `packages/sdk`: `buildIndex` discovers and describes catalog content, `resolve` combines indexes into a graph, and `hydrate` materializes the resolved content. Any future change to resources, relationships, schemas/specifications, sidecars, assets, paths, hashes, or catalog filesystem conventions must be reviewed across all three stages, even when the requested change initially appears to affect only one stage.

- Check whether `packages/sdk/src/build-index.ts` and its index types need to capture the new or changed data.
- Check whether `packages/sdk/src/resolve.ts` must preserve, merge, validate, conflict-check, or create edges for that data.
- Check whether `packages/sdk/src/hydrate.ts` must fetch, verify, cache, write, reference, or remove that data safely.
- Add or update focused tests in `build-index.test.ts`, `resolve.test.ts`, and `hydrate.test.ts` wherever the behavior crosses those boundaries.
- Run the relevant focused tests and the complete SDK suite (`pnpm --filter @eventcatalog/sdk test`) before considering federation-related work complete.
- When filesystem output changes, rerun the default-catalog federation integration review and inspect the diff against `examples/default` so missing, extra, or stale files are deliberate.

## Commit & Pull Request Guidelines
Recent history favors Conventional Commit style with scopes:
- `feat(cli): add import command`
- `fix(core): avoid first-run dev restart`

Use `<type>(<scope>): <imperative summary>` when possible. For PRs:
- Fill in the Motivation section from `.github/PULL_REQUEST_TEMPLATE.md`.
- Link related issues.
- Include screenshots/GIFs for UI changes.
- Add a changeset (`pnpm changeset`) for publishable package changes unless the change is internal-only.

## Important

Never start the catalog, the catalog is already running.
