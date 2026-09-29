import { z } from 'zod';
import { baseSchema, pointerSchema } from './common';

const flowStep = z
  .union([
    z.union([z.string(), z.number()]),
    z
      .object({
        id: z.union([z.string(), z.number()]),
        label: z.string().optional(),
      })
      .optional(),
  ])
  .optional();

// What a step can be (a step is one of these, or just a titled box)
const STEP_KINDS = [
  'message',
  'agent',
  'service',
  'systems',
  'system',
  'channel',
  'flow',
  'container',
  'dataProduct',
  'actor',
  'custom',
  'externalSystem',
] as const;

// The same rules (and messages) as EventCatalog's own flow step schema
// (packages/core/eventcatalog/src/utils/collections/flow-step-schema.ts): keep the two in sync
const flowStepSchema = z
  .object({
    id: z.union([z.string(), z.number()]),
    // Ignored by EventCatalog (the kind of step comes from what it points at)
    type: z.string().optional(),
    // Defaults to the name of what the step points at
    title: z.string().optional(),
    summary: z.string().optional(),
    message: pointerSchema.optional(),
    agent: pointerSchema.optional(),
    service: pointerSchema.optional(),
    systems: pointerSchema.optional(),
    system: pointerSchema.optional(),
    channel: pointerSchema.optional(),
    flow: pointerSchema.optional(),
    container: pointerSchema.optional(),
    dataProduct: pointerSchema.optional(),
    actor: z
      .object({
        name: z.string(),
        summary: z.string().optional(),
      })
      .optional(),
    custom: z
      .object({
        // Defaults to the step's title
        title: z.string().optional(),
        icon: z.string().optional(),
        type: z.string().optional(),
        summary: z.string().optional(),
        url: z.string().url().optional(),
        color: z.string().optional(),
        properties: z.record(z.union([z.string(), z.number()])).optional(),
        height: z.number().optional(),
        menu: z
          .array(
            z.object({
              label: z.string(),
              url: z.string().url().optional(),
            })
          )
          .optional(),
      })
      .optional(),
    externalSystem: z
      .object({
        name: z.string(),
        summary: z.string().optional(),
        url: z.string().url().optional(),
      })
      .optional(),
    next_step: flowStep,
    next_steps: z.array(flowStep).optional(),
  })
  .superRefine((step, context) => {
    if (step.next_step !== undefined && step.next_steps !== undefined) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['next_steps'],
        message: `Step "${step.id}" has both next_step and next_steps. Use next_step for one next step, or next_steps for several.`,
      });
    }

    const kinds = STEP_KINDS.filter((kind) => step[kind] !== undefined);
    if (kinds.length > 1) {
      const listed = `${kinds.slice(0, -1).join(', ')} and ${kinds[kinds.length - 1]}`;
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: [kinds[1]],
        message: `Step "${step.id}" points at ${listed}. A step can only be one thing, so split it into ${kinds.length === 2 ? 'two' : 'separate'} steps.`,
      });
    }
  });

export const flowSchema = z
  .object({
    steps: z.array(flowStepSchema),
  })
  .merge(baseSchema);
