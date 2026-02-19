# EventCatalog Modelling

> **Beta** - This package is in active development.

A browser-based EventCatalog Modelling workspace for the [EventCatalog DSL](../language-server/README.md). Write `.ec` code in a Monaco editor with syntax highlighting, completions, and diagnostics, and see your architecture visualised in real time.

## Getting Started

```bash
pnpm dev
```

Open `http://localhost:5173/new` to start from a blank canvas with no template selected.

## How It Works

EventCatalog Modelling uses the `@eventcatalog/language-server` to parse DSL input and the `@eventcatalog/visualiser` to render the resulting architecture graph. As you type, your DSL is parsed and the visualisation updates live.
