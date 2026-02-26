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

## @api

Attaches HTTP API metadata to a message (event, command, or query). Typically generated automatically when importing an OpenAPI spec, but can also be written manually. The visualiser displays the method badge, API path, and response status codes on the node.

```
// Basic usage with method and path
command CreateOrder {
  version 1.0.0
  summary "Create a new order"
  @api(method: "POST", path: "/orders")
}

// With status codes
query GetOrders {
  version 1.0.0
  summary "List all orders"
  @api(method: "GET", path: "/orders", statusCodes: "200,401")
}

// On inline message definitions
service PaymentService {
  version 2.0.0
  receives command CreatePayment {
    version 2.0.0
    summary "Process a new payment"
    @api(method: "POST", path: "/payments", statusCodes: "201,400,422")
  }
  receives query GetPayment {
    version 2.0.0
    @api(method: "GET", path: "/payments/{paymentId}", statusCodes: "200,404")
  }
}
```

### Parameters

| Parameter     | Type   | Description                                              |
| ------------- | ------ | -------------------------------------------------------- |
| `method`      | string | HTTP method (GET, POST, PUT, PATCH, DELETE)              |
| `path`        | string | API path (e.g. `/orders`, `/users/{id}`)                 |
| `statusCodes` | string | Comma-separated HTTP status codes (e.g. `"200,401,500"`) |

### Auto-generated from OpenAPI

When importing an OpenAPI spec, `@api` annotations are automatically added to the generated `.ec` definitions:

```
import PaymentService from "./payments-openapi.yml"
```

This generates commands and queries with `@api` annotations populated from the OpenAPI paths, methods, and response codes.

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
