import type { Container } from '../types';
import { serializeBaseFields } from './utils';

export function containerToDSL(resource: Container): string {
  const lines: string[] = [];
  const baseFields = serializeBaseFields(resource);
  if (baseFields) lines.push(baseFields);

  if (resource.container_type) {
    lines.push(`  container-type ${resource.container_type}`);
  }

  if (resource.technology) {
    lines.push(`  technology "${resource.technology}"`);
  }

  if (resource.authoritative === true) {
    lines.push(`  authoritative true`);
  }

  if (resource.access_mode) {
    lines.push(`  access-mode ${resource.access_mode}`);
  }

  if (resource.classification) {
    lines.push(`  classification ${resource.classification}`);
  }

  if (resource.residency) {
    lines.push(`  residency "${resource.residency}"`);
  }

  if (resource.retention) {
    lines.push(`  retention "${resource.retention}"`);
  }

  const body = lines.join('\n');
  return `container ${resource.id} {\n${body}\n}`;
}
