---
id: installation
title: Installation
---

Getting up and running with EventCatalog should take a few minutes (hopefully!).

## Requirements {#requirements}

- [Node.js](https://nodejs.org/en/download/) version >= 14 or above (which can be checked by running `node -v`). You can use [nvm](https://github.com/nvm-sh/nvm) for managing multiple Node versions on a single machine installed
- [Yarn](https://yarnpkg.com/en/) version >= 1.5 (which can be checked by running `yarn --version`). Yarn is a performant package manager for JavaScript and replaces the `npm` client. It is not strictly necessary but highly encouraged.

## Scaffold project website {#scaffold-project-website}

The easiest way to install EventCatalog is to use the command line tool that helps you scaffold a skeleton EventCatalog website. You can run this command anywhere in a new empty repository or within an existing repository, it will create a new directory containing the scaffolded files.

```bash
npx @eventcatalog/create-eventcatalog@latest [name]
```

Example:

```bash
npx @eventcatalog/create-eventcatalog@latest my-catalog
```

## Project structure {#project-structure}

Assuming you named your site `my-catalog`, you will see the following files generated under a new directory `my-catalog/`:

```sh
my-catalog
├── services
│   ├── Basket Service
│   │     └──index.md
│   ├── Data Lake
│   │     └──index.md
│   ├── Payment Service
│   │     └──index.md
│   ├── Shipping Service
│   │     └──index.md
├── events
│   ├── AddedItemToCart
│   │     └──versioned
│   │     │  └──0.0.1
│   │     │     └──index.md
│   │     │     └──schema.json
│   │     └──index.md
│   │     └──schema.json
│   ├── OrderComplete
│   │     └──index.md
│   │     └──schema.json
│   ├── OrderConfirmed
│   │     └──index.md
│   │     └──schema.json
│   ├── OrderRequested
│   │     └──index.md
│   ├── PaymentProcessed
│   │     └──index.md
├── static
│   └── img
├── eventcatalog.config.js
├── package.json
├── README.md
└── yarn.lock
```

### Project structure rundown {#project-structure-rundown}

- `/services/` - Contains the service Markdown files within your Architecture. These are optional but recommended. More details can be found in the [services guide](/docs/services/introduction)
- `/events/` - Contains your Event-Driven Architecture Events. These folders and files can contain markdown, schemas and much more. More details can be found in the [events guide](/docs/events/introduction)
- `/static/` - Static directory. Any contents inside here will be copied into the root of the final `build` directory. You can add your own logo here and favicon. More details can be found in the [customise guide](/docs/guides/customise)
- `/eventcatalog.config.js` - A config file containing the site configuration. Read the [API docs](/docs/api/eventcatalog-config)
- `/package.json` - File required for your application to work.


## Running the development server {#running-the-development-server}

To preview your changes as you edit the files, you can run a local development server that will serve your website and reflect the latest changes.

```bash
cd my-catalog
npm run dev
```

By default, a browser window will open at http://localhost:3000.

Congratulations! You have just created your first EventCatalog site!

## Build {#build}

EventCatlaog uses NextJS under the hood. To build the website run the following command:

```bash
npm run build
```

and contents will be generated within the `/build` directory. EventCatalog utilises a server to get access to files and much more....

This means you will need to run EventCatalog on a server.

Check out the docs on [deployment](/docs/guides/deployment) for more details.
