---
'@eventcatalog/create-eventcatalog': minor
---

feat(create-eventcatalog): new catalogs get a GitHub Actions workflow that runs the linter, fitness functions and build on every pull request. Pass `--no-github-actions` to leave it out. It's skipped when the catalog is created in a subfolder of an existing repository, because GitHub wouldn't run it from there.

Fixes the team pages in the AsyncAPI, OpenAPI and GraphQL templates, which failed the linter.
