# @eventcatalog/language-server

> **Beta** - This package is in active development and the DSL syntax may change between releases.

A language server and parser for the EventCatalog DSL (`.ec` files) - a human-readable, declarative language for defining event-driven architectures.

## What is the EventCatalog DSL?

The EventCatalog DSL is a complementary language for [EventCatalog](https://eventcatalog.dev) that brings architecture-as-code to your event-driven systems. Write your domains, services, events, commands, channels, and their relationships in a concise, human-readable format.

The DSL is designed to work hand-in-hand with EventCatalog — import existing resources from your catalog into `.ec` files, design and iterate on your architecture as code, and push changes back into EventCatalog. It's a two-way workflow: catalog to code, code to catalog.

```
domain Payment {
  version 1.0.0
  owner payment-team

  service PaymentService {
    version 1.0.0

    sends event PaymentProcessed {
      version 1.0.0
      summary "Emitted when a payment completes successfully"
    }

    receives command ProcessPayment
    receives event OrderCreated
  }
}
```

## Features

- Full language server with diagnostics, completions, and hover information
- Parses `.ec` files into a structured graph representation
- Supports all EventCatalog resource types: domains, services, events, commands, queries, channels, containers, data products, flows, users, and teams
- Inline and referenced resource definitions
- Formatter for consistent code style

## Supported Resource Types

| Resource        | Keyword           |
| --------------- | ----------------- |
| Domain          | `domain`          |
| Service         | `service`         |
| Event           | `event`           |
| Command         | `command`         |
| Query           | `query`           |
| Channel         | `channel`         |
| Container       | `container`       |
| Data Product    | `data-product`    |
| Flow            | `flow`            |
| User            | `user`            |
| Team            | `team`            |
| Actor           | `actor`           |
| External System | `external-system` |
| Visualizer      | `visualizer`      |

## Roadmap

- Schema support (inline and referenced schemas for messages)
- Entities
- Schemas as first-class resources

## Specification

See [SPEC.md](./SPEC.md) for the full language specification including grammar, syntax details, and examples.

## License

See the root [LICENSE](../../LICENSE) file.
