/**
 * Mock data for catalog-tools tests
 * Follows the Astro content collection structure
 */

// ============================================
// Mock Events
// ============================================
export const mockEvents = [
  {
    id: 'OrderCreated-1.0.0',
    slug: 'events/OrderCreated',
    collection: 'events',
    body: 'Order created event description',
    data: {
      id: 'OrderCreated',
      name: 'Order Created',
      version: '1.0.0',
      summary: 'Fired when an order is created',
      owners: ['order-team', { id: 'user-jane' }],
    },
  },
  {
    id: 'OrderCreated-2.0.0',
    slug: 'events/OrderCreated',
    collection: 'events',
    body: 'Order created event v2 description',
    data: {
      id: 'OrderCreated',
      name: 'Order Created V2',
      version: '2.0.0',
      summary: 'Updated order created event',
      owners: ['order-team'],
    },
  },
  {
    id: 'PaymentProcessed-1.0.0',
    slug: 'events/PaymentProcessed',
    collection: 'events',
    body: 'Payment processed event description',
    data: {
      id: 'PaymentProcessed',
      name: 'Payment Processed',
      version: '1.0.0',
      summary: 'Fired when a payment is processed',
      owners: ['payment-team'],
    },
  },
  {
    id: 'InventoryUpdated-1.0.0',
    slug: 'events/InventoryUpdated',
    collection: 'events',
    body: 'Inventory updated event description',
    data: {
      id: 'InventoryUpdated',
      name: 'Inventory Updated',
      version: '1.0.0',
      summary: 'Fired when inventory is updated',
      owners: [{ id: 'inventory-team' }],
    },
  },
];

// ============================================
// Mock Services
// ============================================
export const mockServices = [
  {
    id: 'OrderService-1.0.0',
    slug: 'services/OrderService',
    collection: 'services',
    body: 'Order service description',
    data: {
      id: 'OrderService',
      name: 'Order Service',
      version: '1.0.0',
      summary: 'Handles order processing',
      owners: ['order-team'],
      sends: [{ id: 'OrderCreated', version: '1.0.0' }],
      receives: [{ id: 'PaymentProcessed', version: '1.0.0' }],
      flows: [{ id: 'OrderFlow' }],
    },
  },
  {
    id: 'PaymentService-1.0.0',
    slug: 'services/PaymentService',
    collection: 'services',
    body: 'Payment service description',
    data: {
      id: 'PaymentService',
      name: 'Payment Service',
      version: '1.0.0',
      summary: 'Handles payment processing',
      owners: ['payment-team', { id: 'user-bob' }],
      sends: [{ id: 'PaymentProcessed', version: 'latest' }],
      receives: [{ id: 'OrderCreated' }], // No version = all versions
    },
  },
  {
    id: 'InventoryService-1.0.0',
    slug: 'services/InventoryService',
    collection: 'services',
    body: 'Inventory service description',
    data: {
      id: 'InventoryService',
      name: 'Inventory Service',
      version: '1.0.0',
      summary: 'Handles inventory management',
      owners: [{ id: 'inventory-team' }],
      sends: [{ id: 'InventoryUpdated', version: '1.0.0' }],
      receives: [{ id: 'OrderCreated', version: '1.0.0' }],
    },
  },
  {
    id: 'NotificationService-1.0.0',
    slug: 'services/NotificationService',
    collection: 'services',
    body: 'Notification service description',
    data: {
      id: 'NotificationService',
      name: 'Notification Service',
      version: '1.0.0',
      summary: 'Sends notifications',
      owners: [],
      receives: [{ id: 'OrderCreated', version: '2.0.0' }],
    },
  },
];

// ============================================
// Mock Commands
// ============================================
export const mockCommands = [
  {
    id: 'CreateOrder-1.0.0',
    slug: 'commands/CreateOrder',
    collection: 'commands',
    body: 'Create order command description',
    data: {
      id: 'CreateOrder',
      name: 'Create Order',
      version: '1.0.0',
      summary: 'Command to create an order',
      owners: ['order-team'],
    },
  },
];

// ============================================
// Mock Queries
// ============================================
export const mockQueries = [
  {
    id: 'GetOrder-1.0.0',
    slug: 'queries/GetOrder',
    collection: 'queries',
    body: 'Get order query description',
    data: {
      id: 'GetOrder',
      name: 'Get Order',
      version: '1.0.0',
      summary: 'Query to get an order',
      owners: ['order-team'],
    },
  },
];

// ============================================
// Mock Flows
// ============================================
export const mockFlows = [
  {
    id: 'OrderFlow-1.0.0',
    slug: 'flows/OrderFlow',
    collection: 'flows',
    body: '# Order Processing Flow\n\nDetailed flow description in markdown.',
    data: {
      id: 'OrderFlow',
      name: 'Order Processing Flow',
      version: '1.0.0',
      summary: 'End-to-end order processing workflow',
      owners: ['order-team'],
      steps: [
        { id: 1, title: 'Order Placed', next_step: 2 },
        { id: 2, title: 'Payment Processing', message: { id: 'PaymentProcessed', version: '1.0.0' }, next_step: 3 },
        { id: 3, title: 'Order Confirmed' },
      ],
      mermaid: 'graph TD; A[Order Placed]-->B[Payment Processing]; B-->C[Order Confirmed];',
    },
  },
  {
    id: 'PaymentFlow-1.0.0',
    slug: 'flows/PaymentFlow',
    collection: 'flows',
    body: 'Payment flow description',
    data: {
      id: 'PaymentFlow',
      name: 'Payment Flow',
      version: '1.0.0',
      summary: 'Payment processing workflow',
      owners: ['payment-team'],
      steps: [],
    },
  },
];

