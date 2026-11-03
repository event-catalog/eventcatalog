---
'@eventcatalog/core': minor
---

feat(core): download a specification's file from its page. Every AsyncAPI, OpenAPI, GraphQL and generic specification is served as written next to its page (`/docs/{type}/{id}/{version}/{asyncapi|spec|graphql|generic}/{filename}/{file}`), and services also get a URL for their latest version (`/docs/services/{id}/{asyncapi|spec|graphql}/{filename}/{file}`). The AsyncAPI, GraphQL and generic pages have a Download button (Scalar already has one on OpenAPI pages). The Schema API (`/api/schemas/services/...`) now sends the specification's media type instead of `text/plain`
