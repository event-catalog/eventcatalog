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
    await fetch(url, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  } catch (error) {
    // swallow the error
  }
}

export { raiseEvent };
