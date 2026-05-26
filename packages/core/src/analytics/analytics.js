import os from 'os';
import { VERSION } from '../constants';

async function raiseEvent(eventData) {
  const url = 'https://queue.simpleanalyticscdn.com/events';
  const userAgent = `@eventcatalog/eventcatalog@${VERSION} (${os.platform()}; ${os.arch()}; Node/${process.version})`;
  const headers = {
    'Content-Type': 'application/json',
  };

  const payload = {
    type: 'event',
    hostname: 'eventcatalog.dev',
    event: '@eventcatalog/eventcatalog',
    metadata: {
      ...eventData,
      t: `t;${new Date().toISOString()}`,
      ua: userAgent,
    },
    ua: userAgent,
  };

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      throw new Error(`Failed to raise analytics event: ${response.status}`);
    }
  } catch (error) {
    // swallow the error
  }
}

export { raiseEvent };
