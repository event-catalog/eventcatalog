import type { Channel } from '../types';

export function channelToDSL(resource: Channel): string {
  const lines: string[] = [];

  if (resource.version) {
    lines.push(`  version ${resource.version}`);
  }

  if (resource.name) {
    lines.push(`  name "${resource.name}"`);
  }

  if (resource.address) {
    lines.push(`  address "${resource.address}"`);
  }

  if (resource.protocols && resource.protocols.length > 0) {
    for (const protocol of resource.protocols) {
      lines.push(`  protocol "${protocol}"`);
    }
  }

  if (resource.summary) {
    lines.push(`  summary "${resource.summary.trim()}"`);
  }

  if (!lines.length) {
    return `channel ${resource.id}`;
  }

  return `channel ${resource.id} {\n${lines.join('\n')}\n}`;
}
