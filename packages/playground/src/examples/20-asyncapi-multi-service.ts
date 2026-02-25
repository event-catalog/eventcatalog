import type { Example } from './types';

export const example: Example = {
  name: 'AsyncAPI Multi-Service',
  description: 'Three AsyncAPI specs: Orders publishes events, Shipping and Notifications consume them',
  source: {
    'main.ec': `// Services generated from multiple AsyncAPI specs
import OrderService from "./orders-asyncapi.yml"
import ShippingService from "./shipping-asyncapi.yml"
import NotificationService from "./notifications-asyncapi.yml"

visualizer main {
  name "Order Pipeline (Multi-Service AsyncAPI)"

  // Each service is generated from its own AsyncAPI spec
  service OrderService
  service ShippingService
  service NotificationService
}
`,
    'orders-asyncapi.yml': `asyncapi: 3.0.0
info:
  title: Order Service
  version: 1.0.0
  description: Manages order lifecycle and publishes order events.

servers:
  production:
    host: kafka.prod.example.com:9092
    protocol: kafka

channels:
  orderCreated:
    address: orders.created
    summary: New order placement events
    messages:
      OrderCreated:
        $ref: '#/components/messages/OrderCreated'
  orderPaid:
    address: orders.paid
    summary: Successful payment confirmation events
    messages:
      OrderPaid:
        $ref: '#/components/messages/OrderPaid'
  orderCancelled:
    address: orders.cancelled
    summary: Order cancellation events
    messages:
      OrderCancelled:
        $ref: '#/components/messages/OrderCancelled'

operations:
  publishOrderCreated:
    action: send
    channel:
      $ref: '#/channels/orderCreated'
  publishOrderPaid:
    action: send
    channel:
      $ref: '#/channels/orderPaid'
  publishOrderCancelled:
    action: send
    channel:
      $ref: '#/channels/orderCancelled'

components:
  messages:
    OrderCreated:
      summary: Fired when a customer places a new order
      contentType: application/json
      payload:
        type: object
        properties:
          orderId:
            type: string
          customerId:
            type: string
          items:
            type: array
          totalAmount:
            type: number
    OrderPaid:
      summary: Fired when payment is confirmed for an order
      contentType: application/json
      payload:
        type: object
        properties:
          orderId:
            type: string
          paymentId:
            type: string
          paidAt:
            type: string
            format: date-time
    OrderCancelled:
      summary: Fired when an order is cancelled by customer or system
      contentType: application/json
      payload:
        type: object
        properties:
          orderId:
            type: string
          reason:
            type: string
          cancelledAt:
            type: string
            format: date-time
`,
    'shipping-asyncapi.yml': `asyncapi: 3.0.0
info:
  title: Shipping Service
  version: 1.0.0
  description: Handles fulfillment by listening for paid orders and cancellations.

servers:
  production:
    host: kafka.prod.example.com:9092
    protocol: kafka

channels:
  orderPaid:
    address: orders.paid
    summary: Successful payment confirmation events
    messages:
      OrderPaid:
        $ref: '#/components/messages/OrderPaid'
  orderCancelled:
    address: orders.cancelled
    summary: Order cancellation events
    messages:
      OrderCancelled:
        $ref: '#/components/messages/OrderCancelled'
  shipmentDispatched:
    address: shipping.dispatched
    summary: Shipment dispatch events
    messages:
      ShipmentDispatched:
        $ref: '#/components/messages/ShipmentDispatched'

operations:
  onOrderPaid:
    action: receive
    channel:
      $ref: '#/channels/orderPaid'
  onOrderCancelled:
    action: receive
    channel:
      $ref: '#/channels/orderCancelled'
  publishShipmentDispatched:
    action: send
    channel:
      $ref: '#/channels/shipmentDispatched'

components:
  messages:
    OrderPaid:
      summary: Fired when payment is confirmed for an order
    OrderCancelled:
      summary: Fired when an order is cancelled by customer or system
    ShipmentDispatched:
      summary: Fired when a shipment leaves the warehouse
      contentType: application/json
      payload:
        type: object
        properties:
          shipmentId:
            type: string
          orderId:
            type: string
          carrier:
            type: string
          trackingNumber:
            type: string
`,
    'notifications-asyncapi.yml': `asyncapi: 3.0.0
info:
  title: Notification Service
  version: 1.0.0
  description: Sends customer notifications for key order lifecycle events.

servers:
  production:
    host: kafka.prod.example.com:9092
    protocol: kafka

channels:
  orderCreated:
    address: orders.created
    summary: New order placement events
    messages:
      OrderCreated:
        $ref: '#/components/messages/OrderCreated'
  orderCancelled:
    address: orders.cancelled
    summary: Order cancellation events
    messages:
      OrderCancelled:
        $ref: '#/components/messages/OrderCancelled'
  shipmentDispatched:
    address: shipping.dispatched
    summary: Shipment dispatch events
    messages:
      ShipmentDispatched:
        $ref: '#/components/messages/ShipmentDispatched'

operations:
  onOrderCreated:
    action: receive
    channel:
      $ref: '#/channels/orderCreated'
  onOrderCancelled:
    action: receive
    channel:
      $ref: '#/channels/orderCancelled'
  onShipmentDispatched:
    action: receive
    channel:
      $ref: '#/channels/shipmentDispatched'

components:
  messages:
    OrderCreated:
      summary: Fired when a customer places a new order
    OrderCancelled:
      summary: Fired when an order is cancelled by customer or system
    ShipmentDispatched:
      summary: Fired when a shipment leaves the warehouse
`,
  },
};
