/** What agents are told: the server's instructions, and get_architecture_schema's answer */
import { z } from 'zod';
import { Model } from '@eventcatalog/visualiser/model';

export const SERVER_INSTRUCTIONS = `EventCatalog visualises software architecture (domains, systems, services, events, commands, queries, channels and data stores) as interactive, levelled diagrams.

When the user asks how something works ("help me understand how payments work", "show me the orders service"):
1. Call get_architecture_schema once to learn the model.
2. Read the user's code and specs yourself: AsyncAPI/OpenAPI specs first, then producer/consumer code (Kafka, SNS/SQS, EventBridge, RabbitMQ, NATS clients, topic and queue names), then infrastructure (Terraform, CDK, Helm, docker-compose).
3. Build the model: give every resource a summary (a sentence on what it is or does, from the code or specs: it's shown on its node), fill evidence (file:line) for everything, and set inferred: true for anything not seen directly.
4. Call render_architecture. Start small: one domain or service with focus set, and expand when the user asks.
5. Explain what the diagram shows. Don't redraw it if the client shows it interactively.
6. When the user wants to understand part of it ("how does this service work?", "show me the schema"), call show_on_diagram with the diagram's viewUrl: zoom in, highlight, write notes and pin the code you read, scene by scene.`;

const EXAMPLE: z.input<typeof Model> = {
  title: 'Orders and Payments',
  resources: [
    { id: 'sales', type: 'domain', name: 'Sales', summary: 'Selling to customers: orders and stock.' },
    { id: 'finance', type: 'domain', name: 'Finance', summary: 'Taking payments.' },
    { id: 'ordering', type: 'system', name: 'Ordering', parent: 'sales', summary: 'Places orders and reserves their stock.' },
    { id: 'orders-service', type: 'service', name: 'Orders Service', parent: 'ordering', summary: 'Takes orders from the storefront and tracks them until they are paid.', evidence: 'services/orders/src/index.ts' },
    { id: 'inventory-service', type: 'service', name: 'Inventory Service', parent: 'ordering', summary: 'Reserves stock for new orders.' },
    { id: 'payment-service', type: 'service', name: 'Payment Service', parent: 'finance', summary: 'Charges the customer for each order.', evidence: 'services/payments/src/handler.ts' },
    { id: 'PlaceOrder', type: 'command', name: 'Place Order', summary: 'Sent by the storefront when a customer checks out.' },
    { id: 'OrderPlaced', type: 'event', name: 'Order Placed', summary: 'An order was placed and saved.', evidence: 'specs/orders.asyncapi.yaml' },
    { id: 'PaymentProcessed', type: 'event', name: 'Payment Processed', summary: 'An order was paid for.' },
    { id: 'orders-topic', type: 'channel', name: 'orders', technology: 'Kafka', summary: 'Order events, keyed by order id.' },
    { id: 'orders-db', type: 'container', name: 'Orders DB', technology: 'PostgreSQL', summary: 'Orders and their line items.' },
  ],
  relations: [
    { from: 'orders-service', to: 'PlaceOrder', kind: 'receives' },
    { from: 'orders-service', to: 'OrderPlaced', kind: 'sends', evidence: 'services/orders/src/publish.ts:12' },
    { from: 'OrderPlaced', to: 'orders-topic', kind: 'routes-through' },
    { from: 'payment-service', to: 'OrderPlaced', kind: 'receives' },
    { from: 'inventory-service', to: 'OrderPlaced', kind: 'receives', inferred: true },
    { from: 'payment-service', to: 'PaymentProcessed', kind: 'sends' },
    { from: 'orders-service', to: 'PaymentProcessed', kind: 'receives' },
    { from: 'orders-service', to: 'orders-db', kind: 'writes' },
  ],
};

