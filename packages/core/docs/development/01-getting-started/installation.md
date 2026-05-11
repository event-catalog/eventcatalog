---
sidebar_position: 3
keywords:
- EventCatalog installation install
sidebar_label: Installation
title: Installation
description: Install EventCatalog and create a new catalog
---

The `create-eventcatalog` CLI command is the fastest way to start a new EventCatalog project. It creates a catalog directory, installs what you need, and gives you scripts for local development and production builds.

You can also start from a template, create an empty catalog, or use the EventCatalog AI skill to generate documentation from an existing codebase.

## Prerequisites

- [Node.js](https://nodejs.org/en/download/) v22 or higher. Check your version with `node -v`.
- A terminal to run the EventCatalog CLI.
- A text editor to edit your catalog files.

## Install from the CLI wizard

Run the following command in your terminal:

```bash
npx @eventcatalog/create-eventcatalog@latest my-catalog
```

This creates a `my-catalog` directory with:

- an EventCatalog project
- sample architecture resources
- an `eventcatalog.config.js` file
- a `package.json` file with scripts for local development and builds

Now move into your new project directory:

```bash
cd my-catalog
```

If the CLI asks whether to install dependencies and you skip that step, install them before continuing:

```bash
npm install
```

## Start the development server

Start EventCatalog locally:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to view your catalog.

## CLI installation flags

You can pass flags to `create-eventcatalog` to customize the catalog that gets created.

### Create an empty catalog

Use `--empty` when you want a clean catalog without sample resources.

```bash
npx @eventcatalog/create-eventcatalog@latest my-catalog --empty
```

### Use a starter template

Use `--template` to start from one of the EventCatalog integration templates.

```bash
npx @eventcatalog/create-eventcatalog@latest my-catalog --template asyncapi
```

Templates are useful when you already know which integration you want to use, such as AsyncAPI, OpenAPI, EventBridge, GitHub, or a schema registry.

## Generate a catalog from an existing codebase

If you already have a codebase, you can use the [Catalog Documentation Creator](https://github.com/event-catalog/skills) AI skill to generate EventCatalog documentation from the information in your project.

First, add the EventCatalog skill to your project:

```bash
npx skills add event-catalog/skills --skill catalog-documentation-creator
```

Then ask your AI agent to inspect your codebase and generate EventCatalog documentation:

```txt
Look at my directory and generate EventCatalog documentation from information you find.
```

The generated files can be edited like any other EventCatalog documentation. Learn more about [EventCatalog skills](/docs/development/ask-your-architecture/skills/introduction).

## Next steps

- [Understand the project structure](/docs/development/getting-started/project-structure)
- [Develop and build your catalog](/docs/development/getting-started/develop-and-build)
- [Create your first domain](/docs/development/guides/domains/creating-domains/adding-domains)
- [Create your first service](/docs/development/guides/services/adding-services)
- [Document your first message](/docs/development/guides/messages/overview)
