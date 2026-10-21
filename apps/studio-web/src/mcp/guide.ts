/** What agents are told: the server's instructions, and get_architecture_schema's answer */
import type { z } from 'zod';
import { Model } from '@eventcatalog/visualiser/model';

export const SERVER_INSTRUCTIONS = `EventCatalog visualises software architecture (domains, systems, services, events, commands, queries, channels and data stores) as interactive, levelled diagrams.

When the user asks how something works ("help me understand how payments work", "show me the orders service"):
1. Call get_architecture_schema once to learn the model.
2. Read the user's code and specs yourself: AsyncAPI/OpenAPI specs first, then producer/consumer code (Kafka, SNS/SQS, EventBridge, RabbitMQ, NATS clients, topic and queue names), then infrastructure (Terraform, CDK, Helm, docker-compose).
3. Build the model: give every resource a summary (a sentence on what it is or does, from the code or specs: it's shown on its node), fill evidence (file:line) for everything, and set inferred: true for anything not seen directly. Don't add notes (sticky notes on the diagram) unless the user asks for them: explain in your reply, and flag what matters with hotspots.
4. Call render_architecture. Start small: one domain or service with focus set, and expand when the user asks.
5. Explain what the diagram shows. Don't redraw it if the client shows it interactively.
6. The diagram stays open beside the conversation, and the user can change it there too. When they ask for a change, call edit_diagram with its diagramId and only what changes: they watch it change in place. Set reorder on the last edit of a round, to lay it out again. Call render_architecture again only for a new, separate diagram.`;

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

## Changing the diagram (edit_diagram)
A diagram stays open beside the conversation after render_architecture, and the user can change it there too. To change it, call edit_diagram with its diagramId and a list of changes, applied in order:
- add_resource { resource }: set parent to put it in its domain or system; it's placed next to what it connects to
- update_resource { id, set?, unset? }: set only the fields that change (name, summary, parent, technology...); unset the ones to take off, e.g. ["parent"] to take it out of its domain or system
- remove_resource { id }: its relations and hotspots go too; what was in it stays
- add_relation { relation } / remove_relation { from, to, kind? }
- add_hotspot { hotspot } / remove_hotspot { id }
- add_note { note: { text, resource? } }: only when the user asks for a note
- set_title { title }
Set "reorder": true on the last edit of a round of changes: the diagram is laid out again so it reads well (it moves everything, including what the user arranged, so leave it off when they've asked to keep their layout, and don't set it on every edit). Read it first with read_diagram { diagramId } when you need its ids or what the user changed. The result says which changes were made and why any weren't (an unknown id, a relation the types don't allow): fix those and send just them again. Never send where things go: the diagram places what's new and keeps what's there.
Example: { "diagramId": "…", "changes": [{ "op": "add_resource", "resource": { "id": "payments", "type": "domain", "name": "Payments" } }, { "op": "add_resource", "resource": { "id": "payment-service", "type": "service", "name": "Payment Service", "parent": "payments", "summary": "Charges customers for orders." } }, { "op": "add_relation", "relation": { "from": "payment-service", "to": "OrderPlaced", "kind": "receives" } }], "reorder": true }

## Diagram links from the user
When the user pastes a diagram link (with #m= in it, e.g. shared from EventCatalog Studio by a teammate), call read_diagram { diagram: link } to get its model. To build on it, change that model and call render_architecture with it: that shows it as a diagram they can then change with edit_diagram.

## Notes
notes: [{ text, resource?, level? }] are sticky notes on the diagram. Don't add any unless the user asks you to: explain the architecture in your reply, and flag what people should know with hotspots. To add one to an open diagram, use edit_diagram's add_note. When the user does ask, a note goes next to a resource (or on the whole diagram), and one with a level (overview, services or messages) shows only at that level; without one, at every level. Users add their own notes in the view (at the level they're looking at), and delete and connect nodes there: read_diagram shows you the diagram with their changes.

## Hotspots
hotspots: [{ resource, severity, title, description? }] flags what people should know about the architecture, as an architect would: risks, single points of failure, known problems, missing retries or idempotency, a hot path, or the key part to understand. severity is critical, warning (the default) or info. Each shows on its resource, hard to miss, and in a list sorted by severity. Add them when you spot something in the code worth flagging (and say why in description), with author { name: "<your name>", color: "#7c3aed", agent: true }. People add their own; you're told about them.

## Comments
People leave comment threads on the canvas (model.comments: each pinned to a resource with nodeId, or to a place, with its messages and whether it's resolved). You're told about open ones. Answer them in the conversation; edit_diagram keeps them as they are.

## Levels
The diagram has three levels: overview (domains and systems), services (services and data stores, messages hidden), messages (everything). Overview needs a system or at least two domains.

## Example
${JSON.stringify(EXAMPLE)}
`;
