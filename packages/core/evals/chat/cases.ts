/**
 * Questions for the assistant about the example catalog (examples/default), and what a good answer must contain.
 * Answers are checked against the catalog, not graded by a model: when the example catalog changes, update these.
 */

/** A resource the answer must mention, as `collection/id` (e.g. `events/order-created`). Its link, id or name counts. */
type ResourceExpectation = { resource: string };
/** Text the answer must contain */
type TextExpectation = { text: RegExp; label: string };
export type Expectation = ResourceExpectation | TextExpectation;

export type EvalCase = {
  id: string;
  /** What it's about, to compare runs by area (e.g. whether a new tool helped the questions it's for). Default "core" */
  group?: string;
  /** What it checks, shown in the report */
  description: string;
  /** The conversation so far, ending with the question */
  messages: { role: 'user' | 'assistant'; text: string }[];
  /** The page the user asks from, e.g. /docs/services/order-service/1.0.0 */
  page?: string;
  expect?: Expectation[];
  /** Share of `expect` the answer must contain (default 1: all of it) */
  minRecall?: number;
  /**
   * Whether a Mermaid diagram helps here: `expected` (relationships, e.g. who produces and consumes a message, fails without
   * one) or `unneeded` (e.g. a definition or a schema: one is counted as a waste of output tokens, not a failure)
   */
  diagram?: 'expected' | 'unneeded';
};

const resources = (...ids: string[]): ResourceExpectation[] => ids.map((resource) => ({ resource }));

const ORDER_MANAGEMENT_MESSAGES = resources(
  'events/order-created',
  'events/order-confirmed',
  'events/order-amended',
  'events/order-placed-on-hold',
  'events/order-hold-released',
  'events/order-fulfilment-started',
  'events/order-status-changed',
  'events/order-delivery-address-changed',
  'events/order-archived',
  'events/order-completed',
  'events/order-cancelled',
  'commands/create-order',
  'commands/cancel-order',
  'queries/get-order',
  'events/order-packed'
);

