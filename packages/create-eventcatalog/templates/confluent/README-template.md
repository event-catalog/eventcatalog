# Welcome to EventCatalog

[EventCatalog](https://www.eventcatalog.dev/) is your architecture catalog for distributed systems. This template adds the Confluent Schema Registry generator so you can import schemas and topics, then document how they connect to your domains, services, and teams.

## Generate Your Catalog

1. Edit `.env` with your Confluent settings.
2. Run Confluent locally, or configure `schemaRegistryUrl` in `eventcatalog.config.js`.
3. Import your schemas:

```sh
npm run generate
```

4. Start the catalog:

```sh
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to view your catalog.

## Edit Your Catalog

Your generated resources are docs-as-code. You can enrich them with ownership, domain context, Markdown, examples, and relationships that are not always available in the schema registry.

Prefer a visual workflow? Run `npm run editor` to open the [EventCatalog Editor](https://www.eventcatalog.dev/docs/editor/overview) and browse, create, or update catalog resources through a GitHub-backed UI.

## Keep It in Sync

Run `npm run generate` whenever your schemas or topics change. You can also run the generator in CI so your catalog stays aligned with Confluent.

With this integration you can:

- Document schemas and topics
- Assign schemas to producers and consumers
- Connect resources to users and teams
- Visualize your Kafka architecture
- Add semantic meaning to schemas and topics

## Use AI with Architecture Context

EventCatalog gives AI tools structured context about your domains, services, messages, schemas, owners, and flows. Connect an MCP-compatible tool with the [EventCatalog MCP Server](https://www.eventcatalog.dev/docs/development/guides/ai/using-mcp-server).

## Learn by Task

- [Confluent Schema Registry integration docs](https://eventcatalog.dev/docs/plugins/confluent-schema-registry/intro)
- [Use the EventCatalog Editor](https://www.eventcatalog.dev/docs/editor/overview)
- [Document a service](https://www.eventcatalog.dev/docs/development/guides/services)
- [Add events, commands, and queries](https://www.eventcatalog.dev/docs/development/guides/messages/adding-messages)
- [Join the community](https://discord.gg/3rjaZMmrAm)

## Found a Problem?

Open an issue on [GitHub](https://github.com/event-catalog/generators).
