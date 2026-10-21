---
'@eventcatalog/core': patch
---

fix(core): MCP server and AI chat tools now return a service's AsyncAPI, OpenAPI and GraphQL specifications from getSchemaForResource; list what a domain or system sends and receives through the services, agents, systems and subdomains inside it (with `by` naming who); include domains that send or receive a message, and leave out old versions of resources, in the producer, consumer and change impact tools; match sends and receives to message versions the way the message pages do (semver ranges, x-patterns, and no version meaning the latest); and return compact JSON so tool results use about a fifth fewer tokens
