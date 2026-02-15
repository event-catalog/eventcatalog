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
