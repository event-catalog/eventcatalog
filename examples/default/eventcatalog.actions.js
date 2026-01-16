/**
 * EventCatalog Actions Configuration
 *
 * Define custom actions that can be triggered from your documentation pages.
 * Actions appear in the Actions Console and can execute any backend logic.
 *
 * Use cases:
 * - Send test events to message brokers (Kafka, RabbitMQ, etc.)
 * - Validate schemas against registries
 * - Generate code (TypeScript types, consumers, producers)
 * - Trigger CI/CD pipelines
 * - Export to AsyncAPI/OpenAPI
 * - Integrate with external tools (Slack, Jira, etc.)
 */

export const actions = {
  /**
   * Send a test event to your message broker
   * Great for validating event schemas and testing consumers
   */
  sendTestEvent: {
    label: 'Send Test Event',
    description: 'Publish a sample event to your message broker',
    icon: 'paper-airplane',
    variant: 'primary',
    resultDisplay: 'modal',
    execute: async ({ context }) => {
      // Simulate sending to Kafka/RabbitMQ/etc
      await new Promise((resolve) => setTimeout(resolve, 1200));

      const payload = {
        eventId: `evt_${Date.now()}`,
        eventType: context.resourceId,
        version: context.resourceVersion,
        timestamp: new Date().toISOString(),
        source: 'eventcatalog-actions',
        data: {
          orderId: 'ORD-12345',
          customerId: 'CUST-67890',
          amount: 149.99,
          currency: 'USD',
        },
      };

      return {
        success: true,
        message: `Test event published to topic: ${context.resourceId.toLowerCase().replace(/\s+/g, '-')}`,
        data: {
          broker: 'kafka-prod-cluster',
          topic: context.resourceId.toLowerCase().replace(/\s+/g, '-'),
          partition: 0,
          offset: Math.floor(Math.random() * 10000),
          payload,
        },
      };
    },
  },

  /**
   * Validate event schema against your schema registry
   */
  validateSchema: {
    label: 'Validate Schema',
    description: 'Check schema compatibility with your registry',
    icon: 'check',
    variant: 'secondary',
    resultDisplay: 'modal',
    execute: async ({ context }) => {
      await new Promise((resolve) => setTimeout(resolve, 800));

      return {
        success: true,
        message: 'Schema validation passed',
        data: {
          schemaId: context.resourceId,
          version: context.resourceVersion,
          compatibility: 'BACKWARD_COMPATIBLE',
          registeredVersions: ['0.0.1', '0.0.2'],
          validationResults: {
            syntaxValid: true,
            backwardCompatible: true,
            forwardCompatible: true,
            fullCompatible: false,
          },
          registry: 'confluent-schema-registry',
        },
      };
    },
  },

  /**
   * Generate TypeScript types from the event schema
   */
  generateTypes: {
    label: 'Generate Types',
    description: 'Create TypeScript interfaces from schema',
    icon: 'command-line',
    variant: 'secondary',
    resultDisplay: 'modal',
    execute: async ({ context }) => {
      await new Promise((resolve) => setTimeout(resolve, 600));

      const typeName = context.resourceId.replace(/[^a-zA-Z0-9]/g, '');

      return {
        success: true,
        message: 'TypeScript types generated successfully',
        data: {
          filename: `${context.resourceId}.types.ts`,
          types: `export interface ${typeName}Event {
  eventId: string;
  eventType: '${context.resourceId}';
  version: '${context.resourceVersion}';
  timestamp: string;
  source: string;
  data: ${typeName}Data;
}

export interface ${typeName}Data {
  orderId: string;
  customerId: string;
  amount: number;
  currency: string;
  status: 'pending' | 'completed' | 'failed';
}`,
        },
      };
    },
  },

  /**
   * View recent events from the broker
   */
  viewRecentEvents: {
    label: 'View Recent Events',
    description: 'Fetch latest events from the message broker',
    icon: 'cursor-arrow-rays',
    variant: 'secondary',
    resultDisplay: 'modal',
    execute: async ({ context }) => {
      await new Promise((resolve) => setTimeout(resolve, 900));

      const events = Array.from({ length: 5 }, (_, i) => ({
        offset: 10000 - i,
        timestamp: new Date(Date.now() - i * 60000).toISOString(),
        key: `order-${1000 + i}`,
        size: Math.floor(Math.random() * 500) + 100,
      }));

      return {
        success: true,
        message: `Found 5 recent events for ${context.resourceId}`,
        data: {
          topic: context.resourceId.toLowerCase().replace(/\s+/g, '-'),
          partition: 0,
          events,
          totalCount: 15420,
          consumerGroups: ['payment-processor', 'analytics-service', 'notification-service'],
        },
      };
    },
  },

  /**
   * Trigger CI/CD pipeline for schema deployment
   */
  triggerPipeline: {
    label: 'Deploy Schema',
    description: 'Trigger CI pipeline to deploy schema changes',
    icon: 'rocket-launch',
    variant: 'primary',
    resultDisplay: 'modal',
    execute: async ({ context }) => {
      await new Promise((resolve) => setTimeout(resolve, 1500));

      const pipelineId = `run-${Date.now()}`;

      return {
        success: true,
        message: 'CI/CD pipeline triggered successfully',
        data: {
          pipelineId,
          status: 'running',
          stages: [
            { name: 'Validate Schema', status: 'completed', duration: '12s' },
            { name: 'Run Compatibility Check', status: 'completed', duration: '8s' },
            { name: 'Deploy to Dev', status: 'running', duration: null },
            { name: 'Integration Tests', status: 'pending', duration: null },
            { name: 'Deploy to Prod', status: 'pending', duration: null },
          ],
          triggeredBy: 'eventcatalog-action',
          estimatedDuration: '~5 minutes',
          pipelineUrl: `https://github.com/org/repo/actions/runs/${pipelineId}`,
        },
      };
    },
  },

  /**
   * Export event to AsyncAPI specification
   */
  exportAsyncAPI: {
    label: 'Export AsyncAPI',
    description: 'Generate AsyncAPI specification for this event',
    icon: 'cloud-arrow-up',
    variant: 'secondary',
    resultDisplay: 'modal',
    execute: async ({ context }) => {
      await new Promise((resolve) => setTimeout(resolve, 700));

      return {
        success: true,
        message: 'AsyncAPI specification generated',
        data: {
          format: 'yaml',
          asyncApiVersion: '3.0.0',
          preview: `asyncapi: 3.0.0
info:
  title: ${context.resourceId}
  version: ${context.resourceVersion}
channels:
  ${context.resourceId.toLowerCase().replace(/\s+/g, '-')}:
    address: ${context.resourceId.toLowerCase().replace(/\s+/g, '-')}
    messages:
      ${context.resourceId}:
        $ref: '#/components/messages/${context.resourceId}'
components:
  messages:
    ${context.resourceId}:
      payload:
        type: object
        properties:
          eventId:
            type: string
          timestamp:
            type: string
            format: date-time`,
        },
      };
    },
  },

  /**
   * Send notification to Slack channel
   */
  notifyTeam: {
    label: 'Notify Team',
    description: 'Send update to the team Slack channel',
    icon: 'bell',
    variant: 'secondary',
    resultDisplay: 'toast',
    execute: async ({ context }) => {
      await new Promise((resolve) => setTimeout(resolve, 500));

      return {
        success: true,
        message: 'Team notified via Slack',
        data: {
          channel: '#event-updates',
          messagePreview: `Event "${context.resourceId}" (v${context.resourceVersion}) was reviewed`,
        },
      };
    },
  },

  /**
   * Generate consumer code template
   */
  generateConsumer: {
    label: 'Generate Consumer',
    description: 'Create a consumer code template for this event',
    icon: 'cog',
    variant: 'secondary',
    resultDisplay: 'modal',
    execute: async ({ context }) => {
      await new Promise((resolve) => setTimeout(resolve, 800));

      const eventName = context.resourceId.replace(/[^a-zA-Z0-9]/g, '');

      return {
        success: true,
        message: 'Consumer template generated',
        data: {
          language: 'TypeScript',
          framework: 'Node.js + KafkaJS',
          filename: `${eventName.toLowerCase()}-consumer.ts`,
          code: `import { Kafka } from 'kafkajs';

const kafka = new Kafka({
  clientId: '${eventName.toLowerCase()}-consumer',
  brokers: [process.env.KAFKA_BROKERS || 'localhost:9092'],
});

const consumer = kafka.consumer({ groupId: '${eventName.toLowerCase()}-group' });

async function start() {
  await consumer.connect();
  await consumer.subscribe({ topic: '${context.resourceId.toLowerCase().replace(/\s+/g, '-')}' });

  await consumer.run({
    eachMessage: async ({ message }) => {
      const event = JSON.parse(message.value?.toString() || '{}');
      console.log('Received ${eventName}:', event);
      // TODO: Add your business logic here
    },
  });
}

start().catch(console.error);`,
        },
      };
    },
  },

  /**
   * Check health of related services
   */
  healthCheck: {
    label: 'Health Check',
    description: 'Check status of producers and consumers',
    icon: 'beaker',
    variant: 'secondary',
    resultDisplay: 'modal',
    execute: async ({ context }) => {
      await new Promise((resolve) => setTimeout(resolve, 1000));

      return {
        success: true,
        message: 'All services healthy',
        data: {
          event: context.resourceId,
          checkedAt: new Date().toISOString(),
          services: [
            { name: 'PaymentService', role: 'producer', status: 'healthy', latency: '12ms' },
            { name: 'OrderService', role: 'consumer', status: 'healthy', latency: '8ms' },
            { name: 'NotificationService', role: 'consumer', status: 'healthy', latency: '15ms' },
            { name: 'AnalyticsService', role: 'consumer', status: 'degraded', latency: '245ms' },
          ],
          broker: { status: 'healthy', partitions: 3, replicationFactor: 2 },
        },
      };
    },
  },
};

/**
 * Visibility configuration - control which actions appear on which pages
 */
export const visibility = {
  sendTestEvent: { collections: ['events', 'commands'] },
  validateSchema: { collections: ['events', 'commands', 'queries'] },
  generateTypes: { collections: '*' },
  viewRecentEvents: { collections: ['events'] },
  triggerPipeline: { collections: ['events', 'commands', 'services'] },
  exportAsyncAPI: { collections: ['events', 'commands', 'queries', 'services'] },
  notifyTeam: { collections: '*' },
  generateConsumer: { collections: ['events', 'commands'] },
  healthCheck: { collections: ['events', 'services'] },
};
