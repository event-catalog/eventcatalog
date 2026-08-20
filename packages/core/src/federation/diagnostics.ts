import type { Conflict, ResolvedGraph } from '@eventcatalog/sdk';

export type FederationDiagnostic = {
  severity: 'error' | 'warning';
  message: string;
  rule: `federation/${string}`;
  attributes: { label: string; value: string }[];
};

const getExternalResource = (external: ResolvedGraph['externals'][number]) =>
  `${external.id}${external.version === undefined ? '' : `@${external.version}`}`;

const getDocumentedResourceType = (type: ResolvedGraph['entities'][number]['type']) => {
  const usesAn = type === 'adr' || type === 'agent' || type === 'entity' || type === 'event';
  return `documented as ${usesAn ? 'an' : 'a'} ${type}`;
};

const getConflictDiagnostic = (conflict: Conflict, graph: ResolvedGraph): FederationDiagnostic => {
  const catalogs = { label: 'catalogs', value: conflict.sources.join(', ') };

  switch (conflict.kind) {
    case 'duplicate-source':
      return {
        severity: 'error',
        message: 'Resource has multiple owners',
        rule: 'federation/duplicate-source',
        attributes: [
          { label: 'resource', value: conflict.id },
          catalogs,
          { label: 'resolution', value: 'assign a single owning catalog' },
        ],
      };
    case 'type-collision': {
      const types = [
        ...new Map(
          graph.entities
            .filter((entity) => entity.id === conflict.id)
            .map(
              (entity) =>
                [
                  `${entity.resolvedFrom.source}:${entity.type}`,
                  { label: entity.resolvedFrom.source, value: getDocumentedResourceType(entity.type) },
                ] as const
            )
        ).values(),
      ];

      return {
        severity: 'error',
        message: 'Resource ID has conflicting types',
        rule: 'federation/type-collision',
        attributes: [{ label: 'resource', value: conflict.id }, ...(types.length > 0 ? types : [catalogs])],
      };
    }
    case 'pointer-type-mismatch': {
      const typeMismatch = /^Expected (.+) but found (.+)$/.exec(conflict.detail ?? '');
      return {
        severity: 'error',
        message: 'Reference type does not match resource',
        rule: 'federation/pointer-type-mismatch',
        attributes: [
          { label: 'resource', value: conflict.id },
          ...(typeMismatch
            ? [
                { label: 'expected type', value: typeMismatch[1] },
                { label: 'actual type', value: typeMismatch[2] },
              ]
            : conflict.detail
              ? [{ label: 'detail', value: conflict.detail }]
              : []),
          catalogs,
        ],
      };
    }
    case 'facet-disagreement':
      return {
        severity: 'error',
        message: 'Catalogs disagree about this resource',
        rule: 'federation/facet-disagreement',
        attributes: [
          { label: 'resource', value: conflict.id },
          ...(conflict.detail ? [{ label: 'detail', value: conflict.detail }] : []),
          catalogs,
        ],
      };
  }
};

export const getFederationDiagnostics = (graph: ResolvedGraph): FederationDiagnostic[] => {
  const diagnostics = graph.conflicts.map((conflict) => getConflictDiagnostic(conflict, graph));

  for (const external of graph.externals) {
    const resource = getExternalResource(external);

    for (const referencedBy of external.referencedBy) {
      const referrer = graph.entities.find((entity) => entity.id === referencedBy);
      diagnostics.push({
        severity: 'warning',
        message: 'Referenced EventCatalog resource does not exist',
        rule: 'federation/missing-resource',
        attributes: [
          { label: 'source catalog', value: referrer?.resolvedFrom.source ?? 'unknown' },
          { label: 'referenced by', value: referencedBy },
          { label: 'missing resource', value: resource },
        ],
      });
    }
  }

  for (const warning of graph.warnings) {
    diagnostics.push({
      severity: 'warning',
      message: 'Asset collision',
      rule: 'federation/asset-collision',
      attributes: [
        { label: 'asset', value: warning.path },
        { label: 'sources', value: warning.sources.join(', ') },
        { label: 'winner', value: warning.winner },
        { label: 'resolution', value: 'last configured source wins' },
      ],
    });
  }

  return diagnostics.sort(
    (left, right) =>
      (left.severity === right.severity ? 0 : left.severity === 'error' ? -1 : 1) ||
      left.rule.localeCompare(right.rule) ||
      (left.attributes[0]?.value ?? '').localeCompare(right.attributes[0]?.value ?? '')
  );
};

export const getFederationDiagnosticCounts = (graph: ResolvedGraph) => ({
  errors: graph.conflicts.length,
  warnings: graph.warnings.length + graph.externals.length,
});
