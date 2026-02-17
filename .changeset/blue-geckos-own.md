---
'@eventcatalog/core': minor
---

Add support for resource-scoped custom docs under resource `docs/` folders.

- Introduce a new `resourceDocs` content collection for docs living under resource paths (e.g. `domains/<id>/docs/**`)
- Require `id`, `version`, and `type` frontmatter for resource docs
- Add new docs routes for resource docs pages:
  `/docs/:type/:id/:version/docs/:docType/:docId/:docVersion`
- Group resource docs by `type` in the left sidebar for the parent resource
