---
sidebar_position: 2
keywords:
- EventCatalog api
sidebar_label: eventcatalog.config.js
title: eventcatalog.config.js
description: Understanding the configuration file for EventCatalog.
---

import AddedIn from '@site/src/components/MDX/AddedIn';

## Overview {#overview}

`eventcatalog.config.js` contains configurations for your site and is placed in the root directory of your site.

## Required fields {#required-fields}

### `cId` {#cId}

- Type: `string`

An automated generated ID for your catalog. EventCatalog will generate this for you.

```js title="eventcatalog.config.js"
module.exports = {
  cId: '107fdebb-7c68-42cc-975d-413b1d30d758',
};
```

### `title` {#title}

- Type: `string`

Title for your website.

```js title="eventcatalog.config.js"
module.exports = {
  title: 'EventCatalog',
};
```

### `organizationName` {#organizationName}

- Type: `string`

Your organization name.

```js title="eventcatalog.config.js"
module.exports = {
  organizationName: 'Your Company',
};
```

## Optional fields {#optional-fields}

### `base` {#base}

- Type: `string`
- Default value: `/`

The base path to deploy to. EventCatalog will use this path as the root for your pages and assets both in development and in production build.

```js title="eventcatalog.config.js"
module.exports = {
  base: '/',
};
```

### `output` {#output}

<AddedIn version="2.35.4" />

- Type: `string`
- Default value: `static`

The output type for your EventCatalog, choose from `static` or `server`.

:::info "What is the difference between static and server?"

