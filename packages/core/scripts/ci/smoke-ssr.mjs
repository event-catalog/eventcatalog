#!/usr/bin/env node

import { spawn } from 'node:child_process';
import { once } from 'node:events';
import fs from 'node:fs';
import net from 'node:net';
import path from 'node:path';
import { setTimeout as delay } from 'node:timers/promises';

const projectDirectory = path.resolve(process.argv[2] || 'examples/ssr');
const serverEntry = path.join(projectDirectory, 'dist', 'server', 'entry.mjs');

if (!fs.existsSync(serverEntry)) {
  throw new Error(`SSR server entry was not found at ${serverEntry}`);
}

const getAvailablePort = async () => {
  const server = net.createServer();
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');

  const address = server.address();
  if (!address || typeof address === 'string') {
    server.close();
    throw new Error('Could not allocate a port for the SSR smoke test');
  }

  const { port } = address;
  server.close();
  await once(server, 'close');
  return port;
};

const port = await getAvailablePort();
const server = spawn(process.execPath, [serverEntry], {
  cwd: projectDirectory,
  env: {
    ...process.env,
    HOST: '127.0.0.1',
    PORT: String(port),
  },
  stdio: ['ignore', 'pipe', 'pipe'],
});
const serverExit = once(server, 'exit');

let output = '';
const captureOutput = (chunk) => {
  output = `${output}${chunk}`.slice(-20_000);
};

server.stdout.on('data', captureOutput);
server.stderr.on('data', captureOutput);

const stopServer = async () => {
  if (server.exitCode !== null || server.signalCode !== null) {
    await serverExit;
    return;
  }

  server.kill('SIGTERM');
  const exited = await Promise.race([serverExit.then(() => true), delay(5_000, false, { ref: false })]);

  if (!exited) {
    server.kill('SIGKILL');
    await serverExit;
  }
};

try {
  const deadline = Date.now() + 60_000;
  let lastError;

  while (Date.now() < deadline) {
    if (server.exitCode !== null) {
      throw new Error(`SSR server exited with code ${server.exitCode}\n${output}`);
    }

    try {
      const response = await fetch(`http://127.0.0.1:${port}/`, {
        signal: AbortSignal.timeout(2_000),
      });
      const body = await response.text();

      if (!response.ok) {
        throw new Error(`GET / returned ${response.status}`);
      }
      if (!body.includes('SSR Test Catalog')) {
        throw new Error('GET / did not render the SSR test catalog');
      }

      console.log(`SSR smoke test passed on port ${port}`);
      lastError = undefined;
      break;
    } catch (error) {
      lastError = error;
      await delay(500);
    }
  }

  if (lastError) {
    throw new Error(`SSR server did not become ready: ${lastError.message}\n${output}`);
  }
} finally {
  await stopServer();
}
