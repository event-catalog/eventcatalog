import { readFileSync } from 'node:fs';
import createSDK from '@eventcatalog/sdk';

type ResourceType = 'event' | 'command' | 'query' | 'service' | 'domain';

type MessageRef = { id: string; version?: string };

type ParsedResource = {
  type: ResourceType;
  id: string;
  version?: string;
  name?: string;
  summary?: string;
  sends?: MessageRef[];
  receives?: MessageRef[];
  services?: { id: string; version?: string }[];
};

interface ImportOptions {
  file: string;
  dir: string;
  dryRun?: boolean;
}

function parseRef(input: string): { id: string; version?: string } {
  const [id, version] = input.split('@');
  return { id, version };
}

function parseDSL(dsl: string): ParsedResource[] {
  const resources: ParsedResource[] = [];
  const blockRegex = /(event|command|query|service|domain)\s+([^\s{]+)\s*\{([\s\S]*?)\}/g;

  for (const match of dsl.matchAll(blockRegex)) {
    const [, type, id, body] = match;
    const resource: ParsedResource = { type: type as ResourceType, id };

    const lines = body
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean);

    for (const line of lines) {
      const versionMatch = line.match(/^version\s+(.+)$/);
      if (versionMatch) {
        resource.version = versionMatch[1].trim();
        continue;
      }

      const nameMatch = line.match(/^name\s+"([\s\S]+)"$/);
      if (nameMatch) {
        resource.name = nameMatch[1];
        continue;
      }

      const summaryMatch = line.match(/^summary\s+"([\s\S]+)"$/);
      if (summaryMatch) {
        resource.summary = summaryMatch[1];
        continue;
      }

      const serviceMatch = line.match(/^service\s+([^\s]+)$/);
      if (serviceMatch) {
        resource.services ||= [];
        resource.services.push(parseRef(serviceMatch[1]));
        continue;
      }

      const sendsMatch = line.match(/^sends\s+(event|command|query)\s+([^\s]+)$/);
      if (sendsMatch) {
        resource.sends ||= [];
        resource.sends.push(parseRef(sendsMatch[2]));
        continue;
      }

      const receivesMatch = line.match(/^receives\s+(event|command|query)\s+([^\s]+)$/);
      if (receivesMatch) {
        resource.receives ||= [];
        resource.receives.push(parseRef(receivesMatch[2]));
        continue;
      }
    }

    resources.push(resource);
  }

  return resources;
}

export async function importFromDSL(options: ImportOptions): Promise<string> {
  const { file, dir, dryRun = false } = options;
  const dsl = readFileSync(file, 'utf-8');
  const parsed = parseDSL(dsl);

  if (parsed.length === 0) {
    throw new Error(`No supported DSL resources found in '${file}'`);
  }

  const sdk = createSDK(dir);
  const output: string[] = [''];

  for (const resource of parsed) {
    output.push(`  ${dryRun ? 'Would import' : 'Importing'} ${resource.type} '${resource.id}'`);

    if (dryRun) continue;

    const basePayload = {
      id: resource.id,
      version: resource.version || '0.0.1',
      name: resource.name || resource.id,
      markdown: '',
      ...(resource.summary ? { summary: resource.summary } : {}),
    };

    if (resource.type === 'event') {
      await sdk.writeEvent(basePayload);
    }

    if (resource.type === 'command') {
      await sdk.writeCommand(basePayload);
    }

    if (resource.type === 'query') {
      await sdk.writeQuery(basePayload);
    }

    if (resource.type === 'service') {
      await sdk.writeService({
        ...basePayload,
        ...(resource.sends ? { sends: resource.sends } : {}),
        ...(resource.receives ? { receives: resource.receives } : {}),
      });
    }

    if (resource.type === 'domain') {
      await sdk.writeDomain({
        ...basePayload,
        ...(resource.services ? { services: resource.services } : {}),
        ...(resource.sends ? { sends: resource.sends } : {}),
        ...(resource.receives ? { receives: resource.receives } : {}),
      });
    }
  }

  output.push('');
  output.push(`  ${dryRun ? 'Planned import for' : 'Imported'} ${parsed.length} resource(s) from ${file}`);
  output.push('');
  return output.join('\n');
}
