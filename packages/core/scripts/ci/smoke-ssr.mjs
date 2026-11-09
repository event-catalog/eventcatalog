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

// A catalog with eventcatalog.auth.js (and auth enabled) signs people in. Node imports the catalog's own files at
// runtime, which on Windows only works by their file:// URL, so these checks fail when they don't load.
const hasAuth = fs.existsSync(path.join(projectDirectory, 'eventcatalog.auth.js'));

// A page's first request loads its code (and Auth.js), which can be slow on a Windows runner: only the readiness
// poll gives up quickly
const get = async (pathname, { timeout = 15_000, ...options } = {}) => {
  const response = await fetch(`http://127.0.0.1:${port}${pathname}`, { signal: AbortSignal.timeout(timeout), ...options });
  return { response, body: await response.text() };
};

const assert = (condition, message) => {
  if (!condition) throw new Error(message);
};

const checkCatalogRenders = async () => {
  const { response, body } = await get('/');
  assert(response.ok, `GET / returned ${response.status}`);
  assert(body.includes('SSR Test Catalog'), 'GET / did not render the SSR test catalog');
};

const checkAuthLoads = async () => {
  const home = await get('/', { redirect: 'manual' });
  const location = home.response.headers.get('location') || '';
  assert(
    home.response.status >= 300 && home.response.status < 400 && location.includes('/auth/login'),
    `GET / should send people to sign in, but returned ${home.response.status}${location ? ` (to ${location})` : ''}`
  );

  // auth.config.ts loaded eventcatalog.auth.js
  const providers = await get('/api/auth/providers');
  assert(providers.response.ok, `GET /api/auth/providers returned ${providers.response.status}`);
  assert(
    'github' in JSON.parse(providers.body),
    `The GitHub provider in eventcatalog.auth.js was not loaded: GET /api/auth/providers returned ${providers.body}`
  );

  // The sign-in page loaded eventcatalog.auth.js, and the catalog's middleware.ts ran
  const login = await get('/auth/login');
  assert(login.response.ok, `GET /auth/login returned ${login.response.status}`);
  assert(
    login.body.includes('Continue with GitHub'),
    'The sign-in page did not offer the GitHub provider in eventcatalog.auth.js'
  );
  assert(
    login.response.headers.get('x-eventcatalog-catalog-middleware') === 'loaded',
    "The catalog's middleware.ts was not loaded"
  );
};

try {
  const deadline = Date.now() + 60_000;
  let lastError;

  // Wait for the server to answer, then check it once
  while (Date.now() < deadline) {
    if (server.exitCode !== null) {
      throw new Error(`SSR server exited with code ${server.exitCode}\n${output}`);
    }

    try {
      await get('/', { redirect: 'manual', timeout: 2_000 });
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

  try {
    await (hasAuth ? checkAuthLoads() : checkCatalogRenders());
  } catch (error) {
    throw new Error(`SSR smoke test failed: ${error.message}\n${output}`);
  }

  console.log(`SSR smoke test passed on port ${port}${hasAuth ? ' (auth files loaded)' : ''}`);
} finally {
  await stopServer();
}
