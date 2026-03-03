import type { Example } from './types';

export const example: Example = {
  name: 'E-Commerce Platform',
  group: 'Architecture Patterns',
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
};
