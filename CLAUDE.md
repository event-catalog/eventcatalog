# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Build, Lint, and Test Commands

- **Build**: `pnpm run verify-build:catalog`
- **Test**: `pnpm run test`
- **Format and lint code**: `pnpm run format`
- **Start the catalog**: `pnpm run start:catalog`

## Code Style Guidelines

### TypeScript

- Strict typing with TypeScript
- ES modules with explicit imports/exports
- Error handling with proper type guards

## Project Structure

- `/eventcatalog` - The EventCatalog codebase
- `/examples/default` - An example of how users use EventCatalog. This is the default example that is used when you run `pnpm run start:catalog`
- `/scripts` - Scripts to help with the development of the EventCatalog

Run linting and formatting before submitting changes. Follow existing patterns when adding new code.

## Theming Guidelines

EventCatalog uses CSS variables for theming to support light/dark mode and custom themes. When writing new features or components:

### Use CSS Variables Instead of Hardcoded Colors

```astro
<!-- ✅ Correct - uses CSS variables -->
<div class="bg-[rgb(var(--ec-page-bg))] text-[rgb(var(--ec-page-text))]">

<!-- ❌ Incorrect - hardcoded colors -->
<div class="bg-white text-gray-900 dark:bg-gray-900 dark:text-white">
```

### Common CSS Variables

| Variable | Usage |
|----------|-------|
| `--ec-page-bg` | Page/content background |
| `--ec-page-text` | Primary text color |
| `--ec-page-text-muted` | Secondary/muted text |
| `--ec-page-border` | Borders and dividers |
| `--ec-card-bg` | Card/elevated surface background |
| `--ec-accent` | Accent/brand color |
| `--ec-accent-subtle` | Light accent background |
| `--ec-accent-text` | Text on accent backgrounds |
| `--ec-button-bg` | Button background |
| `--ec-button-text` | Button text |
| `--ec-icon-color` | Icon default color |
| `--ec-icon-hover` | Icon hover color |
| `--ec-input-bg` | Input field background |
| `--ec-input-border` | Input field border |
| `--ec-input-text` | Input field text |

### Theme Files

- Base theme: `eventcatalog/src/styles/theme.css`
- Additional themes: `eventcatalog/src/styles/themes/*.css` (ocean, sapphire, sunset, forest)

### Key Points

1. Variables use RGB values without `rgb()` wrapper for Tailwind opacity support
2. Use the syntax `[rgb(var(--ec-variable))]` in Tailwind classes
3. For opacity, use `[rgb(var(--ec-variable)/0.5)]`
4. Dark mode is handled automatically via `data-theme="dark"` attribute
5. Never use `dark:` Tailwind variants for theme colors - the CSS variables handle this
