---
sidebar_position: 3
keywords:
- EventCatalog Assistant
- Custom Tools
- AI Tools
- Runtime Data
- Metrics
sidebar_label: Custom Tools
title: Custom Tools
description: Extend EventCatalog Assistant with custom tools to bring real-time data, metrics, and integrations into your architecture conversations
---

import PlanBanner from '@site/src/components/MDX/PlanBanner';
import AddedIn from '@site/src/components/MDX/AddedIn';

<AddedIn version="3.2.0" />

<PlanBanner plan="Scale" />

EventCatalog Assistant comes with built-in tools that allow the AI to search and understand your architecture documentation. But what if you could go beyond static documentation and bring **real-time data** directly into your conversations?

With custom tools, you can extend the assistant to query your production metrics, check service health, look up on-call engineers, fetch data from your databases, and much more.

## Why custom tools?

Your architecture documentation tells part of the story, but the real value often lies in the runtime data:

- **Production metrics** - How many events per second? What's the error rate?
- **Service health** - Is OrderService healthy right now?
- **Queue depths** - Are there any event backlogs building up?
- **On-call information** - Who should I contact about PaymentService?
- **Database queries** - What's the current state of this entity?
- **External APIs** - Enrich answers with data from Datadog, PagerDuty, Jira, etc.

Custom tools transform EventCatalog from a static documentation site into a **live knowledge hub** where developers can ask questions like:

> "Is OrderService healthy and who should I contact if there's an issue?"

And get real answers based on live data.

## How it works

Custom tools are defined in your `eventcatalog.chat.js` file alongside your model configuration. Each tool has:

1. **A description** - Tells the AI when to use this tool
2. **An input schema** - Defines what parameters the tool accepts (using Zod)
3. **An execute function** - The code that runs when the tool is called

The AI automatically decides when to use your tools based on the user's question and the tool descriptions.

## Creating custom tools

### Basic example

Here's a simple tool that returns service health information:

```js title="eventcatalog.chat.js"
import { anthropic } from '@ai-sdk/anthropic';
import { tool } from 'ai';
import { z } from 'zod';

// Export your model
export default async () => {
    return anthropic('claude-haiku-4-5');
}

// Export custom tools
export const tools = {
    getServiceHealth: tool({
        description: 'Get the current health status of a service including uptime and active instances. Use this when users ask if a service is up, healthy, or having issues.',
        inputSchema: z.object({
            serviceName: z.string().describe('The name of the service to check health for'),
        }),
        execute: async ({ serviceName }) => {
            // In production, query your monitoring system (Datadog, Prometheus, etc.)
            const response = await fetch(`https://your-monitoring-api.com/health/${serviceName}`);
            const health = await response.json();

            return {
                serviceName,
                status: health.status,
                uptime: health.uptime,
                instances: health.activeInstances,
                lastIncident: health.lastIncident,
            };
        },
    }),
};
```

### The AI uses tools automatically

Once configured, the AI will automatically use your tools when relevant. If a user asks:

> "Is the OrderService healthy?"

The assistant will:
1. Recognize this is a health-related question
2. Call your `getServiceHealth` tool with `serviceName: "OrderService"`
3. Use the returned data to formulate a helpful response

## Example tools

### Production metrics

Query real-time metrics from your observability platform:

```js
getEventMetrics: tool({
    description: 'Get real-time production metrics for an event including throughput, latency, and error rates. Use this when users ask about event performance, traffic, or production health.',
    inputSchema: z.object({
        eventId: z.string().describe('The event ID to get metrics for'),
        timeRange: z.enum(['1h', '24h', '7d', '30d']).default('24h').describe('Time range for metrics'),
    }),
    execute: async ({ eventId, timeRange }) => {
        // Query Datadog, Prometheus, CloudWatch, etc.
        const metrics = await datadogClient.getMetrics(eventId, timeRange);

        return {
            eventId,
            timeRange,
            throughput: `${metrics.eventsPerSecond.toLocaleString()} events/sec`,
            latency: {
                p50: `${metrics.p50}ms`,
                p99: `${metrics.p99}ms`,
            },
            errorRate: `${metrics.errorRate}%`,
            status: metrics.errorRate > 0.1 ? 'degraded' : 'healthy',
        };
    },
}),
```

### On-call information

Look up who's on-call for a service:

```js
getOnCall: tool({
    description: 'Get the current on-call engineer and escalation contacts for a service. Use this when users ask who to contact, who owns a service, or who is on-call.',
    inputSchema: z.object({
        serviceName: z.string().describe('The name of the service to get on-call info for'),
    }),
    execute: async ({ serviceName }) => {
        // Query PagerDuty, OpsGenie, or your internal system
        const oncall = await pagerdutyClient.getOnCall(serviceName);

        return {
            serviceName,
            team: oncall.team,
            primary: {
                name: oncall.primary.name,
                email: oncall.primary.email,
                slack: oncall.primary.slack,
            },
            secondary: oncall.secondary,
            slackChannel: oncall.slackChannel,
            escalationPolicy: oncall.escalationUrl,
        };
    },
}),
```

### Queue depth and consumer lag

Monitor your message brokers:

```js
getQueueDepth: tool({
    description: 'Get the current queue depth, consumer lag, and processing rate for an event. Use this when users ask about event backlogs, processing delays, or queue health.',
    inputSchema: z.object({
        eventId: z.string().describe('The event ID to check queue depth for'),
        environment: z.enum(['production', 'staging', 'development']).default('production'),
    }),
    execute: async ({ eventId, environment }) => {
        // Query Kafka, RabbitMQ, SQS, etc.
        const queue = await kafkaClient.getConsumerLag(eventId, environment);

        return {
            eventId,
            environment,
            status: queue.lag > 30 ? 'critical' : queue.lag > 5 ? 'warning' : 'healthy',
            queue: {
                depth: queue.depth.toLocaleString(),
                oldestMessage: `${queue.lag.toFixed(1)} seconds ago`,
            },
            consumers: {
                active: queue.consumers,
                processingRate: `${queue.rate.toLocaleString()} events/sec`,
            },
        };
    },
}),
```

### Database queries

Look up entity state from your databases:

```js
getEntityState: tool({
    description: 'Get the current state of an entity from the database. Use this when users ask about the current state of an order, user, or other business entity.',
    inputSchema: z.object({
        entityType: z.enum(['order', 'user', 'product', 'inventory']),
        entityId: z.string().describe('The ID of the entity to look up'),
    }),
    execute: async ({ entityType, entityId }) => {
        // Query your database
        const entity = await db.collection(entityType).findOne({ id: entityId });

        return {
            entityType,
            entityId,
            state: entity.state,
            lastUpdated: entity.updatedAt,
            history: entity.stateHistory?.slice(-5), // Last 5 state changes
        };
    },
}),
```

## Best practices

### Write clear descriptions

The AI uses tool descriptions to decide when to call them. Be specific about:
- What the tool does
- When it should be used
- What kind of questions it answers

```js
// ❌ Vague description
description: 'Gets metrics',

