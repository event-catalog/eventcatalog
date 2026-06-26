import { tool } from 'ai';
import { z } from 'zod';
import { anthropic } from "@ai-sdk/anthropic";

// Provide your own model to EventCatalog Chat Interface
export default async () => {
    // return anthropic('claude-opus-4-5');
    return anthropic('claude-haiku-4-5');
}

// Provide any model configuration you need.
export const configuration = {
    topP: 0.9,
    topK: 40,
    frequencyPenalty: 0.0,
    presencePenalty: 0.0,
    temperature: 0.7,
    maxTokens: 10000,
}

// provide your own tools to EventCatalog Chat Interface.
export const tools = {
    /**
     * Get real-time production metrics for an event
     * In production, this would query Datadog, Prometheus, CloudWatch, etc.
     */
    getEventMetrics: tool({
        description: 'Get real-time production metrics for an event including throughput, latency, and error rates. Use this when users ask about event performance, traffic, or production health.',
        inputSchema: z.object({
            eventId: z.string().describe('The event ID to get metrics for'),
            timeRange: z.enum(['1h', '24h', '7d', '30d']).default('24h').describe('Time range for metrics'),
        }),
        execute: async ({ eventId, timeRange }) => {
            // Simulate realistic metrics based on event name
            const baseMetrics = {
                'OrderCreated': { throughput: 2847, p50: 12, p99: 89, errorRate: 0.02 },
                'PaymentProcessed': { throughput: 1923, p50: 45, p99: 234, errorRate: 0.15 },
                'UserRegistered': { throughput: 342, p50: 8, p99: 42, errorRate: 0.01 },
                'InventoryUpdated': { throughput: 5621, p50: 5, p99: 28, errorRate: 0.005 },
                'OrderShipped': { throughput: 1456, p50: 15, p99: 67, errorRate: 0.03 },
            };

            // Get metrics or generate random ones for unknown events
            const metrics = baseMetrics[eventId] || {
                throughput: Math.floor(Math.random() * 5000) + 100,
                p50: Math.floor(Math.random() * 50) + 5,
                p99: Math.floor(Math.random() * 200) + 50,
                errorRate: Math.round(Math.random() * 0.5 * 100) / 100,
            };

            // Adjust based on time range
            const multiplier = { '1h': 0.04, '24h': 1, '7d': 7, '30d': 30 }[timeRange];
            const totalEvents = Math.floor(metrics.throughput * 3600 * multiplier);

            return {
                eventId,
                timeRange,
                throughput: `${metrics.throughput.toLocaleString()} events/sec`,
                totalEvents: totalEvents.toLocaleString(),
                latency: {
                    p50: `${metrics.p50}ms`,
                    p95: `${Math.floor(metrics.p99 * 0.7)}ms`,
                    p99: `${metrics.p99}ms`,
                },
                errorRate: `${metrics.errorRate}%`,
                errors: Math.floor(totalEvents * metrics.errorRate / 100).toLocaleString(),
                status: metrics.errorRate > 0.1 ? 'degraded' : 'healthy',
                topConsumers: [
                    { service: 'AnalyticsService', percentage: '34%' },
                    { service: 'NotificationService', percentage: '28%' },
                    { service: 'ReportingService', percentage: '22%' },
                ],
                dataSource: 'Datadog',
                lastUpdated: new Date().toISOString(),
            };
        },
    }),

    /**
     * Get real-time service health and status
     * In production, this would query PagerDuty, Datadog, AWS CloudWatch, etc.
     */
    getServiceHealth: tool({
        description: 'Get the current health status of a service including uptime, active instances, and recent incidents. Use this when users ask if a service is up, healthy, or having issues.',
        inputSchema: z.object({
            serviceName: z.string().describe('The name of the service to check health for'),
        }),
        execute: async ({ serviceName }) => {
            // Simulate realistic health data based on service name
            const serviceHealth = {
                'OrderService': { status: 'healthy', uptime: 99.97, instances: 12, lastIncident: '3 days ago', responseTime: 45 },
                'PaymentService': { status: 'healthy', uptime: 99.99, instances: 8, lastIncident: '2 weeks ago', responseTime: 89 },
                'InventoryService': { status: 'degraded', uptime: 99.85, instances: 6, lastIncident: '2 hours ago', responseTime: 234 },
                'NotificationService': { status: 'healthy', uptime: 99.92, instances: 4, lastIncident: '5 days ago', responseTime: 23 },
                'UserService': { status: 'healthy', uptime: 99.98, instances: 10, lastIncident: '1 week ago', responseTime: 34 },
                'BillingService': { status: 'healthy', uptime: 99.95, instances: 6, lastIncident: '4 days ago', responseTime: 67 },
            };

            const health = serviceHealth[serviceName] || {
                status: Math.random() > 0.85 ? 'degraded' : 'healthy',
                uptime: (99 + Math.random()).toFixed(2),
                instances: Math.floor(Math.random() * 10) + 2,
                lastIncident: `${Math.floor(Math.random() * 14) + 1} days ago`,
                responseTime: Math.floor(Math.random() * 150) + 20,
            };

            const isHealthy = health.status === 'healthy';

            return {
                serviceName,
                status: health.status,
                statusEmoji: isHealthy ? '✅' : '⚠️',
                uptime: {
                    last30Days: `${health.uptime}%`,
                    last7Days: `${(parseFloat(health.uptime) + Math.random() * 0.02).toFixed(2)}%`,
                    last24Hours: isHealthy ? '100%' : '99.2%',
                },
                instances: {
                    active: health.instances,
                    total: health.instances + (isHealthy ? 0 : 2),
                    region: 'us-east-1',
                },
                performance: {
                    avgResponseTime: `${health.responseTime}ms`,
                    p99ResponseTime: `${Math.floor(health.responseTime * 2.5)}ms`,
                    requestsPerSecond: Math.floor(Math.random() * 5000) + 500,
                },
                lastIncident: {
                    when: health.lastIncident,
                    severity: isHealthy ? 'minor' : 'major',
                    resolved: true,
                },
                healthChecks: {
                    endpoint: `/health`,
                    lastCheck: '< 1 minute ago',
                    consecutiveSuccesses: isHealthy ? Math.floor(Math.random() * 1000) + 100 : 0,
                },
                alerts: isHealthy ? [] : [
                    { type: 'warning', message: 'Elevated response times detected', since: '2 hours ago' }
                ],
                dashboardUrl: `https://datadog.com/dashboard/${serviceName.toLowerCase()}`,
            };
        },
    }),

    /**
     * Get on-call information for a service
     * In production, this would query PagerDuty, OpsGenie, or internal systems
     */
    getOnCall: tool({
        description: 'Get the current on-call engineer and escalation contacts for a service. Use this when users ask who to contact, who owns a service, or who is on-call.',
        inputSchema: z.object({
            serviceName: z.string().describe('The name of the service to get on-call info for'),
        }),
        execute: async ({ serviceName }) => {
            // Simulate on-call rotations
            const onCallData = {
                'OrderService': {
                    team: 'Orders Team',
                    primary: { name: 'Sarah Chen', email: 'sarah.chen@company.com', slack: '@sarah.chen' },
                    secondary: { name: 'Mike Johnson', email: 'mike.j@company.com', slack: '@mike.j' },
                    slackChannel: '#orders-team',
                    rotationEnds: 18,
                },
                'PaymentService': {
                    team: 'Payments Team',
                    primary: { name: 'Alex Rivera', email: 'alex.r@company.com', slack: '@alex.r' },
                    secondary: { name: 'Emma Wilson', email: 'emma.w@company.com', slack: '@emma.w' },
                    slackChannel: '#payments-oncall',
                    rotationEnds: 6,
                },
                'InventoryService': {
                    team: 'Warehouse Team',
                    primary: { name: 'James Lee', email: 'james.lee@company.com', slack: '@james.lee' },
                    secondary: { name: 'Nina Patel', email: 'nina.p@company.com', slack: '@nina.p' },
                    slackChannel: '#warehouse-alerts',
                    rotationEnds: 42,
                },
                'NotificationService': {
                    team: 'Platform Team',
                    primary: { name: 'David Kim', email: 'david.k@company.com', slack: '@david.k' },
                    secondary: { name: 'Lisa Wang', email: 'lisa.w@company.com', slack: '@lisa.w' },
                    slackChannel: '#platform-oncall',
                    rotationEnds: 12,
                },
                'BillingService': {
                    team: 'Billing Team',
                    primary: { name: 'Rachel Green', email: 'rachel.g@company.com', slack: '@rachel.g' },
                    secondary: { name: 'Tom Anderson', email: 'tom.a@company.com', slack: '@tom.a' },
                    slackChannel: '#billing-team',
                    rotationEnds: 30,
                },
            };

            const data = onCallData[serviceName] || {
                team: 'Platform Team',
                primary: { name: 'John Doe', email: 'john.doe@company.com', slack: '@john.doe' },
                secondary: { name: 'Jane Smith', email: 'jane.smith@company.com', slack: '@jane.smith' },
                slackChannel: '#platform-oncall',
                rotationEnds: Math.floor(Math.random() * 48) + 1,
            };

            return {
                serviceName,
                team: data.team,
                oncall: {
                    primary: {
                        ...data.primary,
                        role: 'Primary On-Call',
                        available: true,
                    },
                    secondary: {
                        ...data.secondary,
                        role: 'Secondary On-Call',
                        available: true,
                    },
                },
                rotation: {
                    currentShiftEnds: `${data.rotationEnds} hours`,
                    schedule: 'Weekly rotation (Mon 9am)',
                    timezone: 'America/New_York',
                },
                contact: {
                    slackChannel: data.slackChannel,
                    escalationPolicy: 'PagerDuty',
                    pagerDutyService: `https://pagerduty.com/services/${serviceName.toLowerCase()}`,
                },
                quickActions: [
                    { action: 'Page on-call', command: `/pd page ${serviceName}` },
                    { action: 'Join Slack channel', link: `slack://channel?team=T123&id=${data.slackChannel.replace('#', '')}` },
                ],
            };
        },
    }),

    /**
     * Get queue depth and consumer lag for an event
     * In production, this would query Kafka, RabbitMQ, SQS, etc.
     */
    getQueueDepth: tool({
        description: 'Get the current queue depth, consumer lag, and processing rate for an event. Use this when users ask about event backlogs, processing delays, or queue health.',
        inputSchema: z.object({
            eventId: z.string().describe('The event ID to check queue depth for'),
            environment: z.enum(['production', 'staging', 'development']).default('production').describe('The environment to check'),
        }),
        execute: async ({ eventId, environment }) => {
            // Simulate queue metrics based on event
            const queueData = {
                'OrderCreated': { depth: 245, lag: 1.2, rate: 2847, partitions: 12, consumers: 4 },
                'PaymentProcessed': { depth: 12, lag: 0.3, rate: 1923, partitions: 8, consumers: 3 },
                'InventoryUpdated': { depth: 15234, lag: 45.2, rate: 5621, partitions: 24, consumers: 6 },
                'UserRegistered': { depth: 3, lag: 0.1, rate: 342, partitions: 4, consumers: 2 },
                'OrderShipped': { depth: 89, lag: 0.8, rate: 1456, partitions: 6, consumers: 3 },
                'InvoiceGenerated': { depth: 567, lag: 2.1, rate: 892, partitions: 4, consumers: 2 },
            };

            const data = queueData[eventId] || {
                depth: Math.floor(Math.random() * 1000),
                lag: Math.round(Math.random() * 10 * 10) / 10,
                rate: Math.floor(Math.random() * 3000) + 100,
                partitions: Math.floor(Math.random() * 12) + 2,
                consumers: Math.floor(Math.random() * 5) + 1,
            };

            // Adjust for non-production environments
            const envMultiplier = { production: 1, staging: 0.1, development: 0.01 }[environment];
            const adjustedDepth = Math.floor(data.depth * envMultiplier);
            const adjustedRate = Math.floor(data.rate * envMultiplier);

            const isHealthy = data.lag < 5;
            const isWarning = data.lag >= 5 && data.lag < 30;
            const isCritical = data.lag >= 30;

            return {
                eventId,
                environment,
                status: isCritical ? 'critical' : isWarning ? 'warning' : 'healthy',
                statusEmoji: isCritical ? '🔴' : isWarning ? '🟡' : '🟢',
                queue: {
                    depth: adjustedDepth.toLocaleString(),
                    oldestMessage: `${data.lag.toFixed(1)} seconds ago`,
                    broker: 'Kafka',
                    topic: `${eventId.toLowerCase().replace(/([A-Z])/g, '-$1').slice(1)}-events`,
                },
                consumers: {
                    active: data.consumers,
                    totalLag: `${data.lag.toFixed(1)} seconds`,
                    processingRate: `${adjustedRate.toLocaleString()} events/sec`,
                    avgProcessingTime: `${Math.floor(Math.random() * 50) + 10}ms`,
                },
                partitions: {
                    total: data.partitions,
                    healthy: isHealthy ? data.partitions : data.partitions - Math.floor(Math.random() * 3),
                    lagging: isHealthy ? 0 : Math.floor(Math.random() * 3) + 1,
                },
                throughput: {
                    last1Hour: `${(adjustedRate * 3600).toLocaleString()} events`,
                    last24Hours: `${(adjustedRate * 86400).toLocaleString()} events`,
                },
                alerts: isCritical ? [
                    { severity: 'critical', message: 'Consumer lag exceeds 30 seconds', since: '15 minutes ago' },
                    { severity: 'warning', message: 'Queue depth above threshold', since: '20 minutes ago' },
                ] : isWarning ? [
                    { severity: 'warning', message: 'Consumer lag elevated', since: '5 minutes ago' },
                ] : [],
                recommendations: isCritical ? [
                    'Consider scaling up consumer instances',
                    'Check for slow consumer processing',
                    'Review recent deployments for regressions',
                ] : isWarning ? [
                    'Monitor lag closely',
                    'Prepare to scale consumers if lag increases',
                ] : [
                    'Queue is healthy - no action needed',
                ],
            };
        },
    }),
}