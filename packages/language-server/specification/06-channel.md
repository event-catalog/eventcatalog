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
