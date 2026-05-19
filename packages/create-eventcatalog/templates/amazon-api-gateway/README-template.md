# Welcome to EventCatalog

[EventCatalog](https://www.eventcatalog.dev/) is your architecture catalog for distributed systems. This template adds the Amazon API Gateway generator so you can import OpenAPI specs from API Gateway and document how they connect to your domains, services, and teams.

## Generate Your Catalog

1. Edit `.env` with your AWS settings.
2. Configure your APIs in `eventcatalog.config.js`.
3. Import your OpenAPI specs:

```sh
npm run generate
```

4. Start the catalog:

```sh
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to view your catalog.

## Edit Your Catalog

Your generated resources are docs-as-code. You can enrich them with ownership, domain context, Markdown, examples, and relationships that are not always available in API Gateway.

Prefer a visual workflow? Run `npm run editor` to open the [EventCatalog Editor](https://www.eventcatalog.dev/docs/editor/overview) and browse, create, or update catalog resources through a GitHub-backed UI.

## Keep It in Sync

Run `npm run generate` whenever your API Gateway APIs change. You can also run the generator in CI so your catalog stays aligned with AWS.

With this integration you can:

- Document APIs and OpenAPI specs
- Assign APIs to producers and consumers
- Connect resources to users and teams
- Visualize your API Gateway architecture

## Use AI with Architecture Context

EventCatalog gives AI tools structured context about your domains, services, messages, schemas, owners, and flows. Connect an MCP-compatible tool with the [EventCatalog MCP Server](https://www.eventcatalog.dev/docs/development/guides/ai/using-mcp-server).

## Learn by Task

- [Amazon API Gateway integration docs](https://www.eventcatalog.dev/docs/plugins/amazon-apigateway/intro)
- [Use the EventCatalog Editor](https://www.eventcatalog.dev/docs/editor/overview)
- [Document a service](https://www.eventcatalog.dev/docs/development/guides/services)
- [Add events, commands, and queries](https://www.eventcatalog.dev/docs/development/guides/messages/adding-messages)
- [Join the community](https://discord.gg/3rjaZMmrAm)

## Found a Problem?

Open an issue on [GitHub](https://github.com/event-catalog/generators).
