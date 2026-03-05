import type { GovernanceResult } from './types';
import { getChangeVerb } from './rules';

export const formatGovernanceOutput = (results: GovernanceResult[]): string => {
  if (results.length === 0) {
    return 'No governance rules triggered. Catalog is compliant.';
  }

  const lines: string[] = ['Governance:', ''];

  for (const result of results) {
    lines.push(`  Rule "${result.rule.name}" triggered (${result.trigger}):`);
    for (const change of result.matchedChanges) {
      const prefix = change.changeType === 'added' ? '+' : '-';
      const verb = getChangeVerb(result.trigger, change.changeType);
      lines.push(`    ${prefix} ${change.serviceId} is ${verb} ${change.resourceId}`);
    }
    lines.push('');
  }

  return lines.join('\n');
};
