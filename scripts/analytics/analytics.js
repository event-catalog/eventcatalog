import axios from 'axios';
import os from 'os';
import fs from 'fs';
import path from 'path';

async function getVersion() {
  try {
    const pkg = await fs.readFileSync(path.join(process.env.CATALOG_DIR, 'package.json'));
    const parsed = JSON.parse(pkg);
    return parsed.version;
  } catch (error) {
    console.log(error);
    return 'unknown';
  }
}

async function raiseEvent(eventData) {
  const version = await getVersion();

  const url = 'https://queue.simpleanalyticscdn.com/events';
  const userAgent = `@eventcatalog/eventcatalog@${version} (${os.platform()}; ${os.arch()}; Node/${process.version})`;
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
    await axios.post(url, payload, { headers });
  } catch (error) {
    // swallow the error
  }
}

export { raiseEvent };
