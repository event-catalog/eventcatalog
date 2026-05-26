---
'@eventcatalog/sdk': patch
---

Fix `addMessageToChannel` (and its `addEventToChannel` / `addCommandToChannel` / `addQueryToChannel` bindings) corrupting catalog layout.

The function previously split the existing resource path with a template *string* — `` `/[\\/]+${collection}` `` — instead of a real `RegExp`. The literal substring never matched real paths, so `.split()` returned the input unchanged and the resource was rewritten under `<catalog>/<collection>/<id>/index.mdx/<collection>/<id>/index.mdx`, with `index.mdx` becoming a directory.

The fix mirrors the regex form already used in `services.ts` (`new RegExp('[\\\\/]+' + collection)`), so the split matches both POSIX and Windows path separators. A regression test under `addEventToChannel` asserts that the canonical event path stays a file and the duplicate nested path does not exist.