- `static` - The default output type for EventCatalog. This will output a static website that you can host anywhere.
- `server` - This will output a Node.js server that you can host anywhere. This is required for certain features like the [EventCatalog Chat](/features/ai-assistant) (bring your own keys). The easiest way to host this is with our [Docker image](/docs/development/deployment/hosting-options#hosting-a-server).

:::

```js title="eventcatalog.config.js"
module.exports = {
  output: 'static',
};
```

### `outDir` {#outDir}

<AddedIn version="2.11.4" />

- Type: `string`
- Default value: `dist`

The output path of your EventCatalog. By default it will output to the `dist` folder.

```js title="eventcatalog.config.js"
module.exports = {
  // Catalog would output to the /build folder
  outDir: 'build',
};
```

### `trailingSlash` {#trailingSlash}

- Type: `boolean`
- Default: `false`

Set the route matching behavior of the dev server. Choose from the following options:

'true' - Only match URLs that include a trailing slash (ex: “/foo/“)
'false' - Match URLs regardless of whether a trailing ”/” exists

Use this configuration option if your production host has strict handling of how trailing slashes work or do not work.

```js title="eventcatalog.config.js"
module.exports = {
  // Setting to true will add / onto all routes e.g http://website.com/visualiser/
  trailingSlash: true,
};
```

### `port` {#port}

- Type: `number`
- Default: 3000

Configure the port EventCatalog is running on.

```js title="eventcatalog.config.js"
module.exports = {
  // Changes the port from default 3000 to 5000
  port: 5000,
};
```

### `host` {#host}

<AddedIn version="2.42.9" />

- Type: `string` | `boolean`
- Default: `false`

Set which network IP addresses the dev server should listen on (i.e. non-localhost IPs).

- `false` - do not expose on a network IP address
- `true` - listen on all addresses, including LAN and public addresses
- `[custom-address]` - expose on a network IP address at `[custom-address]`

```js title="eventcatalog.config.js"
module.exports = {
  host: '0.0.0.0',
};
```

### `server.allowedHosts` {#server.allowedHosts}

<AddedIn version="2.64.0" />

- Type: `string[]` | `true`
- Default: `[]`

A list of hostnames that Astro is allowed to respond to. When the value is set to true, any hostname is allowed.

You can read more on the Astro documentation [here](https://docs.astro.build/en/reference/configuration-reference/#serverallowedhosts).

```js title="eventcatalog.config.js"
module.exports = {
  server: {
    allowedHosts: ['example.com', 'subdomain.example.com'],
  },
};
```

### `generators` {#generators}

- Type: `Generator[]`
- Default: `[]`

Generators are the foundation of plugins with EventCatalog. EventCatalog will call your generators on build.


```js title="eventcatalog.config.js"
module.exports = {
  generators: [
    [
      // This will load plugin.js in the root of your catalog
      '<rootDir>/plugin.js',
      // configuration for your generator
      {
        customValue: true,
        test: "Add any configuration values you want"
      },
    ],
  ],
};
```

### `environments` {#environment}

<AddedIn version="2.48.2" />

- Type: `object`
- Default: `{}`

Optional configuration for EventCatalog environments.

When environments are set, a dropdown will be shown in the top right of the EventCatalog allowing your users to switch between environments.


```js title="eventcatalog.config.js"
module.exports = {
  environments: [
    {
      // Name of the environment
      name: 'Development',
      // URL of the environment
      url: 'https://demo.eventcatalog.dev',
      // Description of the environment
      description: 'Local development environment',
      // Short name of the environment (optional, used in the dropdown)
      shortName: 'Dev'
    },
    {
      name: 'Test',
      url: 'https://demo.eventcatalog.dev',
      description: 'Test environment for QA',
      shortName: 'Test'
    },
    {
      name: 'Production',
      url: 'https://demo.eventcatalog.dev',
      description: 'Production environment',
      shortName: 'Prod'
    },
  ]
};
```

### `landingPage` {#landingPage}

- Type: `string`
- Default: `'/docs'`

Configure the landing page URL your EventCatalog loads. By default EventCatalog loads `/` (the default or [custom landing page](/docs/development/customization/customize-landing-page#how-to-customize-your-landing-page)).

Clicking on the EventCatalog logo (or [your custom logo](/docs/api/config#logo)), will also go to this URL.

If you set this value the `Home` icon in the vertical navigation will not be shown and your users will be redirected to this default URL.

You can set this to any EventCatalog page URL. 

Examples:

- `/visualiser`
- `/discover/events`
- `/docs/services/InventoryService/0.0.2`

```js title="eventcatalog.config.js"
module.exports = {
  landingPage: '/visualiser',
};
```

### `sidebar` {#sidebar}

<AddedIn version="2.30.1" />

- Type: `Array[{ id: string, visible: boolean }]`

Configure the [application sidebar](/docs/development/customization/customize-sidebars/application-sidebar) in EventCatalog.

Show/hide items in the sidebar, [see list of options](/docs/development/customization/customize-sidebars/application-sidebar#showhide-items-in-the-application-sidebar).

```js title="eventcatalog.config.js"
module.exports = {
  sidebar: {
    // Will hide the AI chat feature in the sidebar
    id: '/chat',
    visible: false
  }
};
```

### `visualiser` {#visualiser}

<AddedIn version="2.42.0" />

- Type: `object`

Configuration for the [EventCatalog visualiser](/features/visualization).

```js title="eventcatalog.config.js"
module.exports = {
  visualiser: {
    // visualizer is enabled by default
    // you can turn it off by setting it to false
    enabled: true,

    channels: {
      // The render mode for channels in the visualiser
      // Flat or single
      renderMode: 'flat'
    }
  }
};
```

<!-- Table of configuration -->
| Configuration | Option | Default | Description |
| ------------- | ----------- | ----------- | ----------- |
| `visualiser.enabled` | `true` or `false` | `true` | **Enabled or disables the visualiser**. Setting this to false will not render any visualiser pages in your catalog and also remove references to the visualiser features in your catalog. _(Added in 2.65.1)_ |
| `visualiser.channels.renderMode` | `flat` or `single` | `flat` | The render mode for the visualiser. `flat` means the channel node is duplicated for each message. `single` means the channel node is a single node for all messages. Depending on your use case/preferences you may want to use one or the other. |






### `docs` {#docs}

- Type: `object`

Configure the [documentation sidebar](/docs/development/customization/customize-sidebars/documentation-sidebar) in EventCatalog.

```js title="eventcatalog.config.js"
module.exports = {
   docs: {
    sidebar: {
      type: 'LIST_VIEW'
    }
  }
};
```

Configuration for the documentation sidebar.

### `docs.sidebar` options

#### Sidebar Type

You can choose between `LIST_VIEW` or `TREE_VIEW` to render your documentation.

- `LIST_VIEW` will render your docs as you see in the [demo](https://demo.eventcatalog.dev/docs/) 
- `TREE_VIEW` will render the DOCS as a tree view and map your file system folder structure.
   - Can be useful for large catalogs and navigation

<AddedIn version="2.28.0" />


```js title="eventcatalog.config.js"
docs: {
    sidebar: {
      type: 'LIST_VIEW'
    },
  },
```

### Show/Hide Orphaned Messages

<AddedIn version="2.61.8" />

Any messages that do not belong to a service will be shown as orphaned messages in the sidebar (LIST_VIEW only).

If you wish to hide orphaned messages you can set the `showOrphanedMessages` to `false`.

```js title="eventcatalog.config.js"
docs: {
    sidebar: {
      type: 'LIST_VIEW',
      // Default is true
      showOrphanedMessages: false,
    },
  },
```

### `chat` {#chat}

- Type: `object`

Configuration for the EventCatalog AI chat feature.

:::info
The `chat` property requires a Starter or Scale plan and `output: 'server'` to take effect.
:::

```js title="eventcatalog.config.js"
module.exports = {
  chat: {
    // Set to false to disable the AI chat feature entirely
    enabled: false,
  },
};
```

| Option | Type | Default | Description |
| ------ | ---- | ------- | ----------- |
| `chat.enabled` | `boolean` | `true` | Enables or disables the AI chat feature. Set to `false` to hide the chat UI and prevent chat requests even when all other prerequisites are met. |

### `changelog` {#changelog}

- Type: `object`

Configuration for EventCatalog Changelog.

**Changelogs are disabled by default.**

You can enable changelogs by setting `enabled` to `true`.

```js title="eventcatalog.config.js"
module.exports = {
  changelog: {
    // Default is false
    enabled: true,
  },
};
```

### `editUrl` {#editUrl}

- Type: `string`

URL used when people want to edit the documentation. For example your GitHub repo and branch.

```js title="eventcatalog.config.js"
module.exports = {
  editUrl: 'https://github.com/boyney123/eventcatalog-demo/edit/master',
};
```

### `repositoryUrl` {#repositoryUrl}

<AddedIn version="2.42.3" />

- Type: `string`

:::tip
For Stater or Scale plans. This gives you the ability to show your own GitHub repository in EventCatalog (in the header bar).
:::

URL to your repository for EventCatalog.

```js title="eventcatalog.config.js"
module.exports = {
  repositoryUrl: 'https://github.com/boyney123/eventcatalog-demo',
};
```

### `logo` {#logo}

- Type: `object`

Logo, alt and text for your company logo.

:::tip Public directory
Add your logo to your `/public` directory.
:::

```js title="eventcatalog.config.js"
module.exports = {
  logo: {
    // This logo is located at public/logo.svg
    src: '/logo.svg',
    alt: 'Company logo',
    text: 'Urban Slice | EventCatalog',
  },
};
```

**Example output**

![./logo.png](./logo.png)

### `homepageLink` {#homepageLink}

- Type: `string`

URL used when people want to link the logo & title in the top navigation to the homepage of a website.

```js title="eventcatalog.config.js"
module.exports = {
  homepageLink: 'https://eventcatalog.dev',
};
```

### `mdxOptimize` {#mdxOptimize}

- Type: `string`

This is an optional configuration setting to optimize the MDX output for faster builds. This may be useful if you have many catalog files and notice slow builds. However, this option may generate some unescaped HTML, so make sure your catalog interactive parts still work correctly after enabling it.

This is disabled by default. 

Read [Astro documentation on optimize for MDX](https://docs.astro.build/en/guides/integrations-guide/mdx/#optimize) for more information.

```js title="eventcatalog.config.js"
module.exports = {
  mdxOptimize: true
};
```

### `compress` {#compress}

<AddedIn version="2.48.5" />

- Type: `boolean`

Setting this to true will automatically compress all your CSS, HTML, SVG, JavaScript, JSON and image files in the Astro outDir folder.

This is disabled by default from EventCatalog v2.61.9.

**This only works for static builds.**

```js title="eventcatalog.config.js"
module.exports = {
  compress: true
};
```

### `asyncAPI.renderParsedSchemas` {#asyncAPI.renderParsedSchemas}

<AddedIn version="2.12.1" />

- Type: `boolean`

EventCatalog will render your AsyncAPI files into their own pages. By default EventCatalog will read your AsyncAPI files and parse your schemas to render them on the screen. Part of this process is validating your schemas and also adding metadata onto them (default).

If you want to keep your schemas as they are then you can set the `asyncAPI.renderParsedSchemas` to false. 

:::tip Having issues rendering AsyncAPI files?
If you are having issues seeing or rendering your AsyncAPI file try setting the renderParsedSchemas to `false`
:::

```js title="eventcatalog.config.js"
module.exports = {
  asyncAPI: {
    renderParsedSchemas: false // default is true
  }
};
```

### `mermaid` {#mermaid}

<AddedIn version="2.18.1" />

- Type: `object`

EventCatalog uses [mermaid](https://mermaid.js.org/) to render diagrams.

Using mermaid you can render icons in your diagrams (e.g [AWS architecture icons](/docs/development/components/diagram-syntax/mermaid#architecture-diagrams-with-icons)).

<img src="/img/mermaid/mermaid-custom-icons.png" alt="Example output of mermaid" style={{width: "20%"}}/>

```js title="eventcatalog.config.js"
module.exports = {
  mermaid: {
    iconPacks: ['logos'], // will load https://icones.js.org/collection/logos into eventcatalog
    maxTextSize: 100000 // maximum text size for Mermaid diagrams (default: 100000)
  }
};
```

You can choose from over **200,000 icons** from [icones.js.org](https://icones.js.org/collection/logos).

#### `mermaid.iconPacks`

<AddedIn version="2.18.1" />

- Type: `string[]`
- Default: `[]`

Icon packs to load from [icones.js.org](https://icones.js.org/). Use icon pack names like `['logos', 'mdi']` to load AWS, Azure, and other service icons.

[Learn more about using icons in mermaid diagrams](/docs/development/components/diagram-syntax/mermaid#architecture-diagrams-with-icons).

#### `mermaid.maxTextSize`

<AddedIn version="3.9.1" />

- Type: `number`
- Default: `100000`

Maximum text size for Mermaid diagrams in characters. Increase this value if you have large diagrams that fail to render.

```js title="eventcatalog.config.js"
module.exports = {
  mermaid: {
    maxTextSize: 200000 // Allow larger diagrams
  }
};
```

### `rss` {#rss}

<AddedIn version="2.21.1" />

- Type: `object`
- Default: `{ enabled: false, limit: 15 }`

Configure RSS feeds for catalog resources. RSS feeds are disabled by default.

When enabled, EventCatalog creates feeds for messages, services, domains, flows, and an `all` feed that combines the latest changes across supported resource types.

```js title="eventcatalog.config.js"
module.exports = {
  rss: {
    enabled: true,
    limit: 20,
  },
};
```

#### `rss.enabled`

- Type: `boolean`
- Default: `false`

Turns RSS feeds on or off.

#### `rss.limit`

- Type: `number`
- Default: `15`

Controls the maximum number of items returned in each feed.

Items are ordered by the last updated date of the resource file, with the most recently changed items first.

#### Feed URLs

After RSS is enabled, EventCatalog serves feeds at these paths:

| Feed | Path | Demo |
| --- | --- | --- |
| Events | `/rss/events/rss.xml` | [View demo](https://demo.eventcatalog.dev/rss/events/rss.xml) |
| Commands | `/rss/commands/rss.xml` | [View demo](https://demo.eventcatalog.dev/rss/commands/rss.xml) |
| Queries | `/rss/queries/rss.xml` | [View demo](https://demo.eventcatalog.dev/rss/queries/rss.xml) |
| Services | `/rss/services/rss.xml` | [View demo](https://demo.eventcatalog.dev/rss/services/rss.xml) |
| Domains | `/rss/domains/rss.xml` | [View demo](https://demo.eventcatalog.dev/rss/domains/rss.xml) |
| Flows | `/rss/flows/rss.xml` | [View demo](https://demo.eventcatalog.dev/rss/flows/rss.xml) |
| Everything | `/rss/all/rss.xml` | [View demo](https://demo.eventcatalog.dev/rss/all/rss.xml) |

### `llms.txt` {#llms.txt}

<AddedIn version="2.20.0" />

Enable tools like Claude, ChatGPT, GitHub Copilot, and Cursor to quickly understand your EventCatalog.

```js title="eventcatalog.config.js"
{
  llmsTxt: {
    enabled: true,
  }
}
```

See the [LLMs documentation](/docs/development/developer-tools/llms.txt) for more information, how you can use it and examples.


### `fullCatalogAPIEnabled` {#fullCatalogAPIEnabled}

<AddedIn version="3.10.2" />

- Type: `boolean`
- Default: `true`

Enable or disable the full catalog API which allows you to get the full catalog dump in the `/api/catalog` endpoint.

```js title="eventcatalog.config.js"
module.exports = {
  api: {
    fullCatalogAPIEnabled: false, // default is true
  }
};
```
### `domains` {#domains}

<AddedIn version="2.63.0" />

- Type: `object`

Configuration for the domains table.

```js title="eventcatalog.config.js"
module.exports = {
  domains: {
    tableConfiguration: {
      columns: {
        name: { visible: true, label: 'Name' },
        summary: { visible: true, label: 'Summary' },
        services: { visible: true, label: 'Services' },
        badges: { visible: true, label: 'Badges' },
        actions: { visible: true, label: 'Actions' },
      }
    }
  }
};
```

See the [Customize tables](/docs/development/customization/customize-tables) documentation for more information and examples.

### `events` {#events}

<AddedIn version="2.63.0" />

- Type: `object`

Configuration for the events table.

```js title="eventcatalog.config.js"
module.exports = {
  events: {
    tableConfiguration: { 
      columns: {
        name: { visible: true, label: 'Name' },
        summary: { visible: true, label: 'Summary' },
        producers: { visible: true, label: 'Producers' },
        consumers: { visible: true, label: 'Consumers' },
        badges: { visible: true, label: 'Badges' },
        actions: { visible: true, label: 'Actions' },
      }
    }
  }
};
```

See the [Customize tables](/docs/development/customization/customize-tables) documentation for more information and examples.

### `queries` {#queries}

<AddedIn version="2.63.0" />

- Type: `object`

Configuration for the queries table.

```js title="eventcatalog.config.js"
module.exports = {
  queries: {
    tableConfiguration: { 
      columns: {
        name: { visible: true, label: 'Name' },
        summary: { visible: true, label: 'Summary' },
        producers: { visible: true, label: 'Producers' },
        consumers: { visible: true, label: 'Consumers' },
        badges: { visible: true, label: 'Badges' },
        actions: { visible: true, label: 'Actions' },
      }
    }
  }
};
```

### `commands` {#commands}

<AddedIn version="2.63.0" />

- Type: `object`

Configuration for the commands table.

```js title="eventcatalog.config.js"
module.exports = {
  commands: {
    tableConfiguration: {
      columns: {
        name: { visible: true, label: 'Name' },
        summary: { visible: true, label: 'Summary' },
        producers: { visible: true, label: 'Producers' },
        consumers: { visible: true, label: 'Consumers' },
        badges: { visible: true, label: 'Badges' },
        actions: { visible: true, label: 'Actions' },
      }
    }
  }
};
```

See the [Customize tables](/docs/development/customization/customize-tables) documentation for more information and examples.

### `services` {#services}

<AddedIn version="2.63.0" />

- Type: `object`

Configuration for the services table.

```js title="eventcatalog.config.js"
module.exports = {
  services: {
    tableConfiguration: {
      columns: {
        name: { visible: true, label: 'Name' },
        summary: { visible: true, label: 'Summary' },
        sends: { visible: true, label: 'Sends' },
        receives: { visible: true, label: 'Receives' },
        badges: { visible: true, label: 'Badges' },
        actions: { visible: true, label: 'Actions' },
      }
    }
  }
};  
```

See the [Customize tables](/docs/development/customization/customize-tables) documentation for more information and examples.

### `containers` {#containers}

<AddedIn version="2.63.0" />

- Type: `object`

Configuration for the containers table.

```js title="eventcatalog.config.js"
module.exports = {
  containers: {
    tableConfiguration: {
      columns: {
        name: { visible: true, label: 'Name' },
        summary: { visible: true, label: 'Summary' },
        writes: { visible: true, label: 'Writes' },
        reads: { visible: true, label: 'Reads' },
        badges: { visible: true, label: 'Badges' },
        actions: { visible: true, label: 'Actions' },
      }   
    }
  }
};
```

See the [Customize tables](/docs/development/customization/customize-tables) documentation for more information and examples.

### `flows` {#flows}

<AddedIn version="2.63.0" />

- Type: `object`

Configuration for the flows table.

```js title="eventcatalog.config.js"
module.exports = {
  flows: {
    tableConfiguration: {
      columns: {
        name: { visible: true, label: 'Name' },
        summary: { visible: true, label: 'Summary' },
        version: { visible: true, label: 'Version' },
        badges: { visible: true, label: 'Badges' },
        actions: { visible: true, label: 'Actions' },
      }
    }
  }
};
```

See the [Customize tables](/docs/development/customization/customize-tables) documentation for more information and examples.

### `users` {#users}

<AddedIn version="2.63.0" />

- Type: `object`

Configuration for the users table.

```js title="eventcatalog.config.js"
module.exports = {
  users: {
    tableConfiguration: {
      columns: {
        name: { visible: true, label: 'Name' },
        email: { visible: true, label: 'Email' },
        slackDirectMessageUrl: { visible: true, label: 'Slack URL' },
        summary: { visible: true, label: 'Summary' },
        badges: { visible: true, label: 'Badges' },
        actions: { visible: true, label: 'Actions' },
      }
    }
  }
};
```

See the [Customize tables](/docs/development/customization/customize-tables) documentation for more information and examples.

### `scalarConfiguration` {#scalarConfiguration}

- Type: `object`

Pass custom configuration directly to the [Scalar](https://scalar.com/) OpenAPI reference component. Any properties set here are spread into Scalar's configuration, allowing you to override or extend the defaults EventCatalog applies.

This is useful when you need Scalar-specific behaviour such as routing API requests through a proxy, changing the theme, or disabling built-in UI controls.

```js title="eventcatalog.config.js"
module.exports = {
  scalarConfiguration: {
    // Route OpenAPI requests through a proxy
    proxy: 'https://proxy.example.com',
  },
};
```

Refer to the [Scalar configuration reference](https://github.com/scalar/scalar/blob/main/documentation/configuration.md) for the full list of supported options.

:::info Note on defaults
EventCatalog sets several Scalar options by default (such as `theme`, `showSidebar`, and `hideDarkModeToggle`). Any matching keys in `scalarConfiguration` will override these defaults.
:::

### `teams` {#teams}

<AddedIn version="2.63.0" />

- Type: `object`

Configuration for the teams table.

```js title="eventcatalog.config.js"  
module.exports = {
  teams: {
    tableConfiguration: {
      columns: {
        name: { visible: true, label: 'Name' },
        summary: { visible: true, label: 'Summary' },
        badges: { visible: true, label: 'Badges' },
        actions: { visible: true, label: 'Actions' },
      }
    }
  }
};
```

See the [Customize tables](/docs/development/customization/customize-tables) documentation for more information and examples.
