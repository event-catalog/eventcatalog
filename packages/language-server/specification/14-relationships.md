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
