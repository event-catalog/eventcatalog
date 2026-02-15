export interface Example {
  name: string;
  description: string;
  source: Record<string, string>;
}

export const examples: Example[] = [
  {
    name: 'Payment Domain',
    description: 'Payment processing with RabbitMQ messaging',
    source: {
      'main.ec': `visualizer main {
  name "Payment Domain"

  channel PaymentEvents {
    version 1.0.0
    address "payments.events"
    protocol "rabbitmq"
    summary "RabbitMQ exchange for payment events"
  }

  channel PaymentCommands {
    version 1.0.0
    address "payments.commands"
    protocol "http"
    summary "HTTP API for payment commands"
  }

  domain Payment {
    version 1.0.0
    summary "Handles all payment processing"

    container PaymentsDB {
      version 1.0.0
      container-type database
      technology "PostgreSQL 15"
      summary "Stores all payment transactions and state"
    }

    service PaymentService {
      version 1.0.0
      summary "Processes payments and refunds"

      writes-to container PaymentsDB
      reads-from container PaymentsDB

      sends event PaymentProcessed to PaymentEvents {
        version 1.0.0
        summary "Emitted when a payment completes successfully"
      }

      sends event PaymentFailed to PaymentEvents {
        version 1.0.0
        summary "Emitted when a payment fails"
      }

      receives command ProcessPayment from PaymentCommands {
        version 1.0.0
        summary "Command to initiate payment processing"
      }
    }
  }

  service NotificationService {
    version 1.0.0
    summary "Sends notifications to users"

    receives event PaymentProcessed from PaymentEvents

    receives event PaymentFailed from PaymentEvents

    sends event NotificationSent {
      version 1.0.0
      summary "Notification delivered to customer"
    }
  }
}
`,
    },
  },
  {
    name: 'Order Service Showcase',
    description: 'Service with events, drafts, deprecations, notes, and channels',
    source: {
      'main.ec': `import {
  OrderCreated, OrderConfirmed, OrderShipped, OrderCancelled, OrderCancelledV2,
  PaymentProcessed, PaymentFailed, StockReserved, StockUnavailable,
  NotificationSent, LegacyOrderCreated,
  CreateOrder, CancelOrder, GetOrderStatus
} from "./messages.ec"

import {
  OrderService, PaymentService, InventoryService,
  NotificationService, LegacyOrderAdapter, AnalyticsIngestion
} from "./services.ec"

visualizer main {
  name "Order Service Showcase"
  legend true

  channel OrderStream {
    version 1.0.0
    address "orders.stream"
    protocol "kafka"
    summary "Kafka topic for all order-related events"
    @note("Partition key is orderId — 12 partitions", author: "infra-team")
    @note("Retention: 14 days", author: "infra-team")
  }

  channel NotificationQueue {
    version 1.0.0
    address "notifications.queue"
    protocol "rabbitmq"
    summary "RabbitMQ queue for notification delivery"
  }

  channel LegacyOrderQueue {
    version 1.0.0
    address "legacy.orders"
    protocol "rabbitmq"
    summary "Legacy queue — being decommissioned"
    @note("No new consumers should connect to this queue", priority: "high")
  }

  service OrderService
  service PaymentService
  service InventoryService
  service NotificationService
  service LegacyOrderAdapter
  service AnalyticsIngestion
}
`,
      'services.ec': `service OrderService {
  version 2.0.0
  summary "Core service for managing the order lifecycle"
  @note("v2 adds support for multi-currency orders", author: "alice")
  @note("Load test before Black Friday — target 5k req/s", author: "bob", priority: "high")
  @note("Migrating from REST to gRPC for internal calls", author: "alice")

  sends event OrderCreated to OrderStream
  sends event OrderConfirmed to OrderStream
  sends event OrderShipped to OrderStream
  sends event OrderCancelled to OrderStream
  sends event OrderCancelledV2 to OrderStream

  receives command CreateOrder
  receives command CancelOrder
  receives query GetOrderStatus
}

service PaymentService {
  version 1.0.0
  summary "Processes payments and refunds"
  @note("Integrates with Stripe and Adyen", author: "dave")

  receives event OrderCreated from OrderStream

  sends event PaymentProcessed to OrderStream
  sends event PaymentFailed to OrderStream
}

service InventoryService {
  version 1.0.0
  summary "Manages stock levels and reservations"

  receives event OrderCreated from OrderStream
  receives event OrderCancelled from OrderStream

  sends event StockReserved to OrderStream
  sends event StockUnavailable to OrderStream
}

service NotificationService {
  version 1.0.0
  summary "Sends email, SMS, and push notifications"

  receives event OrderConfirmed from OrderStream
  receives event OrderShipped from OrderStream
  receives event OrderCancelled from OrderStream
  receives event PaymentFailed from OrderStream

  sends event NotificationSent to NotificationQueue
}

service LegacyOrderAdapter {
  version 1.0.0
  summary "Bridges events to the legacy order system"
  deprecated true
  @note("Decommission by Q3 2026", priority: "high")
  @note("Only handles APAC region traffic", author: "carol")
  @note("See migration runbook: https://wiki.internal/legacy-orders", author: "bob")

  receives event OrderCreated from OrderStream
  receives event OrderCancelled from OrderStream

  sends event LegacyOrderCreated to LegacyOrderQueue
}

service AnalyticsIngestion {
  version 1.0.0
  summary "Ingests order events into the data warehouse"
  draft true
  @note("Planned for Q2 2026 — depends on new Snowflake cluster", author: "dave")

  receives event OrderCreated from OrderStream
  receives event OrderConfirmed from OrderStream
  receives event OrderShipped from OrderStream
  receives event PaymentProcessed from OrderStream
}
`,
      'messages.ec': `event OrderCreated {
  version 1.0.0
  summary "Emitted when a customer places a new order"
  @note("Schema v2 adds shippingAddress field — deploy consumer updates first", author: "alice")
}

event OrderConfirmed {
  version 1.0.0
  summary "Order confirmed after payment and stock checks"
}

event OrderShipped {
  version 1.0.0
  summary "Order dispatched from the warehouse"
}

event OrderCancelled {
  version 1.0.0
  summary "Order cancelled by customer or system"
  deprecated true
  @note("Use OrderCancelledV2 instead — this lacks cancellation reason", priority: "high")
}

event OrderCancelledV2 {
  version 1.0.0
  summary "Order cancelled with structured reason codes"
  draft true
  @note("Rolling out to EU region first", author: "carol")
}

event PaymentProcessed {
  version 1.0.0
  summary "Payment completed successfully"
}

event PaymentFailed {
  version 1.0.0
  summary "Payment was declined or errored"
}

event StockReserved {
  version 1.0.0
  summary "Inventory reserved for an order"
}

event StockUnavailable {
  version 1.0.0
  summary "Requested items are out of stock"
}

event NotificationSent {
  version 1.0.0
  summary "Notification delivered to customer"
}

event LegacyOrderCreated {
  version 1.0.0
  summary "Legacy format order event"
  deprecated true
}

command CreateOrder {
  version 1.0.0
  summary "Place a new order"
  @note("Validate idempotency key before processing", author: "bob", priority: "high")
}

command CancelOrder {
  version 1.0.0
  summary "Request order cancellation"
}

query GetOrderStatus {
  version 1.0.0
  summary "Retrieve current order status"
  draft true
  @note("Will replace polling with push notifications in v2", author: "alice")
}
`,
    },
  },
  {
    name: 'Minimal Service',
    description: 'Simplest possible service definition',
    source: {
      'main.ec': `visualizer main {
  service UserService {
    version 1.0.0
    summary "Manages user accounts"

    sends event UserCreated
    sends event UserUpdated

    receives command CreateUser
    receives command UpdateUser
    receives query GetUser
  }
}
`,
    },
  },
  {
    name: 'E-Commerce Platform',
    description: 'E-commerce with Kafka messaging and HTTP commands',
    source: {
      'main.ec': `visualizer main {
  name "E-Commerce Platform"

  channel OrderEvents {
    version 1.0.0
    address "orders.events"
    protocol "kafka"
  }

  channel CommandAPI {
    version 1.0.0
    address "/api/v1"
    protocol "http"
  }

  domain Orders {
    version 1.0.0
    summary "Everything related to order management"

    service OrderService {
      version 1.0.0
      summary "Manages order lifecycle"

      sends event OrderCreated to OrderEvents {
        version 1.0.0
        summary "New order has been placed"
      }

      sends event OrderUpdated to OrderEvents {
        version 1.0.0
        summary "Order details have changed"
      }

      sends command ProcessPayment to CommandAPI

      receives event PaymentProcessed from OrderEvents

      receives event InventoryReserved
    }
  }

  domain Payment {
    version 1.0.0
    summary "Payment processing domain"

    service PaymentService {
      version 1.0.0
      summary "Handles payment transactions"

      receives command ProcessPayment from CommandAPI {
        version 1.0.0
      }

      sends event PaymentProcessed to OrderEvents {
        version 1.0.0
        summary "Payment completed successfully"
      }

      sends event PaymentFailed to OrderEvents {
        version 1.0.0
      }
    }
  }

  service InventoryService {
    version 1.0.0
    summary "Manages product inventory"

    receives event OrderCreated from OrderEvents

    sends event InventoryReserved {
      version 1.0.0
      summary "Inventory reserved for order"
    }

    sends event InventoryReleased {
      version 1.0.0
    }
  }

  service NotificationService {
    version 1.0.0
    summary "Sends email and push notifications"

    receives event OrderCreated from OrderEvents

    receives event PaymentProcessed from OrderEvents

    receives event PaymentFailed from OrderEvents
  }
}
`,
    },
  },
  {
    name: 'Event-Driven Saga',
    description: 'Choreography-based saga with NServiceBus',
    source: {
      'main.ec': `visualizer main {
  name "Order Fulfillment Saga"

  channel SagaEvents {
    version 1.0.0
    address "saga.events"
    protocol "nservicebus"
    summary "NServiceBus for saga coordination"
  }

  service OrderService {
    version 1.0.0
    summary "Order orchestration"

    sends event OrderPlaced to SagaEvents {
      version 1.0.0
      summary "Customer placed a new order"
    }

    receives event PaymentConfirmed from SagaEvents

    receives event PaymentRejected from SagaEvents

    receives event StockReserved from SagaEvents

    receives event StockUnavailable from SagaEvents

    sends event OrderConfirmed to SagaEvents {
      version 1.0.0
      summary "Order fully confirmed"
    }

    sends event OrderRejected to SagaEvents {
      version 1.0.0
    }
  }

  service PaymentService {
    version 1.0.0
    summary "Payment processing"

    receives event OrderPlaced from SagaEvents

    sends event PaymentConfirmed to SagaEvents {
      version 1.0.0
    }

    sends event PaymentRejected to SagaEvents {
      version 1.0.0
    }
  }

  service InventoryService {
    version 1.0.0
    summary "Stock management"

    receives event OrderPlaced from SagaEvents

    sends event StockReserved to SagaEvents {
      version 1.0.0
    }

    sends event StockUnavailable to SagaEvents {
      version 1.0.0
    }
  }

  service EmailService {
    version 1.0.0
    summary "Customer communications"

    receives event OrderConfirmed from SagaEvents

    receives event OrderRejected from SagaEvents
  }
}
`,
    },
  },
  {
    name: 'Post-It Style',
    description: 'Visual post-it note style rendering',
    source: {
      'main.ec': `visualizer main {
  name "Post-It Style Example"
  style post-it
  legend true

  channel OrderQueue {
    version 1.0.0
    address "orders.queue"
    protocol "azure-servicebus"
  }

  service OrderService {
    version 1.0.0
    summary "Manages orders"

    sends event OrderCreated to OrderQueue {
      version 1.0.0
    }

    sends event OrderShipped to OrderQueue {
      version 1.0.0
    }
  }

  service WarehouseService {
    version 1.0.0
    summary "Manages inventory and shipping"

    receives event OrderCreated from OrderQueue

    sends event OrderShipped to OrderQueue
  }

  service NotificationService {
    version 1.0.0
    summary "Sends customer notifications"

    receives event OrderShipped from OrderQueue
  }
}
`,
    },
  },
  {
    name: 'Data Products',
    description: 'Analytical data products with inputs and outputs',
    source: {
      'main.ec': `visualizer main {
  name "Analytics Platform"

  channel EventBus {
    version 1.0.0
    address "analytics.events"
    protocol "kafka"
  }

  service OrderService {
    version 1.0.0
    summary "Manages order lifecycle"

    sends event OrderCreated to EventBus {
      version 1.0.0
      summary "New order has been placed"
    }

    sends event OrderCompleted to EventBus {
      version 1.0.0
      summary "Order has been fulfilled"
    }
  }

  service PaymentService {
    version 1.0.0
    summary "Handles payment processing"

    sends event PaymentProcessed to EventBus {
      version 1.0.0
      summary "Payment completed successfully"
    }
  }

  data-product OrderAnalytics {
    version 1.0.0
    name "Order Analytics Dataset"
    summary "Aggregated order and payment data for business intelligence"

    input event OrderCreated
    input event OrderCompleted
    input event PaymentProcessed

    output event OrderMetrics {
      contract {
        path "./schemas/order-metrics.json"
        name "OrderMetricsSchema"
        type "json-schema"
      }
    }

    output event CustomerInsights
  }

  data-product RevenueReporting {
    version 1.0.0
    summary "Revenue analysis and reporting"

    input event PaymentProcessed

    output event DailyRevenue
    output event MonthlyRevenue
  }
}
`,
    },
  },
  {
    name: 'Multi-File with Imports',
    description: 'Demonstrates splitting definitions across files with imports',
    source: {
      'main.ec': `import { PaymentService, PaymentProcessed, PaymentFailed } from "./payment.ec"
import { OrderService, OrderCreated } from "./order.ec"

visualizer main {
  name "E-Commerce System"

  channel MessageBus {
    version 1.0.0
    address "events.stream"
    protocol "kafka"
  }

  service PaymentService
  service OrderService

  service NotificationService {
    version 1.0.0
    summary "Sends notifications for important events"

    receives event PaymentProcessed from MessageBus

    receives event PaymentFailed from MessageBus

    receives event OrderCreated from MessageBus

    sends event NotificationSent {
      version 1.0.0
      summary "Notification delivered to user"
    }
  }
}
`,
      'payment.ec': `domain Payment {
  version 1.0.0
  summary "Payment processing domain"

  service PaymentService {
    version 1.0.0
    summary "Handles payment transactions"

    sends event PaymentProcessed {
      version 1.0.0
      summary "Payment completed successfully"
    }

    sends event PaymentFailed {
      version 1.0.0
      summary "Payment processing failed"
    }

    receives command ProcessPayment {
      version 1.0.0
      summary "Initiate payment processing"
    }
  }
}
`,
      'order.ec': `domain Orders {
  version 1.0.0
  summary "Order management domain"

  service OrderService {
    version 1.0.0
    summary "Manages order lifecycle"

    sends event OrderCreated {
      version 1.0.0
      summary "New order created"
    }

    sends command ProcessPayment

    receives event PaymentProcessed
  }
}
`,
    },
  },
  {
    name: 'Remote URL Imports',
    description: 'Import definitions from remote URLs (GitHub, Gist, etc.)',
    source: {
      'main.ec': `import { PaymentService, PaymentProcessed, PaymentFailed } from "https://gist.githubusercontent.com/boyney123/f5aa33c20a656f6c1d9dbba7f30f5569/raw/a8a6830f19649ded18221c69525a73016364b63a/gistfile1.txt"

visualizer main {
  name "Remote Import Example"

  channel EventStream {
    version 1.0.0
    address "events.stream"
    protocol "rabbitmq"
  }

  service PaymentService

  service NotificationService {
    version 1.0.0
    summary "Sends payment notifications"

    receives event PaymentProcessed from EventStream

    receives event PaymentFailed from EventStream

    sends event EmailSent {
      version 1.0.0
      summary "Notification email sent to customer"
    }
  }
}
`,
    },
  },
  {
    name: 'Banking with Subdomains',
    description: 'Banking domain organized with subdomains for different banking functions',
    source: {
      'main.ec': `visualizer main {
  name "Banking Platform"
  legend true

  channel BankingEvents {
    version 1.0.0
    address "banking.events"
    protocol "kafka"
  }

  channel BankingCommands {
    version 1.0.0
    address "/api/v1"
    protocol "http"
  }

  domain Banking {
    version 1.0.0
    summary "Core banking domain with customer accounts, payments, and loans"

    subdomain Accounts {
      version 1.0.0
      summary "Customer account management and transactions"

      container AccountsDB {
        version 1.0.0
        container-type database
        technology "PostgreSQL 15"
        summary "Stores customer account data"
      }

      service AccountService {
        version 1.0.0
        summary "Manages customer accounts and balances"

        writes-to container AccountsDB
        reads-from container AccountsDB

        sends event AccountOpened to BankingEvents {
          version 1.0.0
          summary "New customer account created"
        }

        sends event AccountClosed to BankingEvents {
          version 1.0.0
          summary "Customer account closed"
        }

        sends event BalanceUpdated to BankingEvents {
          version 1.0.0
          summary "Account balance changed"
        }

        receives command OpenAccount from BankingCommands {
          version 1.0.0
          summary "Open a new customer account"
        }

        receives command CloseAccount from BankingCommands {
          version 1.0.0
          summary "Close an existing account"
        }

        receives event TransactionCompleted from BankingEvents
        receives event LoanDisbursed from BankingEvents
      }
    }

    subdomain Payments {
      version 1.0.0
      summary "Payment processing and transfers"

      container PaymentsDB {
        version 1.0.0
        container-type database
        technology "PostgreSQL 15"
        summary "Stores payment transactions"
      }

      service PaymentService {
        version 1.0.0
        summary "Processes payments and transfers between accounts"

        writes-to container PaymentsDB
        reads-from container PaymentsDB

        sends event PaymentInitiated to BankingEvents {
          version 1.0.0
          summary "Payment process started"
        }

        sends event TransactionCompleted to BankingEvents {
          version 1.0.0
          summary "Payment successfully completed"
        }

        sends event TransactionFailed to BankingEvents {
          version 1.0.0
          summary "Payment failed"
        }

        receives command ProcessPayment from BankingCommands {
          version 1.0.0
          summary "Process a payment transaction"
        }

        receives command TransferFunds from BankingCommands {
          version 1.0.0
          summary "Transfer funds between accounts"
        }

        receives event AccountOpened from BankingEvents
      }
    }

    subdomain Loans {
      version 1.0.0
      summary "Loan origination and management"

      container LoansDB {
        version 1.0.0
        container-type database
        technology "PostgreSQL 15"
        summary "Stores loan applications and details"
      }

      service LoanService {
        version 1.0.0
        summary "Manages loan applications and disbursements"

        writes-to container LoansDB
        reads-from container LoansDB

        sends event LoanApplicationSubmitted to BankingEvents {
          version 1.0.0
          summary "Customer submitted loan application"
        }

        sends event LoanApproved to BankingEvents {
          version 1.0.0
          summary "Loan application approved"
        }

        sends event LoanRejected to BankingEvents {
          version 1.0.0
          summary "Loan application rejected"
        }

        sends event LoanDisbursed to BankingEvents {
          version 1.0.0
          summary "Loan funds disbursed to account"
        }

        receives command ApplyForLoan from BankingCommands {
          version 1.0.0
          summary "Submit a new loan application"
        }

        receives command ApproveLoan from BankingCommands {
          version 1.0.0
          summary "Approve a loan application"
        }

        receives event AccountOpened from BankingEvents
        receives event BalanceUpdated from BankingEvents
      }
    }
  }

  service NotificationService {
    version 1.0.0
    summary "Sends notifications to customers"

    receives event AccountOpened from BankingEvents
    receives event TransactionCompleted from BankingEvents
    receives event LoanApproved from BankingEvents
    receives event LoanRejected from BankingEvents

    sends event EmailSent {
      version 1.0.0
      summary "Email notification sent to customer"
    }

    sends event SMSSent {
      version 1.0.0
      summary "SMS notification sent to customer"
    }
  }

  service FraudDetectionService {
    version 1.0.0
    summary "Monitors transactions for fraudulent activity"

    receives event PaymentInitiated from BankingEvents
    receives event TransactionCompleted from BankingEvents

    sends event FraudAlertRaised {
      version 1.0.0
      summary "Suspicious activity detected"
    }
  }
}
`,
    },
  },
  {
    name: 'Planning Future Services',
    description: 'Demonstrates planning future services and migrations using draft mode',
    source: {
      'main.ec': `visualizer main {
  name "Service Migration Planning"
  legend true

  channel EventBus {
    version 1.0.0
    address "events.stream"
    protocol "Kafka"
  }

  channel LegacyQueue {
    version 1.0.0
    address "legacy.queue"
    protocol "RabbitMQ"
  }

  channel RESTAPI {
    version 1.0.0
    address "/api/v1"
    protocol "HTTP"
  }

  channel GraphQLAPI {
    version 1.0.0
    address "/graphql"
    protocol "HTTP"
  }

  container OrdersDB {
    version 1.0.0
    container-type database
    technology "PostgreSQL 15"
    summary "Stores order data"
  }

  container OrderReadDB {
    version 1.0.0
    container-type database
    technology "MongoDB 7"
    summary "Denormalized read model for fast queries"
  }

  container InventoryDB {
    version 1.0.0
    container-type database
    technology "PostgreSQL 15"
    summary "Tracks inventory levels"
  }

  container AnalyticsDB {
    version 1.0.0
    container-type dataWarehouse
    technology "Snowflake"
    summary "Data warehouse for analytics"
  }

  domain Orders {
    version 1.0.0
    summary "Order management domain - currently being modernized"

    service LegacyOrderService {
      version 1.0.0
      summary "Legacy monolithic order service - being phased out"
      deprecated true
      @note("Decommission by Q3 2026", priority: "high")
      @note("Migration guide: https://wiki.internal/legacy-migration")

      sends event OrderCreated to LegacyQueue
      sends event OrderProcessed to LegacyQueue
      receives command CreateOrder from RESTAPI
    }

    service OrderService {
      version 1.0.0
      summary "Modern order service - currently in production"
      @note("Needs load testing before handling legacy traffic")

      writes-to container OrdersDB
      reads-from container OrdersDB

      sends event OrderCreated to EventBus
      sends event OrderValidated to EventBus
      sends event OrderSubmitted to EventBus

      receives command CreateOrder from RESTAPI
      receives command ValidateOrder from RESTAPI
    }

    service OrderQueryService {
      version 1.0.0
      summary "Query service for order data - planned for Q2 2026"
      draft true

      writes-to container OrderReadDB
      reads-from container OrderReadDB

      receives event OrderCreated from EventBus
      receives event OrderValidated from EventBus
      receives event OrderSubmitted from EventBus

      receives query GetOrder from GraphQLAPI
      receives query SearchOrders from GraphQLAPI
    }
  }

  domain Fulfillment {
    version 1.0.0
    summary "Order fulfillment and shipping"

    service FulfillmentService {
      version 1.0.0
      summary "Handles order fulfillment - currently in production"

      receives event OrderSubmitted from EventBus
      sends event OrderFulfilled to EventBus
      sends event OrderShipped to EventBus
    }

    service InventoryReservationService {
      version 1.0.0
      summary "Reserves inventory for orders - planned for Q3 2026"
      draft true

      writes-to container InventoryDB
      reads-from container InventoryDB

      receives event OrderValidated from EventBus
      sends event InventoryReserved to EventBus
      sends event InventoryUnavailable to EventBus
    }
  }

  service NotificationService {
    version 1.0.0
    summary "Sends customer notifications"

    receives event OrderCreated from EventBus
    receives event OrderShipped from EventBus
    sends event EmailSent
  }

  service AnalyticsService {
    version 1.0.0
    summary "Real-time analytics and reporting - planned for Q2 2026"
    draft true

    writes-to container AnalyticsDB

    receives event OrderCreated from EventBus
    receives event OrderFulfilled from EventBus
    receives event OrderShipped from EventBus
  }
}
`,
    },
  },
  {
    name: 'Enterprise E-Commerce',
    description: 'Complex enterprise system with 8 domains and multiple channels',
    source: {
      'main.ec': `import { Orders, OrderService, OrderCreated, OrderShipped, OrderCancelled } from "./orders.ec"
import { Payment, PaymentService, PaymentProcessed, PaymentFailed } from "./payment.ec"
import { Inventory, InventoryService, StockReserved, StockReleased } from "./inventory.ec"
import { Shipping, ShippingService, ShipmentCreated, ShipmentDelivered } from "./shipping.ec"
import { Customer, CustomerService, CustomerRegistered, CustomerUpdated } from "./customer.ec"
import { Marketing, CampaignService, CampaignStarted, EmailSent } from "./marketing.ec"
import { Analytics, AnalyticsService } from "./analytics.ec"
import { Notifications, NotificationService } from "./notifications.ec"

visualizer main {
  name "Enterprise E-Commerce Platform"
  legend true
  search true

  domain Orders
  domain Payment
  domain Inventory
  domain Shipping
  domain Customer
  domain Marketing
  domain Analytics
  domain Notifications

  channel OrdersChannel {
    version 1.0.0
    address "orders.events"
    protocol "kafka"
  }

  channel PaymentsChannel {
    version 1.0.0
    address "payments.events"
    protocol "kafka"
  }

  channel ShippingChannel {
    version 1.0.0
    address "shipping.events"
    protocol "kafka"
  }

  channel CommandAPI {
    version 1.0.0
    address "/api/v1"
    protocol "http"
  }

  data-product CustomerInsights {
    version 1.0.0
    summary "Customer behavior and purchase analytics"

    input event OrderCreated
    input event PaymentProcessed
    input event CustomerRegistered

    output event CustomerMetrics
    output event PurchasePatterns {
      contract {
        path "./schemas/purchase-patterns.json"
        name "PurchasePatternsSchema"
        type "json-schema"
      }
    }
  }

  data-product RevenueAnalytics {
    version 1.0.0
    summary "Real-time revenue and sales analytics"

    input event PaymentProcessed
    input event OrderShipped

    output event DailyRevenue
    output event MonthlySalesReport
  }
}
`,
      'orders.ec': `domain Orders {
  version 1.0.0
  summary "Order management and lifecycle"

  container OrdersDB {
    version 1.0.0
    container-type database
    technology "PostgreSQL 15"
    summary "Stores all order data and state"
  }

  service OrderService {
    version 1.0.0
    summary "Manages order creation, updates, and fulfillment"

    writes-to container OrdersDB
    reads-from container OrdersDB

    sends event OrderCreated {
      version 1.0.0
      summary "New order has been placed by customer"
    }

    sends event OrderShipped {
      version 1.0.0
      summary "Order has been shipped to customer"
    }

    sends event OrderCancelled {
      version 1.0.0
      summary "Order has been cancelled"
    }

    sends command ProcessPayment {
      version 1.0.0
      summary "Request payment processing"
    }

    sends command ReserveStock {
      version 1.0.0
      summary "Request inventory reservation"
    }

    receives event PaymentProcessed
    receives event PaymentFailed
    receives event StockReserved

    receives command CancelOrder {
      version 1.0.0
      summary "Cancel an existing order"
    }
  }
}
`,
      'payment.ec': `domain Payment {
  version 1.0.0
  summary "Payment processing and billing"

  container PaymentDB {
    version 1.0.0
    container-type database
    technology "PostgreSQL 15"
    summary "Stores payment transactions"
  }

  container PaymentCache {
    version 1.0.0
    container-type cache
    technology "Redis 7"
    summary "Caches payment status for quick lookups"
  }

  service PaymentService {
    version 1.0.0
    summary "Processes payments and manages billing"

    writes-to container PaymentDB
    writes-to container PaymentCache
    reads-from container PaymentCache

    sends event PaymentProcessed {
      version 1.0.0
      summary "Payment completed successfully"
    }

    sends event PaymentFailed {
      version 1.0.0
      summary "Payment processing failed"
    }

    receives command ProcessPayment

    receives command RefundPayment {
      version 1.0.0
      summary "Process a refund"
    }
  }
}
`,
      'inventory.ec': `domain Inventory {
  version 1.0.0
  summary "Inventory and stock management"

  container InventoryDB {
    version 1.0.0
    container-type database
    technology "PostgreSQL 15"
    summary "Stores product inventory levels"
  }

  service InventoryService {
    version 1.0.0
    summary "Manages product stock levels and reservations"

    writes-to container InventoryDB
    reads-from container InventoryDB

    sends event StockReserved {
      version 1.0.0
      summary "Stock has been reserved for an order"
    }

    sends event StockReleased {
      version 1.0.0
      summary "Reserved stock has been released"
    }

    sends event LowStockAlert {
      version 1.0.0
      summary "Stock level is below threshold"
    }

    receives command ReserveStock

    receives command ReleaseStock {
      version 1.0.0
    }

    receives event OrderCancelled
  }
}
`,
      'shipping.ec': `domain Shipping {
  version 1.0.0
  summary "Shipping and logistics management"

  container ShippingDB {
    version 1.0.0
    container-type database
    technology "MongoDB 6"
    summary "Stores shipment tracking information"
  }

  service ShippingService {
    version 1.0.0
    summary "Manages shipment creation and tracking"

    writes-to container ShippingDB
    reads-from container ShippingDB

    sends event ShipmentCreated {
      version 1.0.0
      summary "Shipment has been created"
    }

    sends event ShipmentDelivered {
      version 1.0.0
      summary "Shipment delivered to customer"
    }

    receives event OrderShipped

    receives query GetShipmentStatus {
      version 1.0.0
      summary "Query shipment tracking status"
    }
  }
}
`,
      'customer.ec': `domain Customer {
  version 1.0.0
  summary "Customer identity and profile management"

  container CustomerDB {
    version 1.0.0
    container-type database
    technology "PostgreSQL 15"
    summary "Stores customer profiles and preferences"
  }

  service CustomerService {
    version 1.0.0
    summary "Manages customer accounts and profiles"

    writes-to container CustomerDB
    reads-from container CustomerDB

    sends event CustomerRegistered {
      version 1.0.0
      summary "New customer account created"
    }

    sends event CustomerUpdated {
      version 1.0.0
      summary "Customer profile updated"
    }

    receives command RegisterCustomer {
      version 1.0.0
    }

    receives command UpdateCustomer {
      version 1.0.0
    }

    receives query GetCustomerProfile {
      version 1.0.0
    }
  }
}
`,
      'marketing.ec': `domain Marketing {
  version 1.0.0
  summary "Marketing campaigns and customer engagement"

  container CampaignDB {
    version 1.0.0
    container-type database
    technology "MongoDB 6"
    summary "Stores campaign data and metrics"
  }

  service CampaignService {
    version 1.0.0
    summary "Manages marketing campaigns"

    writes-to container CampaignDB
    reads-from container CampaignDB

    sends event CampaignStarted {
      version 1.0.0
      summary "Marketing campaign has started"
    }

    sends event EmailSent {
      version 1.0.0
      summary "Marketing email sent to customer"
    }

    receives event CustomerRegistered
    receives event OrderCreated
  }
}
`,
      'analytics.ec': `domain Analytics {
  version 1.0.0
  summary "Business intelligence and analytics"

  container AnalyticsDB {
    version 1.0.0
    container-type dataWarehouse
    technology "Snowflake"
    summary "Data warehouse for analytics"
  }

  service AnalyticsService {
    version 1.0.0
    summary "Processes and aggregates business metrics"

    writes-to container AnalyticsDB

    receives event OrderCreated
    receives event PaymentProcessed
    receives event ShipmentDelivered
    receives event CustomerRegistered
  }
}
`,
      'notifications.ec': `domain Notifications {
  version 1.0.0
  summary "Multi-channel notification delivery"

  container NotificationQueue {
    version 1.0.0
    container-type cache
    technology "Redis 7"
    summary "Queue for pending notifications"
  }

  service NotificationService {
    version 1.0.0
    summary "Sends notifications via email, SMS, and push"

    writes-to container NotificationQueue
    reads-from container NotificationQueue

    sends event NotificationSent {
      version 1.0.0
      summary "Notification delivered to customer"
    }

    receives event OrderCreated
    receives event OrderShipped
    receives event PaymentProcessed
    receives event PaymentFailed
    receives event ShipmentDelivered
  }
}
`,
    },
  },
  {
    name: 'Notes & Annotations',
    description: 'Attach notes to resources for context, decisions, and reminders',
    source: {
      'main.ec': `visualizer main {
  name "Notes & Annotations"
  legend true

  channel OrderEvents {
    version 1.0.0
    address "orders.events"
    protocol "kafka"
    @note("Partition key is orderId", author: "infra-team")
    @note("Retention set to 7 days")
  }

  channel PaymentEvents {
    version 1.0.0
    address "payments.events"
    protocol "kafka"
  }

  domain Orders {
    version 1.0.0
    summary "Order management"

    service OrderService {
      version 1.0.0
      summary "Handles order lifecycle"
      @note("Needs rate limiting before Black Friday", author: "alice", priority: "high")
      @note("Migrating to event sourcing in Q3", author: "bob")

      sends event OrderCreated to OrderEvents {
        version 1.0.0
        summary "New order placed"
        @note("Schema v2 adds shippingAddress field", author: "alice")
      }

      sends event OrderCancelled to OrderEvents {
        version 1.0.0
        summary "Order was cancelled"
      }

      receives command CreateOrder {
        version 1.0.0
        @note("Validate idempotency key before processing", author: "bob", priority: "high")
      }
    }

    service LegacyOrderService {
      version 1.0.0
      summary "Old monolith — being decommissioned"
      deprecated true
      @note("Decommission by Q4 2026", priority: "high")
      @note("See migration runbook: https://wiki.internal/orders-migration")
      @note("Only handles EU region traffic now", author: "carol")

      sends event OrderCreated to OrderEvents
      receives command CreateOrder
    }
  }

  domain Payment {
    version 1.0.0
    summary "Payment processing"

    service PaymentService {
      version 2.0.0
      summary "Processes payments and refunds"
      @note("v2 adds support for crypto payments", author: "dave")

      receives event OrderCreated from OrderEvents

      sends event PaymentProcessed to PaymentEvents {
        version 1.0.0
        summary "Payment completed"
        @note("Includes refund reference when applicable", author: "dave")
      }

      sends event PaymentFailed to PaymentEvents {
        version 1.0.0
      }
    }
  }

  service NotificationService {
    version 1.0.0
    summary "Sends customer notifications"

    receives event PaymentProcessed from PaymentEvents
    receives event PaymentFailed from PaymentEvents
    receives event OrderCancelled from OrderEvents
  }
}
`,
    },
  },
  {
    name: 'Channel Routing',
    description: 'IoT pipeline with channel-to-channel routing (Kafka → Kafka → MQTT)',
    source: {
      'main.ec': `visualizer main {
  name "IoT Sensor Pipeline"
  legend true

  channel SensorIngestion {
    version 1.0.0
    address "sensors.raw"
    protocol "Kafka"
    summary "Raw sensor data ingestion topic"
    route SensorFiltered
  }

  channel SensorFiltered {
    version 1.0.0
    address "sensors.filtered"
    protocol "Kafka"
    summary "Filtered and validated sensor data"
    route DeviceCommands
  }

  channel DeviceCommands {
    version 1.0.0
    address "devices/+/commands"
    protocol "MQTT"
    summary "MQTT topic for device command delivery"
  }

  service SensorGateway {
    version 1.0.0
    summary "Ingests raw sensor readings from IoT devices"

    sends event SensorReading to SensorIngestion {
      version 1.0.0
      summary "Raw sensor reading from a device"
    }

    sends event DeviceHeartbeat to SensorIngestion {
      version 1.0.0
      summary "Periodic device health check"
    }
  }

  service FilterService {
    version 1.0.0
    summary "Validates and filters raw sensor data"

    receives event SensorReading from SensorIngestion
    receives event DeviceHeartbeat from SensorIngestion

    sends event SensorReading to SensorFiltered
    sends event DeviceAlert to SensorFiltered {
      version 1.0.0
      summary "Alert when device readings are anomalous"
    }
  }

  service DeviceBridge {
    version 1.0.0
    summary "Bridges Kafka events to MQTT for device delivery"

    receives event DeviceAlert from SensorFiltered

    sends command RecalibrateDevice to DeviceCommands {
      version 1.0.0
      summary "Instructs a device to recalibrate its sensors"
    }
  }

  service DashboardService {
    version 1.0.0
    summary "Real-time monitoring dashboard"

    receives event SensorReading from SensorFiltered
    receives event DeviceAlert from SensorFiltered
  }
}
`,
    },
  },
  {
    name: 'AWS Event Pipeline',
    description: 'Cross-domain EventBridge routing with SQS queues on AWS',
    source: {
      'main.ec': `visualizer main {
  name "AWS Event Pipeline"

  domain Orders {
    version 1.0.0
    summary "Order management domain"

    channel OrderEventBus {
      version 1.0.0
      address "arn:aws:events:us-east-1:123456789:event-bus/orders"
      protocol "EventBridge"
      summary "Event bus for the orders domain"
      route MainEventBus
    }

    service OrderService {
      version 1.0.0
      summary "Handles order creation and lifecycle"

      sends event OrderCreated to OrderEventBus {
        version 1.0.0
        summary "Emitted when a customer places an order"
      }

      sends event OrderShipped to OrderEventBus {
        version 1.0.0
        summary "Emitted when an order is shipped"
      }

      sends event OrderCancelled to OrderEventBus {
        version 1.0.0
        summary "Emitted when an order is cancelled"
      }
    }
  }

  domain Fulfillment {
    version 1.0.0
    summary "Warehouse and shipping operations"

    channel FulfillmentEventBus {
      version 1.0.0
      address "arn:aws:events:us-east-1:123456789:event-bus/fulfillment"
      protocol "EventBridge"
      summary "Event bus for the fulfillment domain"
      route PickingQueue
      route ShippingQueue
    }

    channel PickingQueue {
      version 1.0.0
      address "arn:aws:sqs:us-east-1:123456789:warehouse-picking"
      protocol "SQS"
      summary "Queue for warehouse pick-list generation"
    }

    channel ShippingQueue {
      version 1.0.0
      address "arn:aws:sqs:us-east-1:123456789:shipping-labels"
      protocol "SQS"
      summary "Queue for shipping label creation"
    }

    service WarehouseService {
      version 1.0.0
      summary "Manages warehouse picking and packing"

      receives event OrderCreated from PickingQueue
      receives event OrderCancelled from PickingQueue
    }

    service ShippingService {
      version 1.0.0
      summary "Handles carrier selection and label generation"

      receives event OrderCreated from ShippingQueue
    }
  }

  domain Notifications {
    version 1.0.0
    summary "Customer communication channels"

    channel NotificationsEventBus {
      version 1.0.0
      address "arn:aws:events:us-east-1:123456789:event-bus/notifications"
      protocol "EventBridge"
      summary "Event bus for the notifications domain"
      route EmailQueue
      route PushQueue
      route SmsQueue
    }

    channel EmailQueue {
      version 1.0.0
      address "arn:aws:sqs:us-east-1:123456789:email-delivery"
      protocol "SQS"
      summary "Queue for transactional email delivery"
    }

    channel PushQueue {
      version 1.0.0
      address "arn:aws:sqs:us-east-1:123456789:push-notifications"
      protocol "SQS"
      summary "Queue for mobile push notifications"
    }

    channel SmsQueue {
      version 1.0.0
      address "arn:aws:sqs:us-east-1:123456789:sms-notifications"
      protocol "SQS"
      summary "Queue for SMS notifications"
    }

    service EmailService {
      version 1.0.0
      summary "Sends transactional emails to customers"

      receives event OrderCreated from EmailQueue
      receives event OrderShipped from EmailQueue
      receives event OrderCancelled from EmailQueue
    }

    service PushNotificationService {
      version 1.0.0
      summary "Sends mobile push notifications"

      receives event OrderShipped from PushQueue
      receives event OrderCancelled from PushQueue
    }

    service SmsService {
      version 1.0.0
      summary "Sends SMS order updates"

      receives event OrderShipped from SmsQueue
    }
  }

  domain Analytics {
    version 1.0.0
    summary "Business intelligence and search"

    channel AnalyticsEventBus {
      version 1.0.0
      address "arn:aws:events:us-east-1:123456789:event-bus/analytics"
      protocol "EventBridge"
      summary "Event bus for the analytics domain"
      route MetricsQueue
      route SearchIndexQueue
    }

    channel MetricsQueue {
      version 1.0.0
      address "arn:aws:sqs:us-east-1:123456789:metrics-ingestion"
      protocol "SQS"
      summary "Queue for metrics and KPI ingestion"
    }

    channel SearchIndexQueue {
      version 1.0.0
      address "arn:aws:sqs:us-east-1:123456789:search-indexing"
      protocol "SQS"
      summary "Queue for search index updates"
    }

    service MetricsService {
      version 1.0.0
      summary "Tracks order metrics and business KPIs"

      receives event OrderCreated from MetricsQueue
      receives event OrderShipped from MetricsQueue
      receives event OrderCancelled from MetricsQueue
    }

    service SearchService {
      version 1.0.0
      summary "Maintains product and order search indexes"

      receives event OrderCreated from SearchIndexQueue
      receives event OrderShipped from SearchIndexQueue
    }
  }
}
`,
      'channels.ec': `// Central company-wide event bus — routes to all domain buses
channel MainEventBus {
  version 1.0.0
  address "arn:aws:events:us-east-1:123456789:event-bus/main"
  protocol "EventBridge"
  summary "Central company-wide event bus"
  route FulfillmentEventBus
  route NotificationsEventBus
  route AnalyticsEventBus
}
`,
    },
  },
  {
    name: 'Flow: Order Fulfillment',
    description: 'PM-friendly business flow with when-blocks, branching, and convergence',
    source: {
      'main.ec': `import { OrderService, PaymentService, InventoryService, FulfillmentService, NotificationService } from "./services.ec"
import { PlaceOrder, OrderCreated, PaymentProcessed, PaymentFailed, StockReserved, OrderShipped, CustomerNotified } from "./messages.ec"

actor Customer {
  name "Customer"
  summary "End user on the storefront"
}

external-system WarehouseWMS {
  name "Warehouse WMS"
  summary "Legacy warehouse management system"
}

flow OrderFulfillment {
  version 1.0.0
  name "Order Fulfillment"
  summary "End-to-end order processing from placement to delivery"

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

visualizer main {
  name "Order Fulfillment Flow"
  flow OrderFulfillment@1.0.0
}
`,
      'services.ec': `service OrderService {
  version 1.0.0
  name "Order Service"
  summary "Manages the order lifecycle"
}

service PaymentService {
  version 1.0.0
  name "Payment Service"
  summary "Processes payments via Stripe"
}

service InventoryService {
  version 1.0.0
  name "Inventory Service"
  summary "Manages stock and reservations"
}

service FulfillmentService {
  version 1.0.0
  name "Fulfillment Service"
  summary "Coordinates order shipping"
}

service NotificationService {
  version 1.0.0
  name "Notification Service"
  summary "Sends email and push notifications"
}
`,
      'messages.ec': `command PlaceOrder {
  version 1.0.0
  name "Place Order"
  summary "Customer places a new order"
}

event OrderCreated {
  version 1.0.0
  name "Order Created"
  summary "Emitted when a new order is placed"
}

event PaymentProcessed {
  version 1.0.0
  name "Payment Processed"
  summary "Payment completed successfully"
}

event PaymentFailed {
  version 1.0.0
  name "Payment Failed"
  summary "Payment was declined or errored"
}

event StockReserved {
  version 1.0.0
  name "Stock Reserved"
  summary "Inventory reserved for order"
}

event OrderShipped {
  version 1.0.0
  name "Order Shipped"
  summary "Order has been dispatched"
}

event CustomerNotified {
  version 1.0.0
  name "Customer Notified"
  summary "Customer received notification"
}
`,
    },
  },
  {
    name: 'Flow: E-Commerce Checkout',
    description: 'Complex flow with validation, fraud detection, parallel processing, and multiple failure paths',
    source: {
      'main.ec': `import {
  CartService, ValidationService, FraudDetectionService, PaymentService,
  InventoryService, ShippingService, TaxService, EmailService,
  WarehouseService, AccountingService, AnalyticsService
} from "./services.ec"
import {
  InitiateCheckout, CheckoutValidated, ValidationFailed,
  FraudCheckPassed, FraudDetected, PaymentAuthorized, PaymentFailed,
  InventoryReserved, InventoryUnavailable, ShippingCalculated,
  TaxCalculated, OrderConfirmed, OrderCancelled, ShipmentCreated,
  InvoiceGenerated, ConfirmationEmailSent
} from "./messages.ec"

actor Customer {
  name "Customer"
  summary "End user completing purchase"
}

external-system PaymentGateway {
  name "Stripe Payment Gateway"
  summary "Third-party payment processor"
}

external-system TaxAPI {
  name "Avalara Tax API"
  summary "Tax calculation service"
}

external-system ShippingCarrier {
  name "FedEx API"
  summary "Shipping carrier integration"
}

flow ECommerceCheckout {
  version 1.0.0
  name "E-Commerce Checkout Flow"
  summary "Complete checkout process with validation, fraud detection, and parallel fulfillment"

  // Entry: customer initiates checkout
  Customer "initiates checkout"
    -> InitiateCheckout
    -> CartService "validates cart"
    -> CheckoutValidated

  // Parallel validation and fraud check
  when CheckoutValidated
    ValidationService "validates customer data"
      -> "valid": FraudCheckPassed
      -> "invalid": ValidationFailed
    FraudDetectionService "runs fraud analysis"
      -> "pass": FraudCheckPassed
      -> "fail": FraudDetected

  // Failure path: validation or fraud failed
  when ValidationFailed
    EmailService "notifies customer of validation errors"

  when FraudDetected
    EmailService "notifies fraud team"
    AnalyticsService "logs fraud attempt"

  // Success path: both checks passed - start payment
  when FraudCheckPassed
    PaymentGateway "authorizes payment"
      -> "authorized": PaymentAuthorized
      -> "declined": PaymentFailed

  when PaymentFailed
    CartService "restores cart"
    EmailService "notifies customer of payment failure"

  // Payment successful - parallel inventory and calculations
  when PaymentAuthorized
    InventoryService "reserves stock"
      -> "reserved": InventoryReserved
      -> "unavailable": InventoryUnavailable
    TaxService "calculates tax via API"
      -> TaxCalculated
    ShippingService "calculates shipping cost"
      -> ShippingCalculated

  // Inventory unavailable after payment
  when InventoryUnavailable
    PaymentGateway "refunds payment"
    EmailService "notifies customer of unavailable items"

  // Wait for all three: inventory + tax + shipping
  when InventoryReserved and TaxCalculated and ShippingCalculated
    CartService "confirms order"
      -> OrderConfirmed

  // Order confirmed - parallel fulfillment activities
  when OrderConfirmed
    WarehouseService "creates pick ticket"
      -> ShipmentCreated
    AccountingService "generates invoice"
      -> InvoiceGenerated
    EmailService "sends confirmation email"
      -> ConfirmationEmailSent
    AnalyticsService "tracks conversion"

  // Shipment tracking
  when ShipmentCreated
    ShippingCarrier "creates shipping label"
    WarehouseService "assigns to picker"
}

visualizer main {
  name "E-Commerce Checkout Flow"
  flow ECommerceCheckout@1.0.0
}
`,
      'services.ec': `service CartService {
  version 1.0.0
  name "Cart Service"
  summary "Manages shopping cart and checkout"
}

service ValidationService {
  version 1.0.0
  name "Validation Service"
  summary "Validates customer and order data"
}

service FraudDetectionService {
  version 1.0.0
  name "Fraud Detection Service"
  summary "Analyzes orders for fraud patterns"
}

service PaymentService {
  version 1.0.0
  name "Payment Service"
  summary "Processes payments"
}

service InventoryService {
  version 1.0.0
  name "Inventory Service"
  summary "Manages stock and reservations"
}

service ShippingService {
  version 1.0.0
  name "Shipping Service"
  summary "Calculates shipping costs and methods"
}

service TaxService {
  version 1.0.0
  name "Tax Service"
  summary "Calculates taxes via external API"
}

service EmailService {
  version 1.0.0
  name "Email Service"
  summary "Sends transactional emails"
}

service WarehouseService {
  version 1.0.0
  name "Warehouse Service"
  summary "Manages warehouse operations"
}

service AccountingService {
  version 1.0.0
  name "Accounting Service"
  summary "Handles invoicing and accounting"
}

service AnalyticsService {
  version 1.0.0
  name "Analytics Service"
  summary "Tracks events and conversions"
}
`,
      'messages.ec': `command InitiateCheckout {
  version 1.0.0
  name "Initiate Checkout"
  summary "Customer starts checkout process"
}

event CheckoutValidated {
  version 1.0.0
  name "Checkout Validated"
  summary "Cart and checkout data validated"
}

event ValidationFailed {
  version 1.0.0
  name "Validation Failed"
  summary "Customer or order data validation failed"
}

event FraudCheckPassed {
  version 1.0.0
  name "Fraud Check Passed"
  summary "Order passed fraud detection"
}

event FraudDetected {
  version 1.0.0
  name "Fraud Detected"
  summary "Potential fraud detected"
}

event PaymentAuthorized {
  version 1.0.0
  name "Payment Authorized"
  summary "Payment successfully authorized"
}

event PaymentFailed {
  version 1.0.0
  name "Payment Failed"
  summary "Payment declined or failed"
}

event InventoryReserved {
  version 1.0.0
  name "Inventory Reserved"
  summary "Stock reserved for order"
}

event InventoryUnavailable {
  version 1.0.0
  name "Inventory Unavailable"
  summary "Insufficient stock available"
}

event ShippingCalculated {
  version 1.0.0
  name "Shipping Calculated"
  summary "Shipping cost and method determined"
}

event TaxCalculated {
  version 1.0.0
  name "Tax Calculated"
  summary "Tax amount calculated"
}

event OrderConfirmed {
  version 1.0.0
  name "Order Confirmed"
  summary "Order fully confirmed and ready for fulfillment"
}

event OrderCancelled {
  version 1.0.0
  name "Order Cancelled"
  summary "Order cancelled due to failure"
}

event ShipmentCreated {
  version 1.0.0
  name "Shipment Created"
  summary "Warehouse shipment created"
}

event InvoiceGenerated {
  version 1.0.0
  name "Invoice Generated"
  summary "Invoice created for order"
}

event ConfirmationEmailSent {
  version 1.0.0
  name "Confirmation Email Sent"
  summary "Customer received order confirmation"
}
`,
    },
  },
];