export const SCHEMA_GUIDE = `# EventCatalog architecture model

## Resource types
- domain: a business area (e.g. Sales, Finance). Domains can contain subdomains (parent: another domain) and systems.
- system: a group of services that together do one job (e.g. Ordering). Parent: a domain.
- service: something deployed that sends or receives messages (API, worker, lambda). Parent: a system or a domain.
- event: something that happened (OrderPlaced). Published by one service, consumed by many.
- command: a request to do something (PlaceOrder). Usually one receiver.
- query: a request for data (GetStock).
- channel: what messages travel through: a topic, queue, stream, exchange or event bus (set technology, e.g. "Kafka").
- container: a data store. Set containerType to its kind: database (the default), cache, objectStore (e.g. S3), searchIndex (e.g. Elasticsearch), dataWarehouse, dataLake, externalSaaS or other; and technology, e.g. "PostgreSQL", "Redis".
- entity: part of the domain model (Order, Customer), with properties: [{ name, type, required?, description? }]. Parent: a domain (or system). Shown at the messages level.
- team: who owns things (e.g. Payments Team). Connect it to what it owns with a "connects" relation labelled "owns" (from the team); it's also each owned resource's owner.
- actor, external-system, agent, view: people, third parties, AI agents and user interfaces around the architecture.
Messages, channels and containers have no parent.

## Relations (from -> to)
- sends: service -> event/command/query
- receives: service -> event/command/query (the service consumes it)
- routes-through: event/command/query -> channel
- reads / writes: service -> container
- connects: anything else, with a label, e.g. team -> service "owns", service -> entity "manages", entity -> entity "references"

## Summaries
Give every resource a summary when you can: one or two sentences on what it is or does (e.g. "Takes orders from the storefront and tracks them to delivery"), from what you read. It's shown on the node and its page, so people understand the diagram without opening the code. Without one, the node just shows its name.

## Schemas and links
- schema (events, commands, queries): { format, content, path }: copy the message's schema as it is from the spec or code (AsyncAPI payloads, Avro .avsc, .proto, JSON Schema). Users read it on the message's page.
- url: a link to where the resource is defined (e.g. a GitHub permalink to the file and line). Users get a "View the code" link.

## Evidence and inference
- evidence: where you found it, e.g. "src/orders/publisher.ts:42" or "specs/orders.asyncapi.yaml". Always fill it when you can.
- inferred: true when you guessed (e.g. from naming) rather than saw it in code or specs. Drawn dashed.

## Diagram links from the user
When the user pastes a diagram link (with #m= in it, e.g. shared from EventCatalog Studio by a teammate), call read_diagram with it to get its model. To change or expand it, edit that model and call render_architecture with it (keep their notes and layout). Live session links (#room=) are end-to-end encrypted: ask them to share a diagram link instead.

## Notes
notes: [{ text, resource?, level? }] adds notes to resources (or the whole diagram). A note with a level (overview, services or messages) shows only at that level; without one, at every level. Users add their own notes in the view (at the level they're looking at); you're told about them. They can also delete nodes and connect them in the view: the diagram link you're given has their changes, so build on it.

## Hotspots
hotspots: [{ resource, severity, title, description? }] flags what people should know about the architecture, as an architect would: risks, single points of failure, known problems, missing retries or idempotency, a hot path, or the key part to understand. severity is critical, warning (the default) or info. Each shows on its resource, hard to miss, and in a list sorted by severity. Add them when you spot something in the code worth flagging (and say why in description), with author { name: "<your name>", color: "#7c3aed", agent: true }. People add their own; you're told about them. Keep model.hotspots as they are when you change the diagram.

## Comments
People leave comment threads on the canvas (model.comments: each pinned to a resource with nodeId, or to a place, with its messages and whether it's resolved). You're told about open ones. Answer them in the conversation; when you change the diagram, keep model.comments as they are (add a reply to a thread only when the user asks, as a message with author { name: "<your name>", agent: true }).

## Walking the user through it (show_on_diagram)
When the user asks to be shown or taught something ("how does the payments service work?", "show me the schema for OrderPlaced"), call show_on_diagram with the diagram's viewUrl and a tour: scenes the user steps through, like you at a whiteboard. Each scene can:
- level: switch to overview, services or messages
- focus: [ids] zoom to them (one zooms close; several fit them all)
- highlight: [ids] emphasise them and fade the rest (defaults to focus)
- notes: [{ resource, text }] write short notes next to resources
- code: [{ resource, title, language, code }] pin code you read next to a resource: a schema, a handler, a config
- caption: what you're saying in this scene
Keep scenes short (3 to 8 is typical): start wide, zoom in, explain, then zoom back out. Notes and code are temporary.

## Levels
The diagram has three levels: overview (domains and systems), services (services and data stores, messages hidden), messages (everything). Overview needs a system or at least two domains.

## JSON schema of the model
${JSON.stringify(z.toJSONSchema(Model, { io: 'input' }), null, 2)}

## Example
${JSON.stringify(EXAMPLE, null, 2)}
`;