export const cases: EvalCase[] = [
  {
    id: 'system-messages',
    description: 'Lists every message a system sends and receives',
    messages: [{ role: 'user', text: 'I want to get message list about Order Management system' }],
    expect: ORDER_MANAGEMENT_MESSAGES,
  },
  {
    id: 'system-by-short-id',
    description: 'Finds a system from a short id the user typed after being asked which system (the reported GPT-5 bug)',
    messages: [
      { role: 'user', text: 'I want to get message list about OMS system' },
      {
        role: 'assistant',
        text: 'Happy to help. Which system do you mean? Please share the system ID and version (or the docs URL), and whether you want just names or producers/consumers, channels and schemas too.',
      },
      { role: 'user', text: 'System ID : OMS' },
    ],
    expect: ORDER_MANAGEMENT_MESSAGES,
  },
  {
    id: 'system-by-acronym',
    description: 'Finds a system from its acronym',
    messages: [{ role: 'user', text: 'What messages does PPS send and receive?' }],
    expect: resources(
      'events/payment-requested',
      'events/refund-requested',
      'commands/authorize-payment',
      'events/payment-succeeded',
      'events/payment-failed',
      'events/return-received'
    ),
  },
  {
    id: 'domain-messages',
    description: 'Lists what a whole domain sends and receives, across its systems',
    messages: [
      {
        role: 'user',
        text: 'List every message the Payments domain sends and receives, with the producers and consumers of each message',
      },
    ],
    expect: resources(
      'events/payment-requested',
      'events/refund-requested',
      'events/payment-succeeded',
      'events/payment-failed',
      'events/refund-processed',
      'events/fraud-check-passed',
      'events/fraud-check-failed',
      'commands/authorize-payment',
      'events/return-received'
    ),
  },
  {
    id: 'message-consumers',
    diagram: 'expected',
    description: 'Names every consumer of an event, including a domain',
    messages: [{ role: 'user', text: 'Who consumes the Order Confirmed event?' }],
    expect: resources('services/notification-service', 'services/offer-service', 'domains/marketing'),
  },
  {
    id: 'message-consumers-plain-words',
    diagram: 'expected',
    description: 'Answers a question that names the event in plain words',
    messages: [{ role: 'user', text: 'Which services react when a payment fails?' }],
    expect: resources('services/notification-service', 'services/payment-worker'),
  },
  {
    id: 'message-producer-code-name',
    diagram: 'expected',
    description: 'Finds an event from its code-style name',
    messages: [{ role: 'user', text: 'Who publishes PaymentSucceeded?' }],
    expect: resources('services/stripe-webhook-endpoint'),
  },
  {
    id: 'no-consumers',
    diagram: 'unneeded',
    description: 'Says when the catalog documents no consumers, rather than inventing some',
    messages: [{ role: 'user', text: 'Which services consume the Order Created event?' }],
    expect: [
      {
        label: 'says it has no documented consumers',
        text: /\b(no|none|not any|zero)\b[^.]{0,80}\bconsum|\bconsum[^.]{0,80}\b(no|none|not|isn't|aren't)\b/i,
      },
    ],
  },
  {
    id: 'page-context',
    description: 'Uses the page the user is on to know what "this" is',
    page: '/docs/services/order-service/1.0.0',
    messages: [{ role: 'user', text: 'What does this service receive?' }],
    expect: resources('commands/create-order', 'commands/cancel-order', 'queries/get-order', 'events/order-packed'),
  },
  {
    id: 'schema-fields',
    diagram: 'unneeded',
    description: "Reads a message's schema",
    messages: [{ role: 'user', text: 'What fields does the Get Order query return?' }],
    expect: ['createdAt', 'currency', 'customerId', 'items', 'orderId', 'status', 'total'].map((field) => ({
      label: field,
      text: new RegExp(`\\b${field}\\b`),
    })),
  },
  {
    id: 'custom-docs',
    diagram: 'unneeded',
    description: 'Answers from the custom documentation (the change management guide)',
    messages: [{ role: 'user', text: 'What should I do before changing an event contract?' }],
    expect: [
      { label: 'check whether the change is compatible (additive or breaking)', text: /compatib|breaking|additive/i },
      { label: 'identify the producer and consumers', text: /producer/i },
      { label: 'coordinate rollout with consumer owners', text: /(coordinat|rollout|roll out)/i },
    ],
  },
  {
    id: 'not-in-catalog',
    diagram: 'unneeded',
    description: "Says when something isn't in the catalog, rather than inventing it",
    messages: [{ role: 'user', text: 'What messages does the Billing Gateway system send?' }],
    expect: [
      {
        label: "says it couldn't find it",
        text: /(couldn'?t|could not|can'?t|cannot|unable to|didn'?t|did not|don'?t|do not)\s+(find|see|locate|have)|not\s+(in|found|documented|part of)|no\s+(system|resource|match)|there(?:'s| is) no\b|doesn'?t\s+(exist|appear)/i,
      },
    ],
  },
  {
    id: 'many-lookups',
    description: 'Answers a question that needs more lookups than it is allowed (it must still answer)',
    messages: [{ role: 'user', text: 'For every service in the catalog, list what it sends and receives.' }],
    expect: resources(
      'services/order-service',
      'services/payment-worker',
      'services/inventory-service',
      'services/cart-api',
      'services/stripe-webhook-endpoint'
    ),
    minRecall: 0.6,
  },

  {
    id: 'team-contact',
    diagram: 'unneeded',
    group: 'ownership',
    description: 'Says who owns a service and how to reach them',
    messages: [{ role: 'user', text: 'Who owns the Payment API, and how do I contact them?' }],
    expect: [
      { resource: 'teams/payments-platform' },
      { label: 'their email or Slack', text: /payments-platform@acme\.test|acme\.slack\.com\/channels\/payments-platform/i },
    ],
  },
  {
    id: 'team-owns',
    group: 'ownership',
    description: 'Lists what a team owns',
    messages: [{ role: 'user', text: 'Which services does the Payments Platform team own?' }],
    expect: resources(
      'services/fraud-api',
      'services/ledger-exporter',
      'services/payment-api',
      'services/payment-worker',
      'services/stripe-payments-api',
      'services/stripe-webhook-endpoint'
    ),
  },
  {
    id: 'change-impact-teams',
    diagram: 'expected',
    group: 'impact',
    description: 'Names the teams a change to an event affects',
    messages: [{ role: 'user', text: 'If I change the Order Confirmed event, which teams do I need to talk to?' }],
    // The teams that own its consumers (the producer's own team is the one asking)
    expect: resources('teams/customer-platform', 'teams/shopping-platform'),
  },
  {
    id: 'change-impact-break',
    diagram: 'expected',
    group: 'impact',
    description: 'Says what a change to a command would affect, and who owns it',
    messages: [{ role: 'user', text: 'What would break if I changed the Create Order command?' }],
    expect: resources('services/order-service', 'services/checkout-orchestrator', 'teams/ordering-platform'),
  },
  {
    id: 'flow-steps',
    diagram: 'expected',
    group: 'flows',
    description: 'Walks through a business flow, including what happens when a step fails',
    messages: [{ role: 'user', text: 'Walk me through the checkout saga step by step' }],
    expect: [
      ...resources('commands/reserve-inventory', 'commands/authorize-payment', 'commands/create-order'),
      { label: 'what happens when a step fails (compensation)', text: /compensat|undo|undone|roll(ed)?[ -]?back/i },
    ],
  },
  {
    id: 'flow-from-question',
    diagram: 'expected',
    group: 'flows',
    description: 'Finds and explains the flow behind a plain question',
    messages: [{ role: 'user', text: 'How does an order get cancelled?' }],
    expect: [
      ...resources('commands/cancel-order', 'events/order-cancelled', 'services/order-service'),
      { label: 'when an order cannot be cancelled', text: /polic|reject|can(not|'t)\s+(be\s+)?cancel|only[^.]{0,80}cancel/i },
    ],
  },
  {
    id: 'term-meaning',
    diagram: 'unneeded',
    group: 'terms',
    description: "Explains a domain term as the domain defines it (the catalog's values, not general knowledge)",
    messages: [{ role: 'user', text: 'In the Ordering domain, what does Order Status mean and what values can it have?' }],
    // In capitals as the catalog writes them: "created" or "Order Created" alone would match any answer
    expect: ['CREATED', 'COMPLETED', 'CANCELLED'].map((value) => ({ label: value, text: new RegExp(`\\b${value}\\b`) })),
  },
  {
    id: 'terms-list',
    diagram: 'unneeded',
    group: 'terms',
    description: "Lists a domain's business terms",
    messages: [{ role: 'user', text: 'What are the key business terms in the Ordering domain?' }],
    expect: ['Saga', 'Reservation', 'Authorization', 'Order Item', 'Order Status'].map((term) => ({
      label: term,
      text: new RegExp(term, 'i'),
    })),
    minRecall: 0.8,
  },
];
