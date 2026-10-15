# @eventcatalog/exporters

Export an [EventCatalog](https://www.eventcatalog.dev) to other formats.

Today it exports the **architecture reference**: your whole catalog as one self-contained HTML file you can share, attach or host anywhere. Every domain, system, service, message, channel, data store, flow, entity and team gets its own section, linked to everything it relates to, with message attributes from your schemas (JSON Schema, Avro and Protobuf), example payloads, TypeScript types and your specifications.

## You probably don't need this package directly

- **`eventcatalog build`** writes `architecture.html` into your build output on every build. Turn it off in `eventcatalog.config.js`:

  ```js
  export default {
    exports: {
      html: { enabled: false },
    },
  };
  ```

- **The CLI** exports it on demand and opens it in your browser:

  ```bash
  npx @eventcatalog/cli export --format html --output architecture.html
  ```

## Using the package

```ts
import { renderHtml, writeHtml, loadCatalog } from '@eventcatalog/exporters';

// Render the reference as a string
const { html } = await renderHtml('/path/to/catalog');

// Or write it to a file
const { path, bytes, durationMs } = await writeHtml({ dir: '/path/to/catalog', outputPath: 'architecture.html' });

// Or load the catalog into one resolved model (relationships, schemas, owners) to build your own export
const model = await loadCatalog('/path/to/catalog');
```

## License

MIT
