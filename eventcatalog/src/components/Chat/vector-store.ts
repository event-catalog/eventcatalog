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
            // Additional Events
            new Document({
                pageContent: 'MessageType: Event, Markdown: UserRegistered: New user account created with ID #789, email verified and welcome package sent',
                metadata: { source: 'users', eventType: 'UserRegistered', resourceType: 'event', id: 'UserRegistered' },
            }),
            new Document({
                pageContent: 'MessageType: Event, Markdown: ProductAdded: New product "Ultra Widget X1" added to catalog with SKU #PRD789, price $299.99',
                metadata: { source: 'catalog', eventType: 'ProductAdded', resourceType: 'event', id: 'ProductAdded' },
            }),
            new Document({
                pageContent: 'MessageType: Event, Markdown: ReviewSubmitted: Customer submitted 5-star review for product SKU #PRD789',
                metadata: { source: 'reviews', eventType: 'ReviewSubmitted', resourceType: 'event', id: 'ReviewSubmitted' },
            }),
            new Document({
                pageContent: 'MessageType: Event, Markdown: CartAbandoned: Shopping cart #456 abandoned with 3 items worth $450.00',
                metadata: { source: 'cart', eventType: 'CartAbandoned', resourceType: 'event', id: 'CartAbandoned' },
            }),
            new Document({
                pageContent: 'MessageType: Event, Markdown: PromotionCreated: New promotion "SUMMER2024" created with 20% discount',
                metadata: { source: 'marketing', eventType: 'PromotionCreated', resourceType: 'event', id: 'PromotionCreated' },
            }),
            new Document({
                pageContent: 'MessageType: Event, Markdown: RefundIssued: Refund of $156.99 processed for order #1234',
                metadata: { source: 'payments', eventType: 'RefundIssued', resourceType: 'event', id: 'RefundIssued' },
            }),
            new Document({
                pageContent: 'MessageType: Event, Markdown: ReturnRequested: Return requested for order #1234, reason: "Wrong size"',
                metadata: { source: 'returns', eventType: 'ReturnRequested', resourceType: 'event', id: 'ReturnRequested' },
            }),
            new Document({
                pageContent: 'MessageType: Event, Markdown: WishlistCreated: New wishlist created for user #789 with 5 items',
                metadata: { source: 'wishlist', eventType: 'WishlistCreated', resourceType: 'event', id: 'WishlistCreated' },
            }),
            new Document({
                pageContent: 'MessageType: Event, Markdown: SubscriptionActivated: Monthly subscription plan activated for user #789',
                metadata: { source: 'subscriptions', eventType: 'SubscriptionActivated', resourceType: 'event', id: 'SubscriptionActivated' },
            }),
            new Document({
                pageContent: 'MessageType: Event, Markdown: CategoryCreated: New product category "Smart Home" created with ID #CAT123',
                metadata: { source: 'catalog', eventType: 'CategoryCreated', resourceType: 'event', id: 'CategoryCreated' },
            }),
            new Document({
                pageContent: 'MessageType: Event, Markdown: WarehouseStockLow: Warehouse #WH1 reports low stock alert for SKU #PRD789',
                metadata: { source: 'warehouse', eventType: 'WarehouseStockLow', resourceType: 'event', id: 'WarehouseStockLow' },
            }),
            new Document({
                pageContent: 'MessageType: Event, Markdown: ShippingRateUpdated: Shipping rates updated for zone "WEST-USA"',
                metadata: { source: 'shipping', eventType: 'ShippingRateUpdated', resourceType: 'event', id: 'ShippingRateUpdated' },
            }),
            new Document({
                pageContent: 'MessageType: Event, Markdown: VendorOnboarded: New vendor "TechSupplies Inc" onboarded with ID #V456',
                metadata: { source: 'vendors', eventType: 'VendorOnboarded', resourceType: 'event', id: 'VendorOnboarded' },
            }),
            new Document({
                pageContent: 'MessageType: Event, Markdown: BulkOrderPlaced: Wholesale order #W789 placed for 1000 units',
                metadata: { source: 'wholesale', eventType: 'BulkOrderPlaced', resourceType: 'event', id: 'BulkOrderPlaced' },
            }),
            new Document({
                pageContent: 'MessageType: Event, Markdown: GiftCardIssued: Digital gift card #GC123 issued for $100',
                metadata: { source: 'giftcards', eventType: 'GiftCardIssued', resourceType: 'event', id: 'GiftCardIssued' },
            }),

            // Additional Commands
            new Document({
                pageContent: 'MessageType: Command, Markdown: CreateUser: Create a new user account with provided details',
                metadata: { source: 'users', eventType: 'CreateUser', resourceType: 'command', id: 'CreateUser' },
            }),
            new Document({
                pageContent: 'MessageType: Command, Markdown: AddProduct: Add a new product to the catalog',
                metadata: { source: 'catalog', eventType: 'AddProduct', resourceType: 'command', id: 'AddProduct' },
            }),
            new Document({
                pageContent: 'MessageType: Command, Markdown: ProcessPayment: Process payment for an order',
                metadata: { source: 'payments', eventType: 'ProcessPayment', resourceType: 'command', id: 'ProcessPayment' },
            }),
            new Document({
                pageContent: 'MessageType: Command, Markdown: UpdateInventory: Update inventory levels for products',
                metadata: { source: 'inventory', eventType: 'UpdateInventory', resourceType: 'command', id: 'UpdateInventory' },
            }),
            new Document({
                pageContent: 'MessageType: Command, Markdown: ScheduleDelivery: Schedule delivery for processed order',
                metadata: { source: 'shipping', eventType: 'ScheduleDelivery', resourceType: 'command', id: 'ScheduleDelivery' },
            }),
            new Document({
                pageContent: 'MessageType: Command, Markdown: CreatePromotion: Create a new promotional campaign',
                metadata: { source: 'marketing', eventType: 'CreatePromotion', resourceType: 'command', id: 'CreatePromotion' },
            }),
            new Document({
                pageContent: 'MessageType: Command, Markdown: ProcessRefund: Process refund for returned order',
                metadata: { source: 'payments', eventType: 'ProcessRefund', resourceType: 'command', id: 'ProcessRefund' },
            }),
            new Document({
                pageContent: 'MessageType: Command, Markdown: CreateWishlist: Create a new wishlist for user',
                metadata: { source: 'wishlist', eventType: 'CreateWishlist', resourceType: 'command', id: 'CreateWishlist' },
            }),
            new Document({
                pageContent: 'MessageType: Command, Markdown: ActivateSubscription: Activate subscription plan for user',
                metadata: { source: 'subscriptions', eventType: 'ActivateSubscription', resourceType: 'command', id: 'ActivateSubscription' },
            }),
            new Document({
                pageContent: 'MessageType: Command, Markdown: CreateCategory: Create new product category',
                metadata: { source: 'catalog', eventType: 'CreateCategory', resourceType: 'command', id: 'CreateCategory' },
            }),

            // Additional Services
            new Document({
                pageContent: 'The CatalogService manages product catalog and categories.',
                metadata: {
                    id: 'CatalogService',
                    sends: [{ id: 'ProductAdded', resourceType: 'event' }, { id: 'CategoryCreated', resourceType: 'event' }],
                    receives: [{ id: 'AddProduct', resourceType: 'command' }, { id: 'CreateCategory', resourceType: 'command' }],
                    summary: 'Manages product catalog and categories',
                    resourceType: 'service',
                },
            }),
            new Document({
                pageContent: 'The MarketingService handles promotions and campaigns.',
                metadata: {
                    id: 'MarketingService',
                    sends: [{ id: 'PromotionCreated', resourceType: 'event' }],
                    receives: [{ id: 'CreatePromotion', resourceType: 'command' }],
                    summary: 'Handles marketing promotions and campaigns',
                    resourceType: 'service',
                },
            }),
            new Document({
                pageContent: 'The UserService manages user accounts and authentication.',
                metadata: {
                    id: 'UserService',
                    sends: [{ id: 'UserRegistered', resourceType: 'event' }],
                    receives: [{ id: 'CreateUser', resourceType: 'command' }],
                    summary: 'Manages user accounts and authentication',
                    resourceType: 'service',
                },
            }),
            new Document({
                pageContent: 'The WishlistService manages user wishlists.',
                metadata: {
                    id: 'WishlistService',
                    sends: [{ id: 'WishlistCreated', resourceType: 'event' }],
                    receives: [{ id: 'CreateWishlist', resourceType: 'command' }],
                    summary: 'Manages user wishlists',
                    resourceType: 'service',
                },
            }),
            new Document({
                pageContent: 'The SubscriptionService handles user subscriptions.',
                metadata: {
                    id: 'SubscriptionService',
                    sends: [{ id: 'SubscriptionActivated', resourceType: 'event' }],
                    receives: [{ id: 'ActivateSubscription', resourceType: 'command' }],
                    summary: 'Manages user subscriptions',
                    resourceType: 'service',
                },
            }),

            // Additional Users
            new Document({
                pageContent: 'Sarah is a product manager at EventCatalog',
                metadata: { id: 'sjohnson', name: 'Sarah', resourceType: 'user' },
            }),
            new Document({
                pageContent: 'Michael is a senior developer at EventCatalog',
                metadata: { id: 'msmith', name: 'Michael', resourceType: 'user' },
            }),
            new Document({
                pageContent: 'Emily is a UX designer at EventCatalog',
                metadata: { id: 'ebrown', name: 'Emily', resourceType: 'user' },
            }),
            new Document({
                pageContent: 'James is a system architect at EventCatalog',
                metadata: { id: 'jdavis', name: 'James', resourceType: 'user' },
            }),

            // Domains
            new Document({
                pageContent: 'The Orders domain handles all order processing and management',
                metadata: { id: 'orders', name: 'Orders', resourceType: 'domain', summary: 'Order processing and management' },
            }),
            new Document({
                pageContent: 'The Catalog domain manages products and categories',
                metadata: { id: 'catalog', name: 'Catalog', resourceType: 'domain', summary: 'Product and category management' },
            }),
            new Document({
                pageContent: 'The Users domain handles user management and authentication',
                metadata: { id: 'users', name: 'Users', resourceType: 'domain', summary: 'User management and authentication' },
            }),
            new Document({
                pageContent: 'The Payments domain manages all payment processing',
                metadata: { id: 'payments', name: 'Payments', resourceType: 'domain', summary: 'Payment processing' },
            }),
            new Document({
                pageContent: 'The Shipping domain handles fulfillment and delivery',
                metadata: { id: 'shipping', name: 'Shipping', resourceType: 'domain', summary: 'Fulfillment and delivery' },
            }),
            new Document({
                pageContent: 'The Marketing domain manages promotions and campaigns',
                metadata: { id: 'marketing', name: 'Marketing', resourceType: 'domain', summary: 'Promotions and campaigns' },
            }),
            new Document({
                pageContent: 'The Inventory domain manages stock levels and warehousing',
                metadata: { id: 'inventory', name: 'Inventory', resourceType: 'domain', summary: 'Stock and warehouse management' },
            }),

            // Additional Events
            new Document({
                pageContent: 'MessageType: Event, Markdown: LoyaltyPointsEarned: Customer earned 500 points from order #1234',
                metadata: { source: 'loyalty', eventType: 'LoyaltyPointsEarned', resourceType: 'event', id: 'LoyaltyPointsEarned' },
            }),
            new Document({
                pageContent: 'MessageType: Event, Markdown: ProductPriceUpdated: Price updated for SKU #PRD789 to $279.99',
                metadata: { source: 'catalog', eventType: 'ProductPriceUpdated', resourceType: 'event', id: 'ProductPriceUpdated' },
            }),
            new Document({
                pageContent: 'MessageType: Event, Markdown: EmailBounced: Delivery failed for customer notification email',
                metadata: { source: 'notifications', eventType: 'EmailBounced', resourceType: 'event', id: 'EmailBounced' },
            }),
            new Document({
                pageContent: 'MessageType: Event, Markdown: FraudDetected: Suspicious activity detected on order #1234',
                metadata: { source: 'security', eventType: 'FraudDetected', resourceType: 'event', id: 'FraudDetected' },
            }),

            // Additional Commands
            new Document({
                pageContent: 'MessageType: Command, Markdown: UpdatePrice: Update product price in catalog',
                metadata: { source: 'catalog', eventType: 'UpdatePrice', resourceType: 'command', id: 'UpdatePrice' },
            }),
            new Document({
                pageContent: 'MessageType: Command, Markdown: CancelOrder: Cancel an existing order',
                metadata: { source: 'orders', eventType: 'CancelOrder', resourceType: 'command', id: 'CancelOrder' },
            }),
            new Document({
                pageContent: 'MessageType: Command, Markdown: UpdateShippingAddress: Update shipping address for order',
                metadata: { source: 'shipping', eventType: 'UpdateShippingAddress', resourceType: 'command', id: 'UpdateShippingAddress' },
            }),
            new Document({
                pageContent: 'MessageType: Command, Markdown: GenerateInvoice: Generate invoice for order',
                metadata: { source: 'billing', eventType: 'GenerateInvoice', resourceType: 'command', id: 'GenerateInvoice' },
            }),
            new Document({
                pageContent: 'MessageType: Command, Markdown: SuspendAccount: Suspend user account',
                metadata: { source: 'users', eventType: 'SuspendAccount', resourceType: 'command', id: 'SuspendAccount' },
            }),
            new Document({
                pageContent: 'MessageType: Command, Markdown: AwardLoyaltyPoints: Award loyalty points to customer',
                metadata: { source: 'loyalty', eventType: 'AwardLoyaltyPoints', resourceType: 'command', id: 'AwardLoyaltyPoints' },
            }),
            new Document({
                pageContent: 'MessageType: Command, Markdown: GenerateReport: Generate sales report',
                metadata: { source: 'reporting', eventType: 'GenerateReport', resourceType: 'command', id: 'GenerateReport' },
            }),
            new Document({
                pageContent: 'MessageType: Command, Markdown: ValidateAddress: Validate shipping address',
                metadata: { source: 'shipping', eventType: 'ValidateAddress', resourceType: 'command', id: 'ValidateAddress' },
            }),
            new Document({
                pageContent: 'MessageType: Command, Markdown: ProcessReturn: Process return request',
                metadata: { source: 'returns', eventType: 'ProcessReturn', resourceType: 'command', id: 'ProcessReturn' },
            }),
            new Document({
                pageContent: 'MessageType: Command, Markdown: UpdateUserProfile: Update user profile information',
                metadata: { source: 'users', eventType: 'UpdateUserProfile', resourceType: 'command', id: 'UpdateUserProfile' },
            }),

            // Additional Services
            new Document({
                pageContent: 'The LoyaltyService manages customer loyalty points and rewards.',
                metadata: {
                    id: 'LoyaltyService',
                    sends: [{ id: 'LoyaltyPointsEarned', resourceType: 'event' }],
                    receives: [{ id: 'AwardLoyaltyPoints', resourceType: 'command' }],
                    summary: 'Manages customer loyalty program',
                    resourceType: 'service',
                },
            }),
            new Document({
                pageContent: 'The ReportingService generates business analytics reports.',
                metadata: {
                    id: 'ReportingService',
                    sends: [{ id: 'ReportGenerated', resourceType: 'event' }],
                    receives: [{ id: 'GenerateReport', resourceType: 'command' }],
                    summary: 'Generates business reports and analytics',
                    resourceType: 'service',
                },
            }),
            new Document({
                pageContent: 'The BillingService handles invoicing and billing.',
                metadata: {
                    id: 'BillingService',
                    sends: [{ id: 'InvoiceGenerated', resourceType: 'event' }],
                    receives: [{ id: 'GenerateInvoice', resourceType: 'command' }],
                    summary: 'Manages invoicing and billing',
                    resourceType: 'service',
                },
            }),
            new Document({
                pageContent: 'The SecurityService handles fraud detection and prevention.',
                metadata: {
                    id: 'SecurityService',
                    sends: [{ id: 'FraudDetected', resourceType: 'event' }],
                    receives: [{ id: 'SuspendAccount', resourceType: 'command' }],
                    summary: 'Manages security and fraud prevention',
                    resourceType: 'service',
                },
            }),
            new Document({
                pageContent: 'The ReturnService processes product returns and refunds.',
                metadata: {
                    id: 'ReturnService',
                    sends: [{ id: 'ReturnProcessed', resourceType: 'event' }],
                    receives: [{ id: 'ProcessReturn', resourceType: 'command' }],
                    summary: 'Manages product returns and refunds',
                    resourceType: 'service',
                },
            }),

            // Additional Users
            new Document({
                pageContent: 'Alex is a QA engineer at EventCatalog',
                metadata: { id: 'alee', name: 'Alex', resourceType: 'user' },
            }),
            new Document({
                pageContent: 'Rachel is a product owner at EventCatalog',
                metadata: { id: 'rwhite', name: 'Rachel', resourceType: 'user' },
            }),
            new Document({
                pageContent: 'Tom is a DevOps engineer at EventCatalog',
                metadata: { id: 'tclark', name: 'Tom', resourceType: 'user' },
            }),
            new Document({
                pageContent: 'Lisa is a business analyst at EventCatalog',
                metadata: { id: 'lchen', name: 'Lisa', resourceType: 'user' },
            }),
            new Document({
                pageContent: 'Mark is a security engineer at EventCatalog',
                metadata: { id: 'mwilson', name: 'Mark', resourceType: 'user' },
            }),
            new Document({
                pageContent: 'Anna is a frontend developer at EventCatalog',
                metadata: { id: 'akim', name: 'Anna', resourceType: 'user' },
            }),
            new Document({
                pageContent: 'Chris is a backend developer at EventCatalog',
                metadata: { id: 'cthomas', name: 'Chris', resourceType: 'user' },
            }),
            new Document({
                pageContent: 'Patricia is a data engineer at EventCatalog',
                metadata: { id: 'pgarcia', name: 'Patricia', resourceType: 'user' },
            }),
            new Document({
                pageContent: 'Kevin is a cloud architect at EventCatalog',
                metadata: { id: 'kmiller', name: 'Kevin', resourceType: 'user' },
            }),
            new Document({
                pageContent: 'Sophie is a technical writer at EventCatalog',
                metadata: { id: 'swalker', name: 'Sophie', resourceType: 'user' },
            }),

            // Additional Domains
            new Document({
                pageContent: 'The Analytics domain handles business intelligence and reporting',
                metadata: { id: 'analytics', name: 'Analytics', resourceType: 'domain', summary: 'Business intelligence and reporting' },
            }),
            new Document({
                pageContent: 'The Security domain manages fraud detection and prevention',
                metadata: { id: 'security', name: 'Security', resourceType: 'domain', summary: 'Security and fraud prevention' },
            }),
            new Document({
                pageContent: 'The Loyalty domain handles customer rewards and points',
                metadata: { id: 'loyalty', name: 'Loyalty', resourceType: 'domain', summary: 'Customer loyalty and rewards' },
            }),
        ]);
    }
}