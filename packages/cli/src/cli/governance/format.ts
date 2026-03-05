import type { GovernanceResult } from './types';
import { getChangeVerb } from './rules';

export const formatGovernanceOutput = (results: GovernanceResult[]): string => {
  if (results.length === 0) {
    return 'No governance rules triggered. Catalog is compliant.';
  }

  const lines: string[] = ['Governance:', ''];

  for (const result of results) {
    lines.push(`  Rule "${result.rule.name}" triggered (${result.trigger}):`);

    if (result.deprecationChanges && result.deprecationChanges.length > 0) {
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
