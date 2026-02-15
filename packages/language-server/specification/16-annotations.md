# Metadata & Annotations

Annotations use the `@` prefix and provide additional metadata. They can appear inside any resource block. All annotations are repeatable by default — multiple instances of the same annotation may appear on a single resource.

## @badge

```
@badge("Production", bg: "#22c55e", text: "#fff")
@badge("Beta", bg: "#f59e0b", text: "#000", icon: "flask")
```

## @repository

```
@repository(url: "https://github.com/org/repo", language: "TypeScript")
```

## @editUrl

```
@editUrl("https://github.com/org/repo/edit/main/docs/orders.md")
```

## @note

Adds free-form developer notes or reminders to any resource. Notes are repeatable — multiple `@note` annotations can appear on a single resource. Supported on services, events, commands, queries, channels, and inline message definitions.

```
// Simple note
@note("Come back later — needs review")

// With optional parameters
@note("Align schema with PaymentService team", author: "dboyne", priority: "high")

// Multiple notes on a service
service OrderService {
  version 1.0.0
  @note("TODO: add retry logic")
  @note("Waiting on team alignment", priority: "medium")
}

// Notes on events, commands, and queries
event OrderCreated {
  version 1.0.0
  @note("Schema v2 adds shippingAddress field", author: "alice")
}

command CreateOrder {
  version 1.0.0
  @note("Validate idempotency key", author: "bob", priority: "high")
}

// Notes on channels
channel OrderEvents {
  version 1.0.0
  address "orders.events"
  protocol "kafka"
  @note("Partition key is orderId", author: "infra-team")
}

// Notes on inline messages (inside sends/receives)
service PaymentService {
  version 1.0.0
  sends event PaymentProcessed to PaymentEvents {
    version 1.0.0
    @note("Includes refund reference when applicable", author: "dave")
  }
}
```

## @detailsPanel

Controls visibility of detail panel sections:

```
@detailsPanel {
  owners visible
  versions visible
  changelog hidden
  producers visible
  consumers hidden
  channels visible
  repository hidden
  specifications hidden
  messages hidden
  domains hidden
  services hidden
  containers hidden
}
```

## EBNF

```ebnf
annotation       = "@" ann_name [ "(" ann_args ")" ] [ ann_block ] ;
ann_name         = identifier ;
ann_args         = ann_arg { "," ann_arg } ;
ann_arg          = [ identifier ":" ] ( string_lit | bool_lit | number_lit | identifier ) ;
ann_block        = "{" { ann_body_item } "}" ;
```
