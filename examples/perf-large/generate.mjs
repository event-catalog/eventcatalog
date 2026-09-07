#!/usr/bin/env node
/**
 * Generate a large synthetic EventCatalog used to measure build time and HTML payload size.
 *
 * Usage:
 *   node examples/perf-large/generate.mjs
 *   node examples/perf-large/generate.mjs --domains 8 --services 8 --events 10
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const args = process.argv.slice(2);
const getArg = (name, fallback) => {
  const index = args.indexOf(`--${name}`);
  if (index === -1) return fallback;
  return Number(args[index + 1]);
};

const DOMAIN_COUNT = getArg('domains', 8);
const SERVICES_PER_DOMAIN = getArg('services', 8);
const EVENTS_PER_SERVICE = getArg('events', 10);

const GENERATED_MARKER = '<!-- generated-by: examples/perf-large/generate.mjs -->';

const rmGeneratedTrees = () => {
  for (const dir of ['domains', 'users', 'teams']) {
    const target = path.join(__dirname, dir);
    if (fs.existsSync(target)) {
      fs.rmSync(target, { recursive: true, force: true });
    }
  }
};

const writeFile = (relativePath, contents) => {
  const absolute = path.join(__dirname, relativePath);
  fs.mkdirSync(path.dirname(absolute), { recursive: true });
  fs.writeFileSync(absolute, contents);
};

const schemaForEvent = (eventId) =>
  JSON.stringify(
    {
      $schema: 'http://json-schema.org/draft-07/schema#',
      $id: `https://eventcatalog.dev/schemas/${eventId}.json`,
      title: eventId,
      type: 'object',
      additionalProperties: false,
      required: ['eventId', 'occurredAt', 'payload'],
      properties: {
        eventId: { type: 'string', format: 'uuid' },
        occurredAt: { type: 'string', format: 'date-time' },
        payload: {
          type: 'object',
          required: ['resourceId', 'status'],
          properties: {
            resourceId: { type: 'string' },
            status: { type: 'string', enum: ['pending', 'applied', 'failed'] },
            metadata: {
              type: 'object',
              properties: {
                source: { type: 'string' },
                attempt: { type: 'integer', minimum: 0 },
              },
            },
          },
        },
      },
    },
    null,
    2
  );

const domainId = (d) => `domain-${String(d).padStart(2, '0')}`;
const serviceId = (d, s) => `svc-${String(d).padStart(2, '0')}-${String(s).padStart(2, '0')}`;
const eventId = (d, s, e) => `evt-${String(d).padStart(2, '0')}-${String(s).padStart(2, '0')}-${String(e).padStart(2, '0')}`;

const nextServiceCoords = (d, s) => {
  if (s + 1 < SERVICES_PER_DOMAIN) return { d, s: s + 1 };
  if (d + 1 < DOMAIN_COUNT) return { d: d + 1, s: 0 };
  return { d: 0, s: 0 };
};

const generate = () => {
  rmGeneratedTrees();

  writeFile(
    'users/perf-owner.mdx',
    `---
id: perf-owner
name: Perf Owner
avatarUrl: https://avatars.githubusercontent.com/u/1?v=4
---

${GENERATED_MARKER}

Synthetic catalog owner used by the large-catalog benchmark.
`
  );

  writeFile(
    'teams/perf-platform.mdx',
    `---
id: perf-platform
name: Perf Platform
members:
  - perf-owner
---

${GENERATED_MARKER}

Synthetic team used by the large-catalog benchmark.
`
  );

  for (let d = 0; d < DOMAIN_COUNT; d++) {
    const dId = domainId(d);
    const serviceIds = [];

    for (let s = 0; s < SERVICES_PER_DOMAIN; s++) {
      const sId = serviceId(d, s);
      serviceIds.push(sId);
      const sends = [];
      const receives = [];

      for (let e = 0; e < EVENTS_PER_SERVICE; e++) {
        sends.push({ id: eventId(d, s, e), version: '1.0.0' });
      }

      // Cross-link: consume two events from the next service so producers/consumers hydrate.
      const next = nextServiceCoords(d, s);
      receives.push({ id: eventId(next.d, next.s, 0), version: '1.0.0' });
      receives.push({ id: eventId(next.d, next.s, 1), version: '1.0.0' });

      const sendsYaml = sends.map((item) => `  - id: ${item.id}\n    version: ${item.version}`).join('\n');
      const receivesYaml = receives.map((item) => `  - id: ${item.id}\n    version: ${item.version}`).join('\n');

      writeFile(
        `domains/${dId}/services/${sId}/index.mdx`,
        `---
id: ${sId}
name: Service ${sId}
version: 1.0.0
summary: Synthetic service ${sId} used to stress EventCatalog build and page payloads.
owners:
  - perf-platform
sends:
${sendsYaml}
receives:
${receivesYaml}
---

${GENERATED_MARKER}

## Overview

\`${sId}\` publishes ${EVENTS_PER_SERVICE} events and consumes 2 events from a neighbouring service so the catalog has a dense producer/consumer graph.

## Architecture diagram

<NodeGraph />
`
      );

      for (let e = 0; e < EVENTS_PER_SERVICE; e++) {
        const eId = eventId(d, s, e);
        writeFile(
          `domains/${dId}/services/${sId}/events/${eId}/index.mdx`,
          `---
id: ${eId}
name: Event ${eId}
version: 1.0.0
summary: Synthetic event ${eId} published by ${sId}.
owners:
  - perf-platform
schemaPath: schema.json
---

${GENERATED_MARKER}

## Overview

\`${eId}\` is a benchmark event with a JSON schema and a node graph embed.

<SchemaViewer file="schema.json" title="JSON Schema" maxHeight="400" />

## Architecture diagram

<NodeGraph />
`
        );
        writeFile(`domains/${dId}/services/${sId}/events/${eId}/schema.json`, schemaForEvent(eId) + '\n');
      }
    }

    const servicesYaml = serviceIds.map((id) => `  - id: ${id}\n    version: 1.0.0`).join('\n');
    writeFile(
      `domains/${dId}/index.mdx`,
      `---
id: ${dId}
name: Domain ${dId}
version: 1.0.0
summary: Synthetic domain ${dId} containing ${SERVICES_PER_DOMAIN} services and ${SERVICES_PER_DOMAIN * EVENTS_PER_SERVICE} events.
owners:
  - perf-platform
services:
${servicesYaml}
---

${GENERATED_MARKER}

## Overview

Domain \`${dId}\` exists to make domain visualiser and docs pages large enough that serialized node-graph props dominate HTML size.

## Architecture diagram

<NodeGraph />
`
    );
  }

  const serviceCount = DOMAIN_COUNT * SERVICES_PER_DOMAIN;
  const eventCount = serviceCount * EVENTS_PER_SERVICE;
  console.log(
    `Generated ${DOMAIN_COUNT} domains, ${serviceCount} services, ${eventCount} events under ${path.relative(process.cwd(), __dirname)}`
  );
};

generate();
