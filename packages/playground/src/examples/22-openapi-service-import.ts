import type { Example } from './types';

export const example: Example = {
  name: 'OpenAPI Service Import',
  description: 'Import a full service with commands and queries inferred from an OpenAPI spec',
  source: {
    'main.ec': `// Full service generated from OpenAPI spec (commands, queries, and service definition)
import PaymentService from "./payments-openapi.yml"

visualizer main {
  name "Payment Gateway (Full Service Import)"

  // Generated from OpenAPI spec
  service PaymentService

  // New service that integrates with the OpenAPI service
  service CheckoutService {
    version 1.0.0
    summary "Handles the checkout flow"

    sends command CreatePayment
    sends query GetPayment
  }
}
`,
    'payments-openapi.yml': `openapi: 3.0.3
info:
  title: Payment Service
  version: 2.0.0
  description: Handles payment processing and retrieval.
servers:
  - url: https://api.example.com/payments
paths:
  /payments:
    get:
      operationId: ListPayments
      summary: List all payments
      parameters:
        - name: status
          in: query
          schema:
            type: string
            enum: [pending, completed, failed, refunded]
      responses:
        '200':
          description: List of payments
    post:
      operationId: CreatePayment
      summary: Process a new payment
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              required: [orderId, amount, currency]
              properties:
                orderId:
                  type: string
                  format: uuid
                amount:
                  type: number
                currency:
                  type: string
                  enum: [USD, EUR, GBP]
                paymentMethod:
                  type: string
                  enum: [card, bank_transfer, wallet]
      responses:
        '201':
          description: Payment created
  /payments/{paymentId}:
    get:
      operationId: GetPayment
      summary: Retrieve payment details
      parameters:
        - name: paymentId
          in: path
          required: true
          schema:
            type: string
            format: uuid
      responses:
        '200':
          description: Payment details
    delete:
      operationId: CancelPayment
      summary: Cancel a pending payment
      parameters:
        - name: paymentId
          in: path
          required: true
          schema:
            type: string
            format: uuid
      responses:
        '200':
          description: Payment cancelled
  /payments/{paymentId}/refund:
    post:
      operationId: RefundPayment
      summary: Refund a completed payment
      parameters:
        - name: paymentId
          in: path
          required: true
          schema:
            type: string
            format: uuid
      requestBody:
        content:
          application/json:
            schema:
              type: object
              properties:
                amount:
                  type: number
                reason:
                  type: string
      responses:
        '200':
          description: Payment refunded
`,
  },
};
