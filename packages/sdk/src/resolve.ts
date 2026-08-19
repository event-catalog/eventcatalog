import { gt, satisfies, valid, validRange } from 'semver';
import type {
  Conflict,
  ConflictKind,
  EdgeDirection,
  External,
  Index,
  ResolutionWarning,
  ResolvedAsset,
  ResolvedEdge,
  ResolvedEntity,
  ResolvedGraph,
} from './index-types';

type Pointer = {
  id: string;
  version?: string;
  type?: string;
  label?: string;
};

type PointerField = {
  direction: EdgeDirection;
  via?: string;
  pointers?: Pointer[];
};

const compareText = (left: string, right: string) => (left < right ? -1 : left > right ? 1 : 0);
const isHigherVersion = (candidate?: string, current?: string) => {
  if (candidate === current || candidate === undefined) return false;
  if (current === undefined) return true;
  if (valid(candidate) && valid(current)) return gt(candidate, current);
  return compareText(candidate, current) > 0;
};

const selectTarget = (candidates: ResolvedEntity[] | undefined, pointerVersion?: string) => {
  if (!candidates?.length) return undefined;

  if (pointerVersion === undefined || pointerVersion === 'latest') {
    return candidates.reduce((latest, candidate) => (isHigherVersion(candidate.version, latest.version) ? candidate : latest));
  }

  const exactMatch = candidates.find((candidate) => candidate.version === pointerVersion);
  if (exactMatch) return exactMatch;

  const range = validRange(pointerVersion);
  if (!range) return undefined;

  return candidates.reduce<ResolvedEntity | undefined>((latest, candidate) => {
    if (candidate.version === undefined || !valid(candidate.version) || !satisfies(candidate.version, range)) return latest;
    if (latest === undefined || isHigherVersion(candidate.version, latest.version)) return candidate;
    return latest;
  }, undefined);
};

const getPointerFields = (entity: ResolvedEntity): PointerField[] => [
  { direction: 'sends', pointers: entity.sends },
  { direction: 'receives', pointers: entity.receives },
  { direction: 'writesTo', pointers: entity.writesTo },
  { direction: 'readsFrom', pointers: entity.readsFrom },
  { direction: 'contains', via: 'services', pointers: entity.services },
  { direction: 'contains', via: 'agents', pointers: entity.agents },
  { direction: 'contains', via: 'domains', pointers: entity.domains },
  { direction: 'contains', via: 'dataProducts', pointers: entity.dataProducts },
  { direction: 'contains', via: 'systems', pointers: entity.systems },
  { direction: 'contains', via: 'entities', pointers: entity.entities },
  { direction: 'contains', via: 'containers', pointers: entity.containers },
  { direction: 'contains', via: 'flows', pointers: entity.flows },
  { direction: 'relatesTo', via: 'relationships', pointers: entity.relationships },
  { direction: 'receives', via: 'inputs', pointers: entity.inputs },
  { direction: 'sends', via: 'outputs', pointers: entity.outputs },
  { direction: 'references', via: 'steps', pointers: entity.references },
  { direction: 'appliesTo', pointers: entity.appliesTo },
  { direction: 'relatesTo', via: 'related', pointers: entity.related },
  { direction: 'relatesTo', via: 'supersedes', pointers: entity.supersedes },
  { direction: 'relatesTo', via: 'supersededBy', pointers: entity.supersededBy },
  { direction: 'relatesTo', via: 'amends', pointers: entity.amends },
  { direction: 'relatesTo', via: 'amendedBy', pointers: entity.amendedBy },
  { direction: 'relatesTo', via: 'diagrams', pointers: entity.diagrams },
  { direction: 'references', via: 'channels', pointers: entity.channels },
  { direction: 'references', via: 'routes', pointers: entity.routes },
  { direction: 'sends', via: 'sends.to', pointers: entity.sends?.flatMap((pointer) => pointer.to ?? []) },
  { direction: 'receives', via: 'receives.from', pointers: entity.receives?.flatMap((pointer) => pointer.from ?? []) },
  { direction: 'sends', via: 'receives.triggers', pointers: entity.receives?.flatMap((pointer) => pointer.triggers ?? []) },
];