// ✅ Clear description
description: 'Get real-time production metrics for an event including throughput, latency, and error rates. Use this when users ask about event performance, traffic, or production health.',
```

### Return structured data

Return well-structured objects that the AI can easily interpret:

```js
// ❌ Raw data dump
return rawApiResponse;

// ✅ Structured, meaningful data
return {
    serviceName,
    status: health.status,
    statusEmoji: health.status === 'healthy' ? '✅' : '⚠️',
    uptime: `${health.uptime}%`,
    recommendation: health.status !== 'healthy'
        ? 'Consider scaling up instances'
        : 'No action needed',
};
```

### Handle errors gracefully

Always handle potential errors in your tools:

```js
execute: async ({ serviceName }) => {
    try {
        const health = await monitoringApi.getHealth(serviceName);
        return { serviceName, ...health };
    } catch (error) {
        return {
            serviceName,
            error: `Unable to fetch health data: ${error.message}`,
            suggestion: 'Check if the monitoring API is available',
        };
    }
},
```

### Secure your tools

Remember that tools execute server-side. Keep security in mind:

- **Validate inputs** - Don't trust user-provided data
- **Use least privilege** - Only grant tools the permissions they need
- **Protect secrets** - Store API keys in environment variables
- **Rate limit** - Consider adding rate limiting for expensive operations

```js
execute: async ({ serviceName }) => {
    // Validate the service name exists in your catalog
    const validServices = await getServices();
    if (!validServices.includes(serviceName)) {
        return { error: 'Service not found in catalog' };
    }

    // Proceed with the query...
},
```

## Complete example

Here's a complete `eventcatalog.chat.js` with multiple tools:

```js title="eventcatalog.chat.js"
import { anthropic } from '@ai-sdk/anthropic';
import { tool } from 'ai';
import { z } from 'zod';

// Your model configuration
export default async () => {
    return anthropic('claude-haiku-4-5');
}

export const configuration = {
    temperature: 0.7,
    maxTokens: 10000,
}

// Your custom tools
export const tools = {
    getEventMetrics: tool({
        description: 'Get real-time production metrics for an event including throughput, latency, and error rates.',
        inputSchema: z.object({
            eventId: z.string(),
            timeRange: z.enum(['1h', '24h', '7d', '30d']).default('24h'),
        }),
        execute: async ({ eventId, timeRange }) => {
            // Your implementation
        },
    }),

    getServiceHealth: tool({
        description: 'Get the current health status of a service including uptime and active instances.',
        inputSchema: z.object({
            serviceName: z.string(),
        }),
        execute: async ({ serviceName }) => {
            // Your implementation
        },
    }),

    getOnCall: tool({
        description: 'Get the current on-call engineer and escalation contacts for a service.',
        inputSchema: z.object({
            serviceName: z.string(),
        }),
        execute: async ({ serviceName }) => {
            // Your implementation
        },
    }),

    getQueueDepth: tool({
        description: 'Get the current queue depth and consumer lag for an event.',
        inputSchema: z.object({
            eventId: z.string(),
            environment: z.enum(['production', 'staging', 'development']).default('production'),
        }),
        execute: async ({ eventId, environment }) => {
            // Your implementation
        },
    }),
};
```

## Viewing available tools

Users can see all available tools (including custom ones) by clicking the **wrench icon** in the chat panel. Custom tools are labeled with a "Custom" badge to distinguish them from built-in tools.

## What can you build?

The possibilities are endless. Here are some ideas:

- **Cost tracking** - "How much did the OrderCreated event cost to process last month?"
- **Compliance checks** - "Does the PaymentService meet our SLA requirements?"
- **Deployment info** - "When was InventoryService last deployed?"
- **Incident history** - "What incidents has NotificationService had this quarter?"
- **Schema validation** - "Would this schema change break any consumers?"
- **Test coverage** - "What's the test coverage for OrderService?"
- **Documentation gaps** - "Which events are missing descriptions?"

Custom tools turn EventCatalog into your organization's single pane of glass for architecture knowledge—combining static documentation with live operational data.

---

Have questions about custom tools? [Join our Discord community](https://eventcatalog.dev/discord) to share ideas and get help.
