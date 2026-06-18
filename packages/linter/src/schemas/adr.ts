import { z } from 'zod';
import { baseSchema, ownerReferenceSchema, pointerSchema } from './common';

// Mirrors `ADR_STATUS_VALUES` in @eventcatalog/core
// (packages/core/eventcatalog/src/utils/collections/adr-constants.ts). Keep in
// sync — a value outside this set is rejected by the content collection schema
// at build time, so the linter must reject it too.
export const ADR_STATUS_VALUES = ['proposed', 'accepted', 'rejected', 'deprecated', 'superseded'] as const;

// Mirrors `adrResourcePointer` in core's content.config.ts — a typed pointer to
// any catalog resource an ADR applies to.
const adrResourcePointerSchema = pointerSchema.extend({
  type: z.enum([
    'agent',
    'service',
    'event',
    'command',
    'query',
    'flow',
    'channel',
    'domain',
    'user',
    'team',
    'container',
    'entity',
    'diagram',
    'data-product',
  ]),
});

export const adrSchema = z
  .object({
    status: z.enum(ADR_STATUS_VALUES),
    date: z.coerce.date(),
    decisionMakers: z.array(ownerReferenceSchema).optional(),
    appliesTo: z.array(adrResourcePointerSchema).optional(),
    supersedes: z.array(pointerSchema).optional(),
    supersededBy: z.array(pointerSchema).optional(),
    amends: z.array(pointerSchema).optional(),
    amendedBy: z.array(pointerSchema).optional(),
    related: z.array(pointerSchema).optional(),
  })
  .merge(baseSchema);
