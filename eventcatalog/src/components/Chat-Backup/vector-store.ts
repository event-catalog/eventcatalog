import { HuggingFaceTransformersEmbeddings } from '@langchain/community/embeddings/huggingface_transformers';
import { MemoryVectorStore } from 'langchain/vectorstores/memory';
import { Document } from 'langchain/document';

const embeddingsInstance = new HuggingFaceTransformersEmbeddings({
    model: 'Xenova/all-MiniLM-L6-v2',
});

export class VectorStore {
    private vectorStore: MemoryVectorStore;

    constructor() {
        this.vectorStore = new MemoryVectorStore(embeddingsInstance);
        this.initialize();
    }

    addDocuments(documents: Document[]) {
        this.vectorStore.addDocuments(documents);
    }

    similaritySearchWithScore(query: string, k: number = 5) {
        return this.vectorStore.similaritySearchWithScore(query, k);
    }

    similaritySearch(query: string, k: number = 5) {
        return this.vectorStore.similaritySearch(query, k);
    }

    

    private initialize() {
        this.vectorStore.addDocuments([
            new Document({
                pageContent:
                    'MessageType: Event, Markdown: OrderCreated: A new order #1234 was created for customer with items: 2x Widget Pro, 1x Smart Device. Total value: $156.99',
                metadata: { source: 'orders', eventType: 'OrderCreated', resourceType: 'event', id: 'OrderCreated' },
            }),
            new Document({
                pageContent:
                    'MessageType: Event, Markdown: PaymentProcessed: Payment of $156.99 was successfully processed for order #1234 using credit card (ending 5678)',
                metadata: { source: 'payments', eventType: 'PaymentProcessed', resourceType: 'event', id: 'PaymentProcessed' },
            }),
            new Document({
                pageContent:
                    'MessageType: Event, Markdown: InventoryUpdated: Stock levels adjusted after order #1234. Widget Pro: 48 remaining, Smart Device: 15 remaining',
                metadata: { source: 'inventory', eventType: 'InventoryUpdated', resourceType: 'event', id: 'InventoryUpdated' },
            }),
            new Document({
                pageContent:
                    'MessageType: Event, Markdown: ShipmentScheduled: Order #1234 has been scheduled for shipment. Carrier: FastShip, Expected delivery: 3-5 business days',
                metadata: { source: 'fulfillment', eventType: 'ShipmentScheduled', resourceType: 'event', id: 'ShipmentScheduled' },
            }),
            new Document({
                pageContent:
                    'MessageType: Event, Markdown: CustomerNotified: Confirmation email sent to customer regarding order #1234 with tracking details',
                metadata: { source: 'notifications', eventType: 'CustomerNotified', resourceType: 'event', id: 'CustomerNotified' },
            }),
            new Document({
                pageContent: 'MessageType: Command, Markdown: NotifyCustomer: Notify the customer that the order has been shipped',
                metadata: { source: 'notifications', eventType: 'NotifyCustomer', resourceType: 'command', id: 'NotifyCustomer' },
            }),
            new Document({
                pageContent: 'The NotificationsService is responsible for sending notifications to customers.',
                metadata: {
                    id: 'NotificationsService',
                    sends: [{ id: 'NotifyCustomer', resourceType: 'command' }],
                    receives: [{ id: 'CustomerNotified', resourceType: 'event' }],
                    summary: 'This service is responsible for sending notifications to customers',
                    resourceType: 'service',
                },
            }),
            new Document({
                pageContent: 'The OrderService is responsible for creating and updating orders.',
                metadata: {
                    id: 'OrderService',
                    sends: [{ id: 'OrderCreated', resourceType: 'event' }],
                    receives: [{ id: 'PaymentProcessed', resourceType: 'event' }],
                    summary: 'This service is responsible for creating and updating orders',
                    resourceType: 'service',
                },
            }),
            new Document({
                pageContent: 'The InventoryService is responsible for updating the inventory levels.',
                metadata: {
                    id: 'InventoryService',
                    sends: [{ id: 'InventoryUpdated', resourceType: 'event' }],
                    receives: [{ id: 'ShipmentScheduled', resourceType: 'event' }],
                    summary: 'This service is responsible for updating the inventory levels',
                    resourceType: 'service',
                },
            }),
            new Document({
                pageContent: 'The FulfillmentService is responsible for scheduling shipments.',
                metadata: {
                    id: 'FulfillmentService',
                    sends: [{ id: 'ShipmentScheduled', resourceType: 'event' }],
                    receives: [{ id: 'OrderCreated', resourceType: 'event' }],
                    summary: 'This service is responsible for scheduling shipments',
                    resourceType: 'service',
                },
            }),
            new Document({
                pageContent: 'The PaymentService is responsible for processing payments.',
                metadata: {
                    id: 'PaymentService',
                    sends: [{ id: 'PaymentProcessed', resourceType: 'event' }],
                    receives: [{ id: 'OrderCreated', resourceType: 'event' }],
                    summary: 'This service is responsible for processing payments',
                    resourceType: 'service',
                },
            }),
            new Document({
                pageContent: 'The CustomerService is responsible for managing customer information.',
                metadata: {
                    id: 'CustomerService',
                    owners: ['dboyne'],
                    sends: [{ id: 'CustomerNotified', resourceType: 'event' }],
                    receives: [{ id: 'NotifyCustomer', resourceType: 'command' }],
                    summary: 'This service is responsible for managing customer information',
                    resourceType: 'service',
                },
            }),
            new Document({
                pageContent: 'David is a software engineer at EventCatalog',
                metadata: { id: 'dboyne', name: 'David', resourceType: 'user' },
            }),
        ]);
    }
}