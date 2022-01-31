# `@eventcatalog/plugin-doc-generator-amazon-eventbridge`

Amazon EventBridge document generator for EventCatalog.

## Usage

See [plugin-doc-generator-amazon-eventbridge documentation](https://eventcatalog.dev/docs/api/plugins/@eventcatalog/plugin-doc-generator-amazon-eventbridge).

## Using locally

You can test and run this plugin locally, by cloning the project.

First build all the projects

```sh
npm run install && npm run build
```

Then you need to set your environmental variables in the plugin directory.

See the `.env-example` to see what you need to set.

Once you set your variables you can then run

```sh
"PROJECT_DIR={outputForCatalog} node packages/eventcatalog-plugin-generator-amazon-eventbridge/scripts/generate-catalog-with-plugin.js`
```

This will run the build of the plugin and generate an eventcatalog from your amazon-eventbridge schema registry

