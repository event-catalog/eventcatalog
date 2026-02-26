import type { Example } from './types';

export const example: Example = {
  name: 'Sample Event-Driven System',
  description: 'A realistic cross-domain architecture with imported REST APIs and event-driven workflows',
  source: {
    'main.ec': `import CheckoutApi from "./checkout-openapi.yml"
import CustomerApi from "./customers-openapi.yml"
import events { OrderPlaced, PaymentCaptured, InventoryReserved, OrderReadyForShipment } from "./commerce-asyncapi.yml"
import channels { ordersRequested, paymentsCaptured, inventoryReserved, fulfillmentReady } from "./commerce-asyncapi.yml"

domain Commerce {
  version 1.0.0

  service CommerceOrchestrator {
    version 1.0.0
    summary "Coordinates checkout workflow across domains"

    sends event OrderPlaced to ordersRequested
    receives event PaymentCaptured from paymentsCaptured
    receives event InventoryReserved from inventoryReserved
  }

  service PaymentService {
    version 1.0.0
    summary "Captures payments and emits outcomes"

    receives event OrderPlaced from ordersRequested
    sends event PaymentCaptured to paymentsCaptured
  }

  service InventoryService {
    version 1.0.0
    summary "Reserves stock and reports availability"

    receives event OrderPlaced from ordersRequested
    sends event InventoryReserved to inventoryReserved
  }
}

domain Fulfillment {
  version 1.0.0

  service FulfillmentService {
    version 1.0.0
    summary "Plans shipment after payment and inventory are confirmed"

    receives event PaymentCaptured from paymentsCaptured
    receives event InventoryReserved from inventoryReserved
    sends event OrderReadyForShipment to fulfillmentReady
  }

  service NotificationService {
    version 1.0.0
    summary "Notifies customers with order status updates"

    receives event OrderReadyForShipment from fulfillmentReady
  }

  service AnalyticsService {
    version 1.0.0
    summary "Builds operational dashboards from lifecycle events"

    receives event OrderPlaced from ordersRequested
    receives event PaymentCaptured from paymentsCaptured
    receives event OrderReadyForShipment from fulfillmentReady
  }
}

visualizer main {
  name "Sample Enterprise Checkout System"

  // REST surface imported from OpenAPI specs
  service CheckoutApi
  service CustomerApi

  // Domain boundaries and event-driven flows
  domain Commerce
  domain Fulfillment
}
`,
    'checkout-openapi.yml': `openapi: 3.0.3
info:
  title: Checkout API
  version: 1.0.0
  description: REST API for shopping cart and order checkout.
paths:
  /checkout:
    post:
      operationId: CreateCheckoutSession
      summary: Create a checkout session
      responses:
        '201':
          description: Checkout session created
  /checkout/{sessionId}/confirm:
    post:
      operationId: ConfirmCheckoutSession
      summary: Confirm an existing checkout session
      responses:
        '200':
          description: Session confirmed
`,
    'customers-openapi.yml': `openapi: 3.0.3
info:
  title: Customer API
  version: 1.0.0
  description: REST API for customer profile and notification preferences.
paths:
  /customers/{customerId}:
    get:
      operationId: GetCustomerProfile
      summary: Retrieve customer profile details
      responses:
        '200':
          description: Customer profile
  /customers/{customerId}/preferences:
    patch:
      operationId: UpdateNotificationPreferences
      summary: Update customer notification preferences
      responses:
        '200':
          description: Preferences updated
`,
    'commerce-asyncapi.yml': `asyncapi: 3.0.0
info:
  title: Commerce Event Bus
  version: 1.0.0
  description: Event contracts for checkout, payment, inventory, and fulfillment workflows.

channels:
  ordersRequested:
    address: commerce.orders.requested
    summary: New orders waiting for payment and stock checks
    messages:
      OrderPlaced:
        $ref: '#/components/messages/OrderPlaced'
  paymentsCaptured:
    address: commerce.payments.captured
    summary: Orders with successful payments
    messages:
      PaymentCaptured:
        $ref: '#/components/messages/PaymentCaptured'
  inventoryReserved:
    address: commerce.inventory.reserved
    summary: Orders with inventory confirmed
    messages:
      InventoryReserved:
        $ref: '#/components/messages/InventoryReserved'
  fulfillmentReady:
    address: commerce.fulfillment.ready
    summary: Orders that can move to shipment
    messages:
      OrderReadyForShipment:
        $ref: '#/components/messages/OrderReadyForShipment'

components:
  messages:
    OrderPlaced:
      summary: Customer has placed an order
    PaymentCaptured:
      summary: Payment for an order has been captured
    InventoryReserved:
      summary: Inventory has been reserved for an order
    OrderReadyForShipment:
      summary: Order can now be handed over to shipping
`,
  },
};
