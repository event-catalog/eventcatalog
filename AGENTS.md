# Repository Guidelines

## Project Structure & Module Organization
This repository is a `pnpm` + Turborepo monorepo. Packages live in `packages/*`:
- `packages/core`: main EventCatalog app (Astro + React) and local scripts.
- `packages/cli`, `packages/sdk`, `packages/linter`, `packages/language-server`, `packages/visualiser`, `packages/create-eventcatalog`.
- `packages/playground`: local DSL playground app.

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
- For core/UI-impacting changes, also verify catalog build paths (`pnpm verify-build:catalog`).

## Commit & Pull Request Guidelines
Recent history favors Conventional Commit style with scopes:
- `feat(cli): add import command`
- `fix(core): avoid first-run dev restart`

Use `<type>(<scope>): <imperative summary>` when possible. For PRs:
- Fill in the Motivation section from `.github/PULL_REQUEST_TEMPLATE.md`.
- Link related issues.
- Include screenshots/GIFs for UI changes.
- Add a changeset (`pnpm changeset`) for publishable package changes unless the change is internal-only.
