import type { GovernanceResult } from './types';
import { getChangeVerb } from './rules';

export const formatGovernanceOutput = (results: GovernanceResult[]): string => {
  if (results.length === 0) {
    return 'No governance rules triggered. Catalog is compliant.';
  }

  const lines: string[] = ['Governance:', ''];

  for (const result of results) {
    lines.push(`  Rule "${result.rule.name}" triggered (${result.trigger}):`);

    if (result.schemaChanges && result.schemaChanges.length > 0) {
      for (const sc of result.schemaChanges) {
        const consumers = sc.consumerServices.length > 0 ? sc.consumerServices.map((c) => c.id).join(', ') : 'no known consumers';
        lines.push(
          `    ! Schema changed for ${sc.resourceChange.resourceId} (${sc.resourceChange.type}) — consumers: ${consumers}`
        );
      }
    } else if (result.deprecationChanges && result.deprecationChanges.length > 0) {
      for (const dc of result.deprecationChanges) {
        const producers = dc.producerServices.length > 0 ? dc.producerServices.map((p) => p.id).join(', ') : 'unknown producer';
        lines.push(`    ! ${dc.resourceChange.resourceId} (${dc.resourceChange.type}) deprecated by ${producers}`);
      }
    } else {
      for (const change of result.matchedChanges) {
        const prefix = change.changeType === 'added' ? '+' : '-';
        const verb = getChangeVerb(result.trigger, change.changeType);
        lines.push(`    ${prefix} ${change.serviceId} is ${verb} ${change.resourceId}`);
      }
    }

    lines.push('');
  }

  return lines.join('\n');
};

export const formatFailureOutput = (failures: Array<{ ruleName: string; messages: string[] }>): string => {
  if (failures.length === 0) return '';

  const lines: string[] = [];

  for (const f of failures) {
    lines.push(`FAILED: ${f.ruleName}`);
    for (const msg of f.messages) {
      lines.push(`  ${msg}`);
    }
  }

  return lines.join('\n');
};
