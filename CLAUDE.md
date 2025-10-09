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
