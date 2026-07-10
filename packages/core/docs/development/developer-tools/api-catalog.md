---
sidebar_position: 5
keywords:
- api-catalog
- RFC 9727
- well-known
- API discovery
- OpenAPI
- AsyncAPI
- GraphQL
sidebar_label: api-catalog (RFC 9727)
title: api-catalog
description: Machine-readable catalog discovery endpoint for tools and agents
---

import AddedIn from '@site/src/components/MDX/AddedIn';

<AddedIn version="3.42.0" />

Let API tools, agents, and crawlers discover every service and domain specification in your catalog from a single endpoint, without parsing HTML.

### What is RFC 9727?

[RFC 9727](https://datatracker.ietf.org/doc/rfc9727/) defines the `/.well-known/api-catalog` well-known URI. It returns a [Linkset](https://www.rfc-editor.org/rfc/rfc9264) document that lists every API an organization publishes along with links to their specifications and documentation.

Tools that understand RFC 9727 can point at your catalog URL and immediately enumerate all services and domains, their OpenAPI, AsyncAPI, and GraphQL specs, and their documentation pages. No scraping required.

### How it works

EventCatalog automatically publishes a Linkset at `/.well-known/api-catalog`. Every service and domain that has `specifications` defined in its frontmatter appears as an entry.

Each entry contains:

- **`anchor`** - the canonical URL of the service. EventCatalog reads the `servers[].url` field from OpenAPI or AsyncAPI specs and uses that. When no server URL is found it falls back to the EventCatalog documentation page.
- **`service-desc`** - one link per specification file, pointing at `/api-catalog/specifications/{collection}/{id}/{version}/{specification}` with the correct media type (`application/yaml`, `application/json`, or `application/graphql`).
- **`service-doc`** - two links per resource: the markdown source and the rendered HTML page.

Resources marked `hidden: true` are excluded from the linkset.

### Access the endpoint

```
GET  /.well-known/api-catalog
HEAD /.well-known/api-catalog
```

The `GET` response body is `application/linkset+json` profiled against RFC 9727:

```json
{
  "linkset": [
    {
      "anchor": "https://api.example.com/orders",
      "service-desc": [
        {
          "href": "https://catalog.example.com/api-catalog/specifications/services/OrderService/1.0.0/openapi-b3BlbmFwaS55bWw",
          "type": "application/yaml",
          "title": "Order Service OpenAPI"
        }
      ],
      "service-doc": [
        {
          "href": "https://catalog.example.com/docs/services/OrderService/1.0.0.md",
          "type": "text/markdown",
          "title": "Order Service documentation"
        },
        {
          "href": "https://catalog.example.com/docs/services/OrderService/1.0.0",
          "type": "text/html",
          "title": "Order Service documentation"
        }
      ]
    }
  ]
}
```

The `HEAD` response includes a `Link` header so clients can confirm the endpoint exists before fetching the full body:

```
Link: <https://catalog.example.com/.well-known/api-catalog>; rel="api-catalog"
```

### Fetch a specification file

The raw specification files referenced in `service-desc` are served from:

```
GET /api-catalog/specifications/{collection}/{id}/{version}/{specification}
```

| Segment | Values |
|---------|--------|
| `collection` | `services`, `domains` |
| `id` | The resource `id` field |
| `version` | The resource `version` field |
| `specification` | Stable specification identifier, formatted as `{type}-{base64url(path)}` |

Example:

```
GET /api-catalog/specifications/services/OrderService/1.0.0/openapi-b3BlbmFwaS55bWw
Content-Type: application/yaml
```

### MCP server entry

When the EventCatalog MCP server is enabled, an additional entry pointing at `/docs/mcp` is appended to the linkset. This lets MCP-aware agents discover the catalog's machine interface alongside its API specifications.

### What is included

Only services and domains are included in v1 of this endpoint. Events, commands, queries, data products, schemas, diagrams, teams, and users are out of scope for this release.

For a broader machine-readable index of your catalog content, see [llms.txt](/docs/development/ask-your-architecture/llms.txt) and [schemas.txt](/docs/development/ask-your-architecture/schemas.txt).