export const resolve = (indexes: Index[]): ResolvedGraph => {
  const assetCandidatesByPath = new Map<string, ResolvedAsset[]>();

  for (const { source, commit, assets = [] } of indexes) {
    for (const asset of assets) {
      const candidates = assetCandidatesByPath.get(asset.path) ?? [];
      candidates.push({ ...asset, resolvedFrom: { source, commit } });
      assetCandidatesByPath.set(asset.path, candidates);
    }
  }

  const assets: ResolvedAsset[] = [];
  const warnings: ResolutionWarning[] = [];

  for (const [assetPath, candidates] of assetCandidatesByPath) {
    const winner = candidates[candidates.length - 1];
    const sources = [...new Set(candidates.map((candidate) => candidate.resolvedFrom.source))].sort(compareText);
    const hashes = new Set(candidates.map((candidate) => candidate.hash));
    const hashesCanBeCompared = candidates.every((candidate) => candidate.hash !== undefined);
    const hasCollision = candidates.length > 1 && (!hashesCanBeCompared || hashes.size > 1);

    assets.push({
      ...winner,
      ...(!hasCollision && candidates.length > 1
        ? { contributors: sources.filter((source) => source !== winner.resolvedFrom.source) }
        : {}),
    });

    if (hasCollision) {
      warnings.push({
        kind: 'asset-collision',
        path: assetPath,
        sources,
        winner: winner.resolvedFrom.source,
      });
    }
  }

  assets.sort((left, right) => compareText(left.path, right.path));
  warnings.sort((left, right) => compareText(left.path, right.path));

  const entities = indexes
    .flatMap(({ source, commit, resources }) =>
      resources.map((resource) => ({
        ...resource,
        resolvedFrom: { source, commit },
      }))
    )
    .sort(
      (left, right) =>
        compareText(left.id, right.id) ||
        compareText(left.version ?? '', right.version ?? '') ||
        compareText(left.type, right.type) ||
        compareText(left.resolvedFrom.source, right.resolvedFrom.source)
    );
  const entitiesById = new Map<string, ResolvedEntity[]>();

  for (const entity of entities) {
    const matches = entitiesById.get(entity.id) ?? [];
    matches.push(entity);
    entitiesById.set(entity.id, matches);
  }

  const conflictsByKindAndId = new Map<string, Conflict>();
  const addConflict = (kind: ConflictKind, id: string, sources: string[], detail?: string) => {
    const key = `${kind}:${id}`;
    const conflict = conflictsByKindAndId.get(key);

    if (conflict) {
      conflict.sources = [...new Set([...conflict.sources, ...sources])].sort(compareText);
      if (conflict.detail === undefined) conflict.detail = detail;
      return;
    }

    conflictsByKindAndId.set(key, {
      kind,
      id,
      sources: [...new Set(sources)].sort(compareText),
      ...(detail === undefined ? {} : { detail }),
    });
  };

  for (const [id, matches] of entitiesById) {
    const sources = [...new Set(matches.map((entity) => entity.resolvedFrom.source))];
    const types = new Set(matches.map((entity) => entity.type));

    // A type collision is the more actionable diagnosis, so it deliberately suppresses
    // the duplicate-source conflict that would otherwise describe the same ownership group.
    if (types.size > 1) {
      addConflict('type-collision', id, sources);
    } else if (sources.length > 1) {
      addConflict('duplicate-source', id, sources);
    }
  }

  const externalsByPointer = new Map<string, External>();
  const edges: ResolvedEdge[] = [];

  for (const entity of entities) {
    for (const field of getPointerFields(entity)) {
      for (const pointer of field.pointers ?? []) {
        const candidates = entitiesById.get(pointer.id);
        const target = selectTarget(candidates, pointer.version);

        if (!target) {
          if (candidates) {
            edges.push({
              from: entity.id,
              fromVersion: entity.version ?? null,
              fromResolvedFrom: entity.resolvedFrom,
              to: pointer.id,
              direction: field.direction,
              ...(field.via === undefined ? {} : { via: field.via }),
              ...(pointer.label === undefined ? {} : { label: pointer.label }),
              pointer: pointer.version ?? null,
              resolved: null,
              status: 'unresolved',
            });
            continue;
          }

          const key = `${pointer.id}@${pointer.version ?? ''}`;
          const external = externalsByPointer.get(key) ?? {
            id: pointer.id,
            ...(pointer.version === undefined ? {} : { version: pointer.version }),
            referencedBy: [],
          };

          if (!external.referencedBy.includes(entity.id)) external.referencedBy.push(entity.id);
          externalsByPointer.set(key, external);
          edges.push({
            from: entity.id,
            fromVersion: entity.version ?? null,
            fromResolvedFrom: entity.resolvedFrom,
            to: pointer.id,
            direction: field.direction,
            ...(field.via === undefined ? {} : { via: field.via }),
            ...(pointer.label === undefined ? {} : { label: pointer.label }),
            pointer: pointer.version ?? null,
            resolved: null,
            status: 'external',
          });
          continue;
        }

        if (pointer.type !== undefined && pointer.type !== target.type) {
          addConflict(
            'pointer-type-mismatch',
            pointer.id,
            [entity.resolvedFrom.source, target.resolvedFrom.source],
            `Expected ${pointer.type} but found ${target.type}`
          );
        }

        // Pointer type validates author intent but never participates in lookup. The ID still
        // resolves, so keep the edge and report the mismatch separately for the caller to decide.
        edges.push({
          from: entity.id,
          fromVersion: entity.version ?? null,
          fromResolvedFrom: entity.resolvedFrom,
          to: target.id,
          direction: field.direction,
          ...(field.via === undefined ? {} : { via: field.via }),
          ...(pointer.label === undefined ? {} : { label: pointer.label }),
          pointer: pointer.version ?? null,
          resolved: target.version ?? null,
          resolvedFrom: target.resolvedFrom,
          status: 'resolved',
        });
      }
    }
  }

  return {
    entities,
    assets,
    edges,
    conflicts: [...conflictsByKindAndId.values()].sort(
      (left, right) => compareText(left.id, right.id) || compareText(left.kind, right.kind)
    ),
    warnings,
    externals: [...externalsByPointer.values()],
  };
};
