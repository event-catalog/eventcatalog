import type { Example } from './types';

export const example: Example = {
  name: 'OpenAPI Import',
  group: 'Getting Started',
  description: 'Import commands and queries from an OpenAPI spec into services',
  source: {
    'main.ec': `// Commands and queries generated from OpenAPI spec
import commands { CreateOrder, UpdateOrder, DeleteOrder } from "./orders-openapi.yml"
import queries { GetOrders, GetOrder } from "./orders-openapi.yml"

visualizer main {
  name "Order Management (OpenAPI Import)"

  // Service that receives the imported commands and queries
  service OrderService {
    version 1.0.0
    summary "Manages order CRUD operations"

    receives command CreateOrder
    receives command UpdateOrder
    receives command DeleteOrder
    receives query GetOrders
    receives query GetOrder
  }

  // New service that integrates with the OpenAPI service
  service AdminDashboard {
    version 1.0.0
    summary "Internal admin tool"

    sends query GetOrders
    sends query GetOrder
  }
}
`,
    'orders-openapi.yml': `openapi: 3.0.3
info:
  title: Orders API
  version: 1.0.0
  description: RESTful API for managing customer orders
servers:
  - url: https://api.example.com/v1
paths:
  /orders:
    get:
      operationId: GetOrders
      summary: List all orders with optional filters
      parameters:
        - name: status
          in: query
          schema:
            type: string
            enum: [pending, shipped, delivered, cancelled]
        - name: limit
          in: query
          schema:
            type: integer
            default: 20
      responses:
        '200':
          description: A list of orders
          content:
            application/json:
              schema:
                type: array
                items:
                  $ref: '#/components/schemas/Order'
    post:
      operationId: CreateOrder
      summary: Create a new order
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              required: [customerId, items]
              properties:
                customerId:
                  type: string
                  format: uuid
                items:
                  type: array
                  items:
                    type: object
                    properties:
                      productId:
                        type: string
                      quantity:
                        type: integer
      responses:
        '201':
          description: Order created
  /orders/{orderId}:
    get:
      operationId: GetOrder
      summary: Get a single order by ID
      parameters:
        - name: orderId
          in: path
          required: true
          schema:
            type: string
            format: uuid
      responses:
        '200':
          description: The order
    put:
      operationId: UpdateOrder
      summary: Update an existing order
      parameters:
        - name: orderId
          in: path
          required: true
          schema:
            type: string
            format: uuid
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              properties:
                status:
                  type: string
                items:
                  type: array
      responses:
        '200':
          description: Order updated
    delete:
      operationId: DeleteOrder
      summary: Cancel and delete an order
      parameters:
        - name: orderId
          in: path
          required: true
          schema:
            type: string
            format: uuid
      responses:
        '204':
          description: Order deleted
components:
  schemas:
    Order:
      type: object
      properties:
        id:
          type: string
          format: uuid
        customerId:
          type: string
        status:
          type: string
          enum: [pending, shipped, delivered, cancelled]
        items:
          type: array
        totalAmount:
          type: number
        createdAt:
          type: string
          format: date-time
`,
  },
};
