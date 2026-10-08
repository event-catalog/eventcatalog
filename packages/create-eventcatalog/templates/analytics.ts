import os from 'os';
import pkg from '../package.json';
import { isTelemetryDisabled, TELEMETRY_REQUEST_TIMEOUT_MS } from '../../core/src/analytics/telemetry';

interface EventMetadata {
  command: string;
  org: string;
  cId: string;
  tsd: number;
}

async function raiseEvent(eventData: EventMetadata): Promise<void> {
  if (isTelemetryDisabled(undefined, process.env)) return;

  const url = 'https://queue.simpleanalyticscdn.com/events';
  const userAgent = `@eventcatalog/create-eventcatalog/${pkg.version} (${os.platform()}; ${os.arch()}; Node/${process.version})`;

  const payload = {
    type: 'event',
    hostname: 'eventcatalog.dev',
    event: '@eventcatalog/create-eventcatalog',
    metadata: {
      ...eventData,
      t: `t;${new Date().toISOString()}`,
      ua: userAgent,
    },
    ua: userAgent,
  };

  try {
    await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(TELEMETRY_REQUEST_TIMEOUT_MS),
    });
  } catch (error) {
    // swallow the error
  }
}

// Export the function so it can be used in other parts of the application
export { raiseEvent };
