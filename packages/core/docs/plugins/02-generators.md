---
sidebar_position: 2
keywords:
  - Generators
sidebar_label: Understanding generators
title: Generators
description: Understanding EventCatalog generators.
---
EventCatalog generators are custom scripts executed before the build process begins.

During the catalog build, your configured generators run dynamically, providing the opportunity to utilize open-source generators and plugins or develop your own custom solutions.

### Why use generators?

Generators can be used to automate areas of your catalog. Examples of this include API requests to get schemas from a cloud provider, or integrating with brokers. A generator script can be anything you want.

You can also use the [EventCatalog SDK](/docs/sdk) within your generators to interact with your catalog.

### Getting Started

When configuring a generator you need to define an entry point and it's custom configuration.

In the example below we create a new plugin called `plugin.js` located in the root of the project.
The object below is configuration the plugin will receive.

```js title="eventcatalog.config.js"
generators: [
    [
        // This generator called 'plugin.js' is located at in the root of your catalog
      '<rootDir>/plugin.js',
      // This is custom configuration your generator can use.
      {
        customValue: true,
        hello: 'world'
      },
    ],
    // more generators...
  ],
```

```js title="/plugin.js"
const utils = require('@eventcatalog/sdk');

// Plugins require CJS files at the moment, this is being worked on...
const { getEvent } = utils.default(__dirname);

// The config value is your EventCatalog config
// The options value is the configuration you pass to your plugin
module.exports = async (config, options) => {

    // access to your eventcatalog.config.js file
    const { homepageLink } = config;

    // Get values from your custom configuration
    const { customValue, hello  } = options;

    // Call the EventCatalog SDK
    const event = await getEvent('InventoryAdjusted');
}
```

### Running your generators

To run your generators you need to call the command

```sh
npm run generate
```

Run generators in their debug mode.

```sh
npm run generate -- debug
```

EventCatalog will then run through your generators and call your scripts.