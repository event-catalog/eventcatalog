import type { Example } from './types';

export const example: Example = {
  name: 'OpenAPI + AsyncAPI Mixed',
  description: 'Combine REST (OpenAPI) and event-driven (AsyncAPI) specs in a single architecture',
  source: {
    'main.ec': `// Generated from OpenAPI spec (REST API)
import OrderService from "./orders-openapi.yml"
// Generated from AsyncAPI spec (event-driven)
import InventoryService from "./inventory-asyncapi.yml"

visualizer main {
  name "E-Commerce (REST + Events)"

  // Generated from OpenAPI spec
  service OrderService
  // Generated from AsyncAPI spec
  service InventoryService

  // New service that integrates with both OpenAPI and AsyncAPI services
  service WebApp {
    version 1.0.0
    summary "Customer-facing web application"

    sends command CreateOrder
    sends query GetOrders
  }
}
`,
    'orders-openapi.yml': `openapi: 3.0.3
info:
  title: Order Service
  version: 1.0.0
  description: RESTful API for order management.
paths:
  /orders:
    get:
      operationId: GetOrders
      summary: List all orders
      responses:
        '200':
          description: A list of orders
    post:
      operationId: CreateOrder
      summary: Place a new order
      responses:
        '201':
          description: Order created
  /orders/{id}:
    get:
      operationId: GetOrder
      summary: Get order details
      responses:
        '200':
          description: Order details
    put:
      operationId: UpdateOrder
      summary: Update an order
      responses:
        '200':
          description: Order updated
`,
    'inventory-asyncapi.yml': `asyncapi: 3.0.0
info:
  title: Inventory Service
  version: 1.0.0
  description: Manages stock levels and reacts to order events.

servers:
  production:
    host: kafka.prod.example.com:9092
    protocol: kafka

channels:
  stockReserved:
    address: inventory.stock-reserved
    summary: Stock reservation confirmations
    messages:
      StockReserved:
        $ref: '#/components/messages/StockReserved'
  stockDepleted:
    address: inventory.stock-depleted
    summary: Low stock warnings
    messages:
      StockDepleted:
        $ref: '#/components/messages/StockDepleted'
  orderCreated:
    address: orders.created
    summary: New order events from the Order Service
    messages:
      OrderCreated:
        $ref: '#/components/messages/OrderCreated'

operations:
  onOrderCreated:
    action: receive
    channel:
      $ref: '#/channels/orderCreated'
    summary: Reserves stock when a new order is placed
  publishStockReserved:
    action: send
    channel:
      $ref: '#/channels/stockReserved'
    summary: Confirms stock has been reserved
  publishStockDepleted:
    action: send
    channel:
      $ref: '#/channels/stockDepleted'
    summary: Warns when stock is running low

components:
  messages:
    OrderCreated:
      summary: A new order has been placed
    StockReserved:
      summary: Stock reserved for an order
      contentType: application/json
      payload:
        type: object
        properties:
          orderId:
            type: string
          reservedItems:
            type: array
    StockDepleted:
      summary: Stock has fallen below threshold
      contentType: application/json
      payload:
        type: object
        properties:
          productId:
            type: string
          remainingStock:
            type: integer
`,
  },
};
