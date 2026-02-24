import type { Example } from './types';

export const example: Example = {
  name: 'AsyncAPI Import',
  description: 'Import events and channels from an AsyncAPI spec into services',
  source: {
    'main.ec': `import events { OrderCreated, OrderShipped, OrderCancelled } from "./orders-asyncapi.yml"
import channels { orderCreated, orderShipped, orderCancelled } from "./orders-asyncapi.yml"

visualizer main {
  name "Order Processing (AsyncAPI Import)"

  service OrderService {
    version 1.0.0
    summary "Manages order lifecycle"

    sends event OrderCreated to orderCreated
    sends event OrderShipped to orderShipped
    sends event OrderCancelled to orderCancelled
  }

  service ShippingService {
    version 1.0.0
    summary "Handles shipping and delivery"

    receives event OrderCreated from orderCreated
    sends event OrderShipped to orderShipped
  }

  service NotificationService {
    version 1.0.0
    summary "Sends customer notifications"

    receives event OrderShipped from orderShipped
    receives event OrderCancelled from orderCancelled
  }
}
`,
    'orders-asyncapi.yml': `asyncapi: 3.0.0
info:
  title: Orders Service API
  version: 1.0.0
  description: Kafka-based async API for the Orders domain

servers:
  production:
    host: kafka.prod.example.com:9092
    protocol: kafka
    description: Production Kafka broker

channels:
  orderCreated:
    address: orders.created
    summary: Kafka topic for new order placement events
    messages:
      OrderCreated:
        $ref: '#/components/messages/OrderCreated'
    bindings:
      kafka:
        topic: orders.created
        partitions: 12
        replicas: 3

  orderShipped:
    address: orders.shipped
    summary: Kafka topic for order shipment events
    messages:
      OrderShipped:
        $ref: '#/components/messages/OrderShipped'
    bindings:
      kafka:
        topic: orders.shipped
        partitions: 6
        replicas: 3

  orderCancelled:
    address: orders.cancelled
    summary: Kafka topic for order cancellation events
    messages:
      OrderCancelled:
        $ref: '#/components/messages/OrderCancelled'
    bindings:
      kafka:
        topic: orders.cancelled
        partitions: 6
        replicas: 3

components:
  messages:
    OrderCreated:
      summary: Fired when a new order is placed by a customer
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
          items:
            type: array
          createdAt:
            type: string
            format: date-time
      bindings:
        kafka:
          key:
            type: string
            description: The order ID used as partition key

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
          carrier:
            type: string
          shippedAt:
            type: string
            format: date-time

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
          cancelledAt:
            type: string
            format: date-time
`,
  },
};
