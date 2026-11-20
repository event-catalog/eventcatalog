---
'@eventcatalog/core': patch
---

fix(core): OpenAPI, AsyncAPI and GraphQL pages now show specifications kept in a folder inside the resource (e.g. `path: specifications/openapi.yaml`). Before, these pages looked for the file by its name only, next to the resource's `index.mdx`, and said the file was not found, while the download link served it. The pages now read the file from its whole path, as the generic specification page and the download link already did
