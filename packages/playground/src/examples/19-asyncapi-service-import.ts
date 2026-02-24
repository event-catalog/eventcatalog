import type { Example } from './types';

export const example: Example = {
  name: 'AsyncAPI Service Import',
  description: 'Import a full service with channels and operations inferred from an AsyncAPI spec',
  source: {
    'main.ec': `import OrderService from "./orders-asyncapi.yml"

visualizer main {
  name "Order Processing (Full Service Import)"

  service OrderService

  service NotificationService {
    version 1.0.0
    summary "Sends customer notifications"

    receives event OrderCreated from orderCreated
    receives event OrderShipped from orderShipped
  }
}
`,
    'orders-asyncapi.yml': `asyncapi: 3.0.0
info:
  title: Order Service
  version: 1.0.0
  description: Manages order lifecycle events via Kafka.

servers:
  production:
    host: kafka.prod.example.com:9092
    protocol: kafka
    description: Production Kafka broker

channels:
  orderCreated:
    address: orders.created
    summary: Kafka topic for new order events
    messages:
      OrderCreated:
        $ref: '#/components/messages/OrderCreated'
    bindings:
      kafka:
        topic: orders.created
        partitions: 12

  orderShipped:
    address: orders.shipped
    summary: Kafka topic for shipment events
    messages:
      OrderShipped:
        $ref: '#/components/messages/OrderShipped'

  orderCancelled:
    address: orders.cancelled
    summary: Kafka topic for cancellation events
    messages:
      OrderCancelled:
        $ref: '#/components/messages/OrderCancelled'

operations:
  publishOrderCreated:
    action: send
    channel:
      $ref: '#/channels/orderCreated'
    summary: Publishes when a customer places an order
  publishOrderShipped:
    action: send
    channel:
      $ref: '#/channels/orderShipped'
    summary: Publishes when an order is shipped
  onOrderCancelled:
    action: receive
    channel:
      $ref: '#/channels/orderCancelled'
    summary: Handles order cancellation requests

components:
  messages:
    OrderCreated:
      summary: Fired when a new order is placed
      contentType: application/json
      payload:
        type: object
        properties:
          orderId:
            type: string
            format: uuid
          customerId:
            type: string
          totalAmount:
            type: number
    OrderShipped:
      summary: Fired when an order has been shipped
      contentType: application/json
      payload:
        type: object
        properties:
          orderId:
            type: string
            format: uuid
          trackingNumber:
            type: string
    OrderCancelled:
      summary: Fired when an order is cancelled
      contentType: application/json
      payload:
        type: object
        properties:
          orderId:
            type: string
            format: uuid
          reason:
            type: string
`,
  },
};