// ============================================
// Mock Domains
// ============================================
export const mockDomains = [
  {
    id: 'OrderDomain-1.0.0',
    slug: 'domains/OrderDomain',
    collection: 'domains',
    body: 'Order domain description',
    data: {
      id: 'OrderDomain',
      name: 'Order Domain',
      version: '1.0.0',
      summary: 'Order management domain',
      owners: ['order-team'],
    },
  },
];

// ============================================
// Mock Channels
// ============================================
export const mockChannels = [
  {
    id: 'OrderChannel-1.0.0',
    slug: 'channels/OrderChannel',
    collection: 'channels',
    body: 'Order channel description',
    data: {
      id: 'OrderChannel',
      name: 'Order Channel',
      version: '1.0.0',
      summary: 'Channel for order events',
      owners: ['order-team'],
    },
  },
];

// ============================================
// Mock Entities
// ============================================
export const mockEntities = [
  {
    id: 'Order-1.0.0',
    slug: 'entities/Order',
    collection: 'entities',
    body: 'Order entity description',
    data: {
      id: 'Order',
      name: 'Order',
      version: '1.0.0',
      summary: 'Order entity',
      owners: ['order-team'],
    },
  },
];

// ============================================
// Mock Teams
// ============================================
export const mockTeams = [
  {
    id: 'order-team',
    slug: 'teams/order-team',
    collection: 'teams',
    body: 'The order team handles all order-related services.',
    data: {
      id: 'order-team',
      name: 'Order Team',
      email: 'order-team@company.com',
      slackDirectMessageUrl: 'https://slack.com/dm/order-team',
      members: ['user-jane', 'user-john'],
      summary: 'Handles order processing',
    },
  },
  {
    id: 'payment-team',
    slug: 'teams/payment-team',
    collection: 'teams',
    body: 'The payment team handles all payment-related services.',
    data: {
      id: 'payment-team',
      name: 'Payment Team',
      email: 'payment-team@company.com',
      slackDirectMessageUrl: 'https://slack.com/dm/payment-team',
      members: ['user-bob'],
      summary: 'Handles payment processing',
    },
  },
  {
    id: 'inventory-team',
    slug: 'teams/inventory-team',
    collection: 'teams',
    body: 'The inventory team handles all inventory-related services.',
    data: {
      id: 'inventory-team',
      name: 'Inventory Team',
      email: 'inventory-team@company.com',
      members: [],
      summary: 'Handles inventory management',
    },
  },
];

// ============================================
// Mock Users
// ============================================
export const mockUsers = [
  {
    id: 'user-jane',
    slug: 'users/user-jane',
    collection: 'users',
    body: 'Jane is the lead engineer on the order team.',
    data: {
      id: 'user-jane',
      name: 'Jane Doe',
      email: 'jane@company.com',
      role: 'Lead Engineer',
      slackDirectMessageUrl: 'https://slack.com/dm/jane',
      summary: 'Lead engineer on order team',
    },
  },
  {
    id: 'user-john',
    slug: 'users/user-john',
    collection: 'users',
    body: 'John is a senior engineer on the order team.',
    data: {
      id: 'user-john',
      name: 'John Smith',
      email: 'john@company.com',
      role: 'Senior Engineer',
      slackDirectMessageUrl: 'https://slack.com/dm/john',
      summary: 'Senior engineer on order team',
    },
  },
  {
    id: 'user-bob',
    slug: 'users/user-bob',
    collection: 'users',
    body: 'Bob is the lead engineer on the payment team.',
    data: {
      id: 'user-bob',
      name: 'Bob Johnson',
      email: 'bob@company.com',
      role: 'Lead Engineer',
      summary: 'Lead engineer on payment team',
    },
  },
];

// ============================================
// Mock Containers (for completeness)
// ============================================
export const mockContainers = [
  {
    id: 'OrderDatabase-1.0.0',
    slug: 'containers/OrderDatabase',
    collection: 'containers',
    body: 'Order database description',
    data: {
      id: 'OrderDatabase',
      name: 'Order Database',
      version: '1.0.0',
      summary: 'Order data storage',
    },
  },
];

// ============================================
// Mock Diagrams (for completeness)
// ============================================
export const mockDiagrams = [
  {
    id: 'SystemOverview-1.0.0',
    slug: 'diagrams/SystemOverview',
    collection: 'diagrams',
    body: 'System overview diagram',
    data: {
      id: 'SystemOverview',
      name: 'System Overview',
      version: '1.0.0',
      summary: 'High-level system diagram',
    },
  },
];

// ============================================
// Helper to get all mocks by collection
// ============================================
export const mockCollections: Record<string, any[]> = {
  events: mockEvents,
  services: mockServices,
  commands: mockCommands,
  queries: mockQueries,
  flows: mockFlows,
  domains: mockDomains,
  channels: mockChannels,
  entities: mockEntities,
  containers: mockContainers,
  diagrams: mockDiagrams,
  teams: mockTeams,
  users: mockUsers,
};
