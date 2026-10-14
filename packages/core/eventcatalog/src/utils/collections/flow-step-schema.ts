import { z } from 'astro/zod';
import { withExtensionProperties } from './extension-properties';
import { pointer } from './pointer-schema';

const nextStep = z
  .union([
    // Can be a string or a number just to reference a step
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

/**
 * A step in a flow's frontmatter. Keys a step doesn't have are rejected (unless
 * they start with `x-`), so a typo like `servce:` fails the build rather than
 * quietly drawing a plain box.
 *
 * The linter checks flows with its own copy of these rules
 * (packages/linter/src/schemas/flow.ts): keep the two in sync.
 */
export const flowStepSchema = withExtensionProperties(
  z.object({
    id: z.union([z.string(), z.number()]),
    /** Ignored: the kind of step comes from what it points at. Older flows (and the editor) still write it. */
    type: z.string().optional(),
    /** Defaults to the name of what the step points at (or the custom step's title, or its id) */
    title: z.string().optional(),
    summary: z.string().optional(),
    message: pointer.optional(),
    agent: pointer.optional(),
    service: pointer.optional(),
    // Catalog system reference. `systems` matches how authors write the
    // pointer (same shape as `service`); `system` is accepted as an alias.
    systems: pointer.optional(),
    system: pointer.optional(),
    channel: pointer.optional(),
    flow: pointer.optional(),
    container: pointer.optional(),
    dataProduct: pointer.optional(),

    actor: z
      .object({
        name: z.string(),
        summary: z.string().optional(),
      })
      .optional(),
    custom: z
      .object({
        /** Defaults to the step's title */
        title: z.string().optional(),
        icon: z.string().optional(),
        type: z.string().optional(),
        summary: z.string().optional(),
        url: z.string().url().optional(),
        color: z.string().optional(),
        properties: z.record(z.string(), z.union([z.string(), z.number()])).optional(),
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
    next_step: nextStep,
    next_steps: z.array(nextStep).optional(),
  })
).superRefine((step, context) => {
  if (step.next_step !== undefined && step.next_steps !== undefined) {
    context.addIssue({
      code: 'custom',
      path: ['next_steps'],
      message: `Step "${step.id}" has both next_step and next_steps. Use next_step for one next step, or next_steps for several.`,
    });
  }

  const kinds = STEP_KINDS.filter((kind) => step[kind] !== undefined);
  if (kinds.length > 1) {
    const listed = `${kinds.slice(0, -1).join(', ')} and ${kinds[kinds.length - 1]}`;
    context.addIssue({
      code: 'custom',
      path: [kinds[1]],
      message: `Step "${step.id}" points at ${listed}. A step can only be one thing, so split it into ${kinds.length === 2 ? 'two' : 'separate'} steps.`,
    });
  }
});
