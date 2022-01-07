---
id: cli
---

# CLI

EventCatalog provides a set of scripts to help you generate, serve, and deploy your website.

Once your catalog is bootstrapped, the source will contain the EventCatalog scripts that you can invoke with your package manager:

```json title="package.json"
{
  // ...
  "scripts": {
    "dev": "eventcatalog dev",
    "start": "eventcatalog start",
    "build": "eventcatalog build",
    "generate": "eventcatalog generate",
  }
}
```

## Index {#index}

import TOCInline from "@theme/TOCInline"

<TOCInline toc={toc[1].children}/>

## EventCatalog CLI commands {#eventcatalog-cli-commands}

Below is a list of EventCatalog CLI commands and their usages:

### `eventcatalog start` {#eventcatalog-start-sitedir}

Starts the built EventCatalog (post-build phase)
### `eventcatalog build` {#eventcatalog-build-sitedir}

Compiles your site for production.

Starts the built EventCatalog (post-build phase)
### `eventcatalog dev` {#eventcatalog-dev-sitedir}

Runs your catalog in dev mode

### `eventcatalog generate` {#eventcatalog-dev-sitedir}

Used to generate your documentation from third party systems.

