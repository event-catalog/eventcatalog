# EventCatalog DSL — Language Specification

> Version: 1.0.0-draft
> Status: Draft
> Date: 2026-02-08

## Table of Contents

1. [Overview](#overview)
2. [Domain](#domain)
3. [Service](#service)
4. [Event](#event)
5. [Command](#command)
6. [Query](#query)
7. [Channel](#channel)
8. [Container](#container)
9. [Data Product](#data-product)
10. [Flow](#flow)
11. [User](#user)
12. [Team](#team)
13. [Relationships & Pointers](#relationships--pointers)
14. [Versioning](#versioning)
15. [Metadata & Annotations](#metadata--annotations)
16. [Complete Examples](#complete-examples)
17. [Full Grammar (EBNF)](#full-grammar-ebnf)

---

# Overview

The EventCatalog DSL (ECDSL) is a human-readable, declarative language for defining event-driven architectures. It compiles to EventCatalog's frontmatter/markdown format, enabling teams to define domains, services, messages, channels, and their relationships in a single coherent source.

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

## Design Principles

1. **Readable** — Reads like English; minimal punctuation
2. **Hierarchical** — Nesting reflects domain ownership and relationships
3. **Concise** — Sane defaults; only specify what you need
4. **Complete** — Can express everything EventCatalog supports
5. **Composable** — Resources can be defined inline or referenced by ID

## Lexical Structure

### Comments

```
// Single-line comment

/* Multi-line
   comment */
```

### Strings

```
"double-quoted string"
```

Strings are required for values containing spaces, special characters, or multi-word text. Bare identifiers (no spaces, alphanumeric + hyphens + dots) can be unquoted. Strings follow JSON-style escaping (`\"`, `\\`, `\n`, etc.); raw `"` inside a string is not allowed.

### Identifiers

Identifiers are bare words used for resource IDs and type names. Keywords are reserved and cannot be used as identifiers.

```
OrderCreated          // simple
Payment.OrderCreated  // namespaced
my-service-name       // kebab-case
```

### Version Literals

Semantic versions are bare (unquoted):

```
version 1.0.0
version 2.1.0-beta.1
```

### Blocks

Curly braces delimit blocks. Properties inside blocks are newline-separated (no commas).

```
resource Foo {
  property value
  property "value with spaces"
}
```

### Property Multiplicity

The grammar allows any property to appear multiple times inside a block. The semantic rules are:

**Single-value properties** — if repeated, the last occurrence wins:

`version`, `name`, `summary`, `address`, `protocol`, `deprecated`, `draft`, `container-type`, `technology`, `authoritative`, `access-mode`, `classification`, `residency`, `retention`

`schema` is also single-value but only valid on messages (`event`, `command`, `query`, and inline message definitions).

**Repeatable properties** — each occurrence appends a value:

`owner`, `sends`, `receives`, `writes-to`, `reads-from`, `flow`, `service` (ref), `subdomain`, `data-product`, `route`, `input`, `output`, `member`, `parameter`

`parameter` names must be unique within a channel; duplicate names are an error.

Annotations are repeatable by default (see Metadata & Annotations).

Unknown properties are parse errors — only the properties listed in each resource's grammar are valid. Duplicate single-value properties are syntactically valid (last wins) but tooling may warn.

---

# Domain

Top-level bounded context. Can contain services, subdomains, data products, and flows.

```
domain <id> {
  // Required
  version <semver>
  name "<display name>"          // optional, defaults to id

  // Optional metadata
  summary "<text>"
  owner <owner-ref>              // repeatable
  deprecated true
  draft true

  // Relationships
  service <service-ref>          // repeatable (reference to external service)
  subdomain <domain-ref>         // repeatable
  data-product <dp-ref>          // repeatable
  flow <flow-ref>                // repeatable

  // Domain-level message routing
  sends <message-type> <id> [to <channel-ref>]
  receives <message-type> <id> [from <channel-ref>]

  // Inline definitions
  service <id> { ... }
  subdomain <id> { ... }

  // Annotations (see Metadata section)
  @badge(...)
  @repository(...)
}
```

## Subdomains

Domains can contain nested subdomains:

```
domain Logistics {
  version 1.0.0

  subdomain Shipping {
    version 1.0.0
    summary "Package shipping and tracking"

    service ShippingService {
      version 1.0.0
      receives event OrderCreated
      sends event ShipmentCreated
    }
  }

  subdomain Returns {
    version 1.0.0
    summary "Return merchandise authorization"

    service ReturnsService {
      version 1.0.0
      receives command InitiateReturn
      sends event ReturnApproved
    }
  }
}
```

## EBNF

```ebnf
domain_decl      = "domain" identifier "{" common_props
                   { domain_body_item } "}" ;
domain_body_item = service_decl | subdomain_decl | service_ref_stmt
                 | data_product_ref_stmt | flow_ref_stmt
                 | sends_stmt | receives_stmt
                 | annotation ;
subdomain_decl   = "subdomain" identifier "{" common_props
                   { domain_body_item } "}" ;
```

---

# Service

A microservice or application.

```
service <id> {
  // Required
  version <semver>
  name "<display name>"

  // Optional metadata
  summary "<text>"
  owner <owner-ref>              // repeatable
  deprecated true
  draft true

  // Message relationships
  sends <message-type> <id>[@<version>] [to <channel-list>]
  receives <message-type> <id>[@<version>] [from <channel-list>]

  // Data relationships
  writes-to container <container-ref>      // repeatable
  reads-from container <container-ref>     // repeatable

  // Flow relationships
  flow <flow-ref>                // repeatable

  // Inline message definitions
  sends event <id> { ... }
  sends command <id> { ... }
  receives query <id> { ... }

  // Annotations
  @badge(...)
  @repository(...)
}
```

**Message types:** `event`, `command`, `query`

## EBNF

```ebnf
service_decl     = "service" identifier "{" common_props
                   { service_body_item } "}" ;
service_body_item= sends_stmt | receives_stmt
                 | writes_to_stmt | reads_from_stmt
                 | flow_ref_stmt
                 | annotation ;
```

---

# Event

A domain event — something that happened.

```
event <id> {
  // Required
  version <semver>
  name "<display name>"

  // Optional metadata
  summary "<text>"
  owner <owner-ref>
  schema "<path>"
  deprecated true
  draft true

  // Annotations
  @badge(...)
  @repository(...)
}
```

## EBNF

```ebnf
event_decl       = "event" identifier "{" message_props "}" ;
```

---

# Command

An instruction to perform an action.

```
command <id> {
  version <semver>
  name "<display name>"
  summary "<text>"
  owner <owner-ref>
  schema "<path>"
  deprecated true
  draft true

  channel <channel-ref>

  // Same annotations as event
}
```

## EBNF

```ebnf
command_decl     = "command" identifier "{" message_props "}" ;
```

---

# Query

A request for information.

```
query <id> {
  version <semver>
  name "<display name>"
  summary "<text>"
  owner <owner-ref>
  schema "<path>"
  deprecated true
  draft true

  channel <channel-ref>

  // Same annotations as event
}
```

## EBNF

```ebnf
query_decl       = "query" identifier "{" message_props "}" ;
```

---

# Channel

A communication channel (topic, queue, exchange, etc.).

```
channel <id> {
  version <semver>
  name "<display name>"
  summary "<text>"
  owner <owner-ref>

  address "<address-string>"
  protocol "<protocol>"

  // Channel parameters
  parameter <name> {
    description "<text>"
    default "<value>"
    enum ["<val1>", "<val2>"]
    examples ["<ex1>", "<ex2>"]
  }

  // Routing
  route <channel-ref>            // repeatable

  // Annotations
  @badge(...)
  @repository(...)
}
```

## Channel-to-Channel Routing

Channels can route to other channels using the `route` statement. This models message pipelines where data flows through multiple channels (e.g., Kafka topic → Kafka topic → MQTT broker):

```
channel SensorIngestion {
  version 1.0.0
  protocol "Kafka"
  route SensorFiltered
}

channel SensorFiltered {
  version 1.0.0
  protocol "Kafka"
  route MqttDevices
}

channel MqttDevices {
  version 1.0.0
  protocol "MQTT"
}
```

This creates a chain: `SensorIngestion → SensorFiltered → MqttDevices`.

A channel can route to multiple targets (fan-out):

```
channel Ingestion {
  version 1.0.0
  route Analytics
  route Archive
}
```

Routes can include versioned references:

```
channel Source {
  version 1.0.0
  route Target@2.0.0
}
```

## Service-to-Channel Routing

Services send/receive messages through channels:

```
service OrderService {
  version 1.0.0

  // Simple — no channel
  sends event OrderCreated

  // To a single channel
  sends event OrderCreated to orders-topic

  // To a channel with version (using @ syntax)
  sends event OrderCreated to orders-topic@1.0.0

  // To multiple channels (comma-separated)
  sends event OrderCreated to orders-topic, orders-backup-topic

  // To multiple channels with versions
  sends event OrderCreated to orders-topic@1.0.0, orders-backup-topic@2.0.0

  // Receiving from a single channel
  receives event PaymentProcessed from payment-events

  // Receiving from multiple channels
  receives event PaymentProcessed from payment-events, payment-retry-queue

  // Receiving from channels with versions
  receives event PaymentProcessed from payment-events@1.0.0, payment-retry-queue@2.1.0
}
```

## EBNF

```ebnf
channel_decl     = "channel" identifier "{" common_props
                   { channel_body_item } "}" ;
channel_body_item= address_prop | protocol_prop | parameter_decl
                 | route_stmt | annotation ;
address_prop     = "address" string_lit ;
protocol_prop    = "protocol" string_lit ;
parameter_decl   = "parameter" identifier "{" { param_prop } "}" ;
param_prop       = "description" string_lit
                 | "default" string_lit
                 | "enum" "[" string_lit { "," string_lit } "]"
                 | "examples" "[" string_lit { "," string_lit } "]" ;
route_stmt       = "route" resource_ref ;

channel_clause   = to_clause | from_clause ;
to_clause        = "to" channel_ref_list ;
from_clause      = "from" channel_ref_list ;
channel_ref_list = channel_ref { "," channel_ref } ;
channel_ref      = identifier [ "@" version_lit ] ;
```

---

# Container

A data store, cache, or external system.

```
container <id> {
  version <semver>
  name "<display name>"
  summary "<text>"
  owner <owner-ref>

  // Required
  container-type <database | cache | objectStore | searchIndex
                 | dataWarehouse | dataLake | externalSaaS | other>

  // Optional
  deprecated true
  draft true
  technology "<tech-string>"     // e.g., "postgres@15", "redis@7"
  authoritative true
  access-mode <read | write | readWrite | appendOnly>
  classification <public | internal | confidential | regulated>
  residency "<location>"
  retention "<duration>"         // e.g., "90d", "10y"

  // Relationships
  service <service-ref>          // repeatable

  // Annotations
  @badge(...)
  @repository(...)
}
```

## EBNF

```ebnf
container_decl   = "container" identifier "{" common_props
                   { container_body_item } "}" ;
container_body_item = container_type_prop | technology_prop
                    | authoritative_prop | access_mode_prop
                    | classification_prop | residency_prop
                    | retention_prop
                    | service_ref_stmt | annotation ;
container_type_prop   = "container-type" container_type_enum ;
container_type_enum   = "database" | "cache" | "objectStore" | "searchIndex"
                      | "dataWarehouse" | "dataLake" | "externalSaaS" | "other" ;
technology_prop       = "technology" string_lit ;
authoritative_prop    = "authoritative" bool_lit ;
access_mode_prop      = "access-mode" ( "read" | "write" | "readWrite" | "appendOnly" ) ;
classification_prop   = "classification" ( "public" | "internal" | "confidential" | "regulated" ) ;
residency_prop        = "residency" string_lit ;
retention_prop        = "retention" string_lit ;
```

---

# Data Product

An analytical data product.

```
data-product <id> {
  version <semver>
  name "<display name>"
  summary "<text>"
  owner <owner-ref>
  deprecated true
  draft true

  // Data lineage
  input <message-type> <resource-ref>      // repeatable
  output <message-type> <resource-ref> {   // repeatable, with optional contract
    contract {
      path "<path>"
      name "<name>"
      type "<type>"
    }
  }

  // Annotations
  @badge(...)
}
```

## EBNF

```ebnf
data_product_decl = "data-product" identifier "{" common_props
                    { dp_body_item } "}" ;
dp_body_item      = input_stmt | output_stmt | annotation ;
input_stmt        = "input" message_type resource_ref ;
output_stmt       = "output" message_type resource_ref [ "{" contract_block "}" ] ;
contract_block    = "contract" "{" "path" string_lit "name" string_lit
                    [ "type" string_lit ] "}" ;
```

---

# Flow

Flows define step-by-step business processes using a PM-friendly `when`-block syntax. Resources are referenced by name only — types are resolved from the catalog.

```
flow <id> {
  version <semver>
  name "<display name>"
  summary "<text>"
  owner <owner-ref>

  // Entry chain — the starting sequence
  <Name> ["<label>"] -> <Name> ["<label>"] -> ...

  // When blocks — react to events
  when <TriggerName>
    <ServiceName> "<description>"
      -> "<label>": <OutputName>

  // Convergence — multiple triggers must complete
  when <TriggerA> and <TriggerB>
    <ServiceName> "<description>"
}
```

## Actors and External Systems

To use actors and external systems in flows, define them as top-level resources. The flow resolves their type automatically by name:

```
actor Customer {
  name "Customer"
  summary "End user on the storefront"
}

external-system WarehouseWMS {
  name "Warehouse WMS"
  summary "Legacy warehouse management system"
}
```

Both support optional bodies with `name`, `summary`, and annotations. They can also be bare (no body):

```
actor Customer
external-system WarehouseWMS
```

## Flow References

Resources in flows are referenced by name only (no type keywords like `service` or `event`). Types are resolved from catalog definitions or sibling `.ec` files. If no matching definition is found, the default type is `step`. Compilers may warn on unresolved flow references.

Each reference can include an optional label:

- `Customer "places an order"` — name with display label
- `PlaceOrder` — bare name (no label)
- `PaymentService "processes the payment"` — service with description

## Entry Chains

The entry chain defines the starting sequence of a flow. It uses arrow (`->`) syntax:

```
Customer "places an order"
  -> PlaceOrder
  -> OrderService "creates the order"
  -> OrderCreated
```

Multiple sources can converge into a chain using commas:

```
EventA, EventB -> MergingService
```

## When Blocks

`when` blocks define reactions to events. Each block starts with one or more trigger names, followed by actions:

```
when OrderCreated
  PaymentService "processes the payment"
    -> "success": PaymentProcessed
    -> "failure": PaymentFailed
  InventoryService "reserves stock"
    -> StockReserved
```

### Labeled Outputs

Action outputs can have optional labels (quoted strings followed by a colon):

```
-> "success": PaymentProcessed    // labeled output
-> StockReserved                   // unlabeled output
```

### Convergence

Use `and` to require multiple triggers before actions execute:

```
when PaymentProcessed and StockReserved
  FulfillmentService "ships the order"
    -> OrderShipped
```

### Terminal Actions

Actions without outputs are terminal steps:

```
when OrderShipped
  WarehouseWMS "syncs with legacy WMS"
  NotificationService "notifies the customer"
```

## Example

```
flow OrderFulfillment {
  version 1.0.0
  name "Order Fulfillment"
  summary "End-to-end order processing from placement to delivery"
  owner fulfillment-team

  Customer "places an order"
    -> PlaceOrder
    -> OrderService "creates the order"
    -> OrderCreated

  when OrderCreated
    PaymentService "processes the payment"
      -> "success": PaymentProcessed
      -> "failure": PaymentFailed
    InventoryService "reserves stock"
      -> StockReserved

  when PaymentFailed
    NotificationService "notifies the customer of failure"

  when PaymentProcessed and StockReserved
    FulfillmentService "ships the order"
      -> OrderShipped

  when OrderShipped
    WarehouseWMS "syncs with legacy WMS"
    NotificationService "notifies the customer"
      -> CustomerNotified
}
```

## EBNF

```ebnf
flow_decl         = "flow" identifier "{" common_props
                    { flow_entry_chain | flow_when_block } "}" ;
flow_entry_chain  = flow_ref { "," flow_ref } ( "->" flow_ref )+ ;
flow_when_block   = "when" flow_ref { "and" flow_ref } flow_action+ ;
flow_action       = flow_ref { flow_output } ;
flow_output       = "->" [ string_lit ":" ] flow_ref ;
flow_ref          = identifier [ string_lit ] ;
```

---

# Diagram

_Removed from V1. May be added in a future version._

---

# User

A user definition for ownership and team membership.

```
user <id> {
  name "<display name>"
  avatar "<url>"
  role "<role>"
  email "<email>"
  slack "<url>"
  ms-teams "<url>"

  // Team membership
  team <team-id>

  // Ownership declarations
  owns domain <id>
  owns service <id>
  owns event <id>
  owns command <id>
  owns query <id>
}
```

## Example

```
user dboyne {
  name "David Boyne"
  avatar "https://avatars.githubusercontent.com/u/3268013"
  role "Principal Engineer"
  email "david@company.com"

  owns domain Payment
  owns service PaymentService
}
```

## EBNF

```ebnf
user_decl         = "user" identifier "{" user_props "}" ;
user_props        = "name" string_lit
                  | "avatar" string_lit
                  | "role" string_lit
                  | "email" string_lit
                  | "slack" string_lit
                  | "ms-teams" string_lit
                  | owns_stmt
                  | "team" identifier ;
owns_stmt         = "owns" resource_type_kw identifier ;
resource_type_kw  = "domain" | "service" | "event" | "command" | "query" ;
```

---

# Team

A team definition for ownership and membership.

```
team <id> {
  name "<display name>"
  summary "<text>"
  email "<email>"
  slack "<url>"
  ms-teams "<url>"

  // Members
  member <user-id>               // repeatable

  // Ownership declarations
  owns domain <id>
  owns service <id>
  owns event <id>
  owns command <id>
  owns query <id>
}
```

## Owner References

Owners are referenced by team or user ID:

```
service OrderService {
  version 1.0.0
  owner payment-team              // team reference
  owner dboyne                   // user reference
}
```

## Example

```
team orders-team {
  name "Orders Team"
  summary "Responsible for order lifecycle"
  email "orders@company.com"
  slack "https://company.slack.com/channels/orders"

  member dboyne
  member jane-doe
}
```

## EBNF

```ebnf
team_decl         = "team" identifier "{" team_props "}" ;
team_props        = "name" string_lit
                  | "summary" string_lit
                  | "email" string_lit
                  | "slack" string_lit
                  | "ms-teams" string_lit
                  | "member" identifier
                  | owns_stmt ;
```

---

# Relationships & Pointers

## Resource References

Resources can be referenced by ID alone (resolves to `latest`) or with an explicit version:

```
// Reference by ID only (latest version)
receives event OrderCreated

// Reference by ID + version using @ syntax
receives event OrderCreated@2.0.0

// Reference with single channel routing
sends event OrderCreated to orders-topic

// Reference with channel version
sends event OrderCreated@1.0.0 to orders-topic@1.0.0

// Reference with multiple channels
sends event OrderCreated to orders-topic, backup-topic
receives event PaymentProcessed from payment-events, payment-retry
```

## Inline vs. Reference

Resources can be defined inline (creating them) or referenced (linking to existing):

```
service OrderService {
  version 1.0.0

  // Inline definition — creates the event
  sends event OrderCreated {
    version 1.0.0
    summary "A new order was placed"
  }

  // Reference only — links to an existing event
  receives event PaymentProcessed
  receives event PaymentProcessed@2.0.0
}
```

Inline messages do not support the `channel` statement — use `to`/`from` on the `sends`/`receives` statement for channel routing.

## Pointer Syntax Summary

| Syntax                        | Meaning                       |
| ----------------------------- | ----------------------------- |
| `<id>`                        | Latest version of resource    |
| `<id>@<version>`              | Specific version              |
| `<id> to <channel>`           | With single channel routing   |
| `<id> to <channel>@<version>` | Channel with specific version |
| `<id> to <ch1>, <ch2>, <ch3>` | Multiple channels             |
| `<id> from <channel>`         | Received from channel         |
| `<id> from <ch1>, <ch2>`      | Received from multiple        |

## Data Relationships

```
writes-to container <container-ref>
reads-from container <container-ref>
```

## EBNF

```ebnf
resource_ref     = identifier [ "@" version_lit ] ;
message_type     = "event" | "command" | "query" ;

sends_stmt       = "sends" message_type resource_ref [ channel_clause ]
                 | "sends" message_type identifier inline_block ;
receives_stmt    = "receives" message_type resource_ref [ channel_clause ]
                 | "receives" message_type identifier inline_block ;

channel_clause   = to_clause | from_clause ;
to_clause        = "to" channel_ref_list ;
from_clause      = "from" channel_ref_list ;
channel_ref_list = channel_ref { "," channel_ref } ;
channel_ref      = identifier [ "@" version_lit ] ;

writes_to_stmt   = "writes-to" "container" resource_ref ;
reads_from_stmt  = "reads-from" "container" resource_ref ;
flow_ref_stmt    = "flow" resource_ref ;
data_product_ref_stmt      = "data-product" resource_ref ;

inline_block     = "{" message_props "}" ;
```

---

# Versioning

## Declaring Versions

Every versioned resource requires a version:

```
event OrderCreated {
  version 1.0.0
}
```

## Referencing Versions

```
// Latest (default - no version specified)
receives event OrderCreated

// Specific version using @ syntax
receives event OrderCreated@2.0.0

// Channel with version
sends event OrderProcessed to payments-channel@1.0.0

// Multiple channels with versions
receives event PaymentFailed from channel-a@1.0.0, channel-b@2.1.0
```

## Version Defaults

When no version is specified in a reference, it resolves to `latest`.

## EBNF

```ebnf
int              = digit { digit } ;
version_lit      = int "." int "." int [ "-" prerelease ] ;
version_prop     = "version" version_lit ;
version_ref      = "@" version_lit ;
resource_ref     = identifier [ version_ref ] ;
```

---

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

---

# Complete Examples

## Example 1: E-Commerce Platform

```
// ============================================================
// Teams & Users
// ============================================================

user dboyne {
  name "David Boyne"
  avatar "https://avatars.githubusercontent.com/u/3268013"
  role "Principal Engineer"
  email "david@company.com"
}

user jane-doe {
  name "Jane Doe"
  avatar "https://avatars.githubusercontent.com/u/12345"
  role "Staff Engineer"
}

team orders-team {
  name "Orders Team"
  summary "Responsible for order lifecycle"
  email "orders@company.com"
  slack "https://company.slack.com/channels/orders"

  member dboyne
  member jane-doe
}

team payment-team {
  name "Payment Team"
  summary "Handles payment processing and fraud detection"
  email "payments@company.com"

  member jane-doe
}

// ============================================================
// Channels
// ============================================================

channel orders-topic {
  version 1.0.0
  name "Orders Topic"
  summary "Kafka topic for all order-related events"
  address "kafka://production/orders"
  protocol "Kafka"

  parameter environment {
    description "Deployment environment"
    default "production"
    enum ["production", "staging", "development"]
  }

}

channel payment-queue {
  version 1.0.0
  name "Payment Queue"
  summary "SQS queue for payment commands"
  address "sqs://us-east-1/payment-processing"
  protocol "SQS"
}

// ============================================================
// Containers
// ============================================================

container orders-db {
  version 1.0.0
  name "Orders Database"
  summary "Primary datastore for order data"
  owner orders-team

  container-type database
  technology "postgres@15"
  authoritative true
  access-mode readWrite
  classification confidential
  residency "us-east-1"
  retention "7y"

  @repository(url: "https://github.com/company/orders-db")
}

container orders-cache {
  version 1.0.0
  name "Orders Cache"
  summary "Redis cache for hot order lookups"

  container-type cache
  technology "redis@7"
  access-mode readWrite
  retention "24h"
}

// ============================================================
// Domain
// ============================================================

domain Orders {
  version 1.0.0
  name "Orders Domain"
  summary "Everything related to order management"
  owner orders-team

  @badge("Core", bg: "#3b82f6", text: "#fff")
  @repository(url: "https://github.com/company/orders-domain")

  service OrderService {
    version 1.0.0
    name "Order Service"
    summary "Manages the order lifecycle"
    owner orders-team

    @repository(url: "https://github.com/company/order-service", language: "TypeScript")
    @badge("Production", bg: "#22c55e", text: "#fff")

    sends event OrderCreated {
      version 1.0.0
      summary "Emitted when a new order is placed"
      schema "./schemas/order-created.avro"
    }

    sends event OrderUpdated {
      version 1.0.0
      summary "Emitted when order details change"
    }

    sends command ProcessPayment to payment-queue {
      version 1.0.0
      summary "Triggers payment processing for an order"
    }

    receives event PaymentProcessed from payment-queue
    receives event InventoryReserved

    writes-to container orders-db
    reads-from container orders-db
    writes-to container orders-cache
    reads-from container orders-cache

    flow OrderFulfillment@1.0.0
  }

  service NotificationService {
    version 1.0.0
    name "Notification Service"
    summary "Sends email and push notifications for order updates"

    receives event OrderCreated
    receives event OrderUpdated

    sends command SendEmail {
      version 1.0.0
      summary "Dispatches an email notification"
    }
  }
}

domain Payment {
  version 1.0.0
  name "Payment Domain"
  summary "Payment processing and fraud detection"
  owner payment-team

  service PaymentService {
    version 1.0.0
    name "Payment Service"
    summary "Processes payments via Stripe"
    owner payment-team

    @repository(url: "https://github.com/company/payment-service", language: "Go")

    receives command ProcessPayment from payment-queue

    sends event PaymentProcessed {
      version 1.0.0
      summary "Payment completed successfully"
    }

    sends event PaymentFailed {
      version 1.0.0
      summary "Payment was declined or errored"
    }
  }
}

// ============================================================
// Standalone events (defined outside services)
// ============================================================

event InventoryReserved {
  version 1.0.0
  name "Inventory Reserved"
  summary "Stock has been reserved for an order"
  owner orders-team

  @badge("Critical", bg: "#ef4444", text: "#fff")
}

// ============================================================
// Data Product
// ============================================================

data-product OrderAnalytics {
  version 1.0.0
  name "Order Analytics"
  summary "Real-time and batch analytics for order metrics"
  owner orders-team

  input event OrderCreated@1.0.0
  input event PaymentProcessed@1.0.0
  input event InventoryReserved@1.0.0

  output event OrderMetrics {
    contract {
      path "./contracts/order-metrics.json"
      name "Order Metrics Schema"
      type "json-schema"
    }
  }
}

// ============================================================
// Actors & External Systems
// ============================================================

actor Customer {
  name "Customer"
  summary "End user on the storefront"
}

external-system WarehouseWMS {
  name "Warehouse WMS"
  summary "Legacy warehouse management system via SOAP API"
}

// ============================================================
// Flow
// ============================================================

flow OrderFulfillment {
  version 1.0.0
  name "Order Fulfillment"
  summary "End-to-end order processing from placement to delivery"
  owner orders-team

  Customer "End user on the storefront"
    -> PlaceOrder
    -> OrderService
    -> OrderCreated

  when OrderCreated
    PaymentService "processes the payment"
      -> "success": PaymentProcessed
      -> "failure": PaymentFailed
    InventoryService "reserves inventory"
      -> InventoryReserved

  when InventoryReserved
    WarehouseWMS "Legacy WMS via SOAP API"
}

```

## Example 2: Minimal Service Definition

The DSL supports minimal definitions where defaults are sufficient:

```
service OrderService {
  version 1.0.0
  sends event OrderCreated
  receives command ProcessPayment
  receives event PaymentProcessed
}
```

## Example 3: Multi-Channel Routing

```
service EventRouter {
  version 1.0.0
  summary "Routes events across multiple channels"

  // Send to multiple channels (comma-separated)
  sends event OrderCreated to orders-topic, orders-archive-topic

  // Receive from multiple channels
  receives event PaymentProcessed from payment-events, payment-retry-queue
}
```

## Example 4: Channel Routing (IoT Pipeline)

```
channel SensorIngestion {
  version 1.0.0
  address "sensors.raw"
  protocol "Kafka"
  summary "Raw sensor data ingestion"
  route SensorFiltered
}

channel SensorFiltered {
  version 1.0.0
  address "sensors.filtered"
  protocol "Kafka"
  summary "Validated sensor data"
  route DeviceCommands
}

channel DeviceCommands {
  version 1.0.0
  address "devices/+/commands"
  protocol "MQTT"
  summary "MQTT topic for device commands"
}

service SensorGateway {
  version 1.0.0
  summary "Ingests raw sensor readings"
  sends event SensorReading to SensorIngestion
}

service FilterService {
  version 1.0.0
  summary "Validates and filters sensor data"
  receives event SensorReading from SensorIngestion
  sends event DeviceAlert to SensorFiltered
}

service DeviceBridge {
  version 1.0.0
  summary "Bridges Kafka to MQTT"
  receives event DeviceAlert from SensorFiltered
  sends command RecalibrateDevice to DeviceCommands
}
```

## Example 5: Subdomains

```
domain Logistics {
  version 1.0.0

  subdomain Shipping {
    version 1.0.0
    summary "Package shipping and tracking"

    service ShippingService {
      version 1.0.0
      receives event OrderCreated
      sends event ShipmentCreated
    }
  }

  subdomain Returns {
    version 1.0.0
    summary "Return merchandise authorization"

    service ReturnsService {
      version 1.0.0
      receives command InitiateReturn
      sends event ReturnApproved
    }
  }
}
```

---

# Full Grammar (EBNF)

```ebnf
(* Top-level *)
program          = { top_level_decl } ;
top_level_decl   = domain_decl | service_decl | event_decl | command_decl
                 | query_decl | channel_decl | container_decl
                 | data_product_decl | flow_decl
                 | user_decl | team_decl | visualizer_decl
                 | actor_decl | external_system_decl ;

(* Identifiers and literals *)
identifier       = letter { letter | digit | "-" | "." | "_" } ;
int              = digit { digit } ;
version_lit      = int "." int "." int [ "-" prerelease ] ;
string_lit       = '"' { any_char } '"' ;
bool_lit         = "true" | "false" ;
number_lit       = digit { digit } ;

(* Common properties *)
common_props     = { version_prop | name_prop | summary_prop | owner_prop
                   | deprecated_prop | draft_prop | annotation } ;
message_props    = { version_prop | name_prop | summary_prop | owner_prop
                   | schema_prop | deprecated_prop | draft_prop | annotation } ;
version_prop     = "version" version_lit ;
name_prop        = "name" string_lit ;
summary_prop     = "summary" string_lit ;
owner_prop       = "owner" identifier ;
schema_prop      = "schema" string_lit ;
deprecated_prop  = "deprecated" bool_lit ;
draft_prop       = "draft" bool_lit ;

(* Annotations *)
annotation       = "@" ann_name [ "(" ann_args ")" ] [ ann_block ] ;
ann_name         = identifier ;
ann_args         = ann_arg { "," ann_arg } ;
ann_arg          = [ identifier ":" ] ( string_lit | bool_lit | number_lit | identifier ) ;
ann_block        = "{" { ann_body_item } "}" ;

(* Resource references *)
resource_ref     = identifier [ "@" version_lit ] ;
message_type     = "event" | "command" | "query" ;

(* Domain *)
domain_decl      = "domain" identifier "{" common_props
                   { domain_body_item } "}" ;
domain_body_item = service_decl | subdomain_decl
                 | data_product_ref_stmt | flow_ref_stmt
                 | sends_stmt | receives_stmt
                 | annotation ;
subdomain_decl   = "subdomain" identifier "{" common_props
                   { domain_body_item } "}" ;

(* Service *)
service_decl     = "service" identifier "{" common_props
                   { service_body_item } "}" ;
service_body_item= sends_stmt | receives_stmt
                 | writes_to_stmt | reads_from_stmt
                 | flow_ref_stmt
                 | annotation ;

(* Sends / Receives *)
sends_stmt       = "sends" message_type resource_ref [ channel_clause ]
                 | "sends" message_type identifier inline_block ;
receives_stmt    = "receives" message_type resource_ref [ channel_clause ]
                 | "receives" message_type identifier inline_block ;

channel_clause   = to_clause | from_clause ;
to_clause        = "to" channel_ref_list ;
from_clause      = "from" channel_ref_list ;
channel_ref_list = channel_ref { "," channel_ref } ;
channel_ref      = identifier [ "@" version_lit ] ;

(* Data relationships *)
writes_to_stmt   = "writes-to" "container" resource_ref ;
reads_from_stmt  = "reads-from" "container" resource_ref ;
flow_ref_stmt    = "flow" resource_ref ;
data_product_ref_stmt      = "data-product" resource_ref ;

(* Inline message block *)
inline_block     = "{" message_props "}" ;

(* Messages: Event, Command, Query *)
event_decl       = "event" identifier "{" message_props "}" ;
command_decl     = "command" identifier "{" message_props "}" ;
query_decl       = "query" identifier "{" message_props "}" ;

(* Channel *)
channel_decl     = "channel" identifier "{" common_props
                   { channel_body_item } "}" ;
channel_body_item= address_prop | protocol_prop | parameter_decl
                 | route_stmt | annotation ;
address_prop     = "address" string_lit ;
protocol_prop    = "protocol" string_lit ;
parameter_decl   = "parameter" identifier "{" { param_prop } "}" ;
param_prop       = "description" string_lit
                 | "default" string_lit
                 | "enum" "[" string_lit { "," string_lit } "]"
                 | "examples" "[" string_lit { "," string_lit } "]" ;
route_stmt       = "route" resource_ref ;

(* Container *)
container_decl   = "container" identifier "{" common_props
                   { container_body_item } "}" ;
container_body_item = container_type_prop | technology_prop
                    | authoritative_prop | access_mode_prop
                    | classification_prop | residency_prop
                    | retention_prop
                    | service_ref_stmt | annotation ;
container_type_prop   = "container-type" container_type_enum ;
container_type_enum   = "database" | "cache" | "objectStore" | "searchIndex"
                      | "dataWarehouse" | "dataLake" | "externalSaaS" | "other" ;
technology_prop       = "technology" string_lit ;
authoritative_prop    = "authoritative" bool_lit ;
access_mode_prop      = "access-mode" ( "read" | "write" | "readWrite" | "appendOnly" ) ;
classification_prop   = "classification" ( "public" | "internal" | "confidential" | "regulated" ) ;
residency_prop        = "residency" string_lit ;
retention_prop        = "retention" string_lit ;

(* Data Product *)
data_product_decl = "data-product" identifier "{" common_props
                    { dp_body_item } "}" ;
dp_body_item      = input_stmt | output_stmt | annotation ;
input_stmt        = "input" message_type resource_ref ;
output_stmt       = "output" message_type resource_ref [ "{" contract_block "}" ] ;
contract_block    = "contract" "{" "path" string_lit "name" string_lit
                    [ "type" string_lit ] "}" ;

(* Flow *)
flow_decl         = "flow" identifier "{" common_props
                    { flow_entry_chain | flow_when_block } "}" ;
flow_entry_chain  = flow_ref { "," flow_ref } ( "->" flow_ref )+ ;
flow_when_block   = "when" flow_ref { "and" flow_ref } flow_action+ ;
flow_action       = flow_ref { flow_output } ;
flow_output       = "->" [ string_lit ":" ] flow_ref ;
flow_ref          = identifier [ string_lit ] ;

(* Actor *)
actor_decl        = "actor" identifier [ "{" { actor_body_item } "}" ] ;
actor_body_item   = name_prop | summary_prop | annotation ;

(* External System *)
external_system_decl = "external-system" identifier [ "{" { ext_sys_body_item } "}" ] ;
ext_sys_body_item    = name_prop | summary_prop | annotation ;

(* Visualizer *)
visualizer_decl   = "visualizer" identifier "{" { visualizer_body } "}" ;
visualizer_body   = name_prop | summary_prop | annotation
                  | legend_prop | search_prop | toolbar_prop
                  | focus_mode_prop | animated_prop | style_prop
                  | domain_decl | service_decl | event_decl | command_decl
                  | query_decl | channel_decl | container_decl
                  | data_product_decl | flow_decl
                  | actor_decl | external_system_decl
                  | service_ref_stmt | domain_ref_stmt
                  | event_ref_stmt | command_ref_stmt | query_ref_stmt
                  | channel_ref_stmt | data_product_ref_stmt | flow_ref_stmt
                  | container_ref_stmt ;
legend_prop       = "legend" bool_lit ;
search_prop       = "search" bool_lit ;
toolbar_prop      = "toolbar" bool_lit ;
focus_mode_prop   = "focus-mode" bool_lit ;
animated_prop     = "animated" bool_lit ;
style_prop        = "style" ( "default" | "post-it" ) ;

(* User *)
user_decl         = "user" identifier "{" user_props "}" ;
user_props        = "name" string_lit
                  | "avatar" string_lit
                  | "role" string_lit
                  | "email" string_lit
                  | "slack" string_lit
                  | "ms-teams" string_lit
                  | owns_stmt
                  | "team" identifier ;
owns_stmt         = "owns" resource_type_kw identifier ;
resource_type_kw  = "domain" | "service" | "event" | "command" | "query" ;

(* Team *)
team_decl         = "team" identifier "{" team_props "}" ;
team_props        = "name" string_lit
                  | "summary" string_lit
                  | "email" string_lit
                  | "slack" string_lit
                  | "ms-teams" string_lit
                  | "member" identifier
                  | owns_stmt ;

(* Resource references *)
service_ref_stmt    = "service" resource_ref ;
domain_ref_stmt     = "domain" resource_ref ;
event_ref_stmt      = "event" resource_ref ;
command_ref_stmt    = "command" resource_ref ;
query_ref_stmt      = "query" resource_ref ;
channel_ref_stmt    = "channel" resource_ref ;
container_ref_stmt  = "container" resource_ref ;
```

## Reserved Keywords

```
domain     service     event       command      query
channel    container   data-product flow
user       team        sends       receives
writes-to  reads-from  owns        to           from
version    name        summary     owner        schema
deprecated draft       true        false
type       actor       external-system
parameter  route       member
input      output      contract
subdomain  visualizer  legend      search       toolbar      focus-mode
animated   style       when        and
```

## File Extension

EventCatalog DSL files use the `.ec` extension:

```
catalog.ec
orders-domain.ec
payment-service.ec
```

Multiple `.ec` files can be used and are merged during compilation. Resources can reference each other across files.

## Compilation

The DSL compiles to EventCatalog's directory structure:

```
catalog.ec  -->  domains/Orders/index.mdx
                    domains/Orders/services/OrderService/index.mdx
                    events/OrderCreated/index.mdx
                    commands/ProcessPayment/index.mdx
                    channels/orders-topic/index.mdx
                    users/dboyne.mdx
                    teams/orders-team.mdx
                    ...
```

Each resource becomes a markdown file with YAML frontmatter matching EventCatalog's content collection schemas.

---

# Visualizer

The `visualizer` block separates **resource definition** from **visualization**. Resources defined outside a visualizer block exist in the catalog but are not rendered visually. Only resources placed inside a `visualizer` block (or referenced from one) appear in the visual graph.

This separation lets teams maintain a single source of truth for all resources while controlling exactly what gets visualized and how.

```
visualizer <id> {
  name "<display name>"
  summary "<text>"

  // Display options
  legend true|false
  search true|false
  toolbar true|false
  focus-mode true|false
  animated true|false
  style default|post-it

  // Resources to visualize (inline or reference)
  <resource definitions or references>
}
```

## Why Visualizer Exists

A `.ec` file can define dozens of resources — domains, services, events, channels, and more. Without a visualizer block, there is no way to control which resources appear in the visual graph or how they are presented.

The visualizer block makes visualization **explicit**:

- Define resources anywhere (top-level, imported files)
- Choose what to visualize by placing resources inside a `visualizer` block
- Configure display options per visualization

## Multiple Visualizer Blocks

A file can contain multiple `visualizer` blocks, each presenting a different view over the same resources. Tools (e.g. the playground) allow switching between them.

```
// Shared resources
event OrderCreated {
  version 1.0.0
}

event PaymentProcessed {
  version 1.0.0
}

service OrderService {
  version 1.0.0
  sends event OrderCreated
}

service PaymentService {
  version 1.0.0
  receives event OrderCreated
  sends event PaymentProcessed
}

// View 1: Order flow only
visualizer orders {
  name "Order Flow"

  service OrderService
  event OrderCreated
}

// View 2: Full payment pipeline
visualizer payments {
  name "Payment Pipeline"

  service OrderService
  service PaymentService
  event OrderCreated
  event PaymentProcessed
}
```

## Resources Without a Visualizer

Resources defined outside any `visualizer` block are valid. They can be:

- Imported by other `.ec` files
- Referenced from within a `visualizer` block
- Used for compilation to EventCatalog's markdown format

If a file contains no `visualizer` block, no visual graph is produced.

## Inline vs. Reference

Resources inside a visualizer can be defined inline (full definition) or referenced by name:

**Inline** — defines and visualizes the resource:

```
visualizer main {
  name "My Architecture"

  service OrderService {
    version 1.0.0
    sends event OrderCreated
  }
}
```

**Reference** — visualizes a resource defined elsewhere:

```
service OrderService {
  version 1.0.0
  sends event OrderCreated
}

visualizer main {
  name "My Architecture"
  service OrderService
}
```

When a resource is referenced, the visualizer enriches the node with metadata from the matching top-level definition.

## Display Options

| Property     | Type    | Default   | Description                            |
| ------------ | ------- | --------- | -------------------------------------- |
| `name`       | string  | —         | Display title for the visualization    |
| `summary`    | string  | —         | Description of the visualization       |
| `legend`     | boolean | `true`    | Show the node type legend              |
| `search`     | boolean | `true`    | Show the search bar                    |
| `toolbar`    | boolean | `true`    | Show the toolbar (export, zoom, etc.)  |
| `focus-mode` | boolean | `true`    | Enable focus mode for individual nodes |
| `animated`   | boolean | `true`    | Animate edges                          |
| `style`      | enum    | `default` | Visual style: `default` or `post-it`   |

## Example

```
// Teams
team orders-team {
  name "Orders Team"
}

// Resources
channel orders-topic {
  version 1.0.0
  protocol "Kafka"
}

// Visualizer with display options
visualizer order-architecture {
  name "Order Architecture"
  summary "Core order processing services"
  legend true
  search true
  animated false
  style post-it

  domain Orders {
    version 1.0.0
    owner orders-team

    service OrderService {
      version 1.0.0
      sends event OrderCreated to orders-topic
      receives command CreateOrder
    }

    service NotificationService {
      version 1.0.0
      receives event OrderCreated
    }
  }
}
```

## EBNF

```ebnf
visualizer_decl   = "visualizer" identifier "{" { visualizer_body } "}" ;
visualizer_body   = name_prop | summary_prop | annotation
                  | legend_prop | search_prop | toolbar_prop
                  | focus_mode_prop | animated_prop | style_prop
                  | domain_decl | service_decl | event_decl | command_decl
                  | query_decl | channel_decl | container_decl
                  | data_product_decl | flow_decl
                  | actor_decl | external_system_decl
                  | service_ref_stmt | domain_ref_stmt
                  | event_ref_stmt | command_ref_stmt | query_ref_stmt
                  | channel_ref_stmt | data_product_ref_stmt | flow_ref_stmt
                  | container_ref_stmt ;
legend_prop       = "legend" bool_lit ;
search_prop       = "search" bool_lit ;
toolbar_prop      = "toolbar" bool_lit ;
focus_mode_prop   = "focus-mode" bool_lit ;
animated_prop     = "animated" bool_lit ;
style_prop        = "style" ( "default" | "post-it" ) ;
```

---
