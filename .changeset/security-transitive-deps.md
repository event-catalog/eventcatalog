---
'@eventcatalog/core': patch
'@eventcatalog/cli': patch
'@eventcatalog/exporters': patch
---

fix(core): update dependencies with known vulnerabilities (GHSA-v4v9-w7cf-4c6q). Core now needs `@scalar/api-reference-react` 0.9.82 or later (vue, axios, nanoid and `@ai-sdk/provider-utils` fixes) and expressive-code 0.44.3 or later (`postcss-selector-parser` 7). The CLI and exporters need `js-yaml` 4.3.2 or later. The lockfile also picks up fixed versions of undici, fast-uri, dompurify, fast-xml-parser, lodash, minimatch, brace-expansion, sharp and others that the existing ranges already allowed. If your project's lockfile still holds an older version, refresh it (for example `npm update`) to get them
