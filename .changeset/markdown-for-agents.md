---
'@eventcatalog/core': minor
---

Docs pages now point agents to their Markdown. Each page's `<head>` has a `<link rel="alternate" type="text/markdown">` to the same `.mdx` URL that llms.txt links to. In server mode, a request for a page with `Accept: text/markdown` gets its Markdown at the same URL (with `Vary: Accept`). The Markdown routes also now return `Content-Type: text/markdown`.
