# `@eventcatalog/plugin-doc-generator-asyncapi`

AsyncAPI document generator for EventCatalog.

## Usage

See [plugin-doc-generator-asyncapi documentation](https://eventcatalog.dev/docs/api/plugins/@eventcatalog/plugin-doc-generator-asyncapi).

## Using locally

You can test and run this plugin locally, by cloning the project.

First build all the projects

```sh
npm install && npm run build
```

Then you can run 

```sh
"PROJECT_DIR={outputForCatalog} node packages/eventcatalog-plugin-generator-asyncapi/scripts/generate-catalog-with-plugin.js
```

This will run the build of the plugin and generate an eventcatalog from an AsyncAPI file (found in examples).

