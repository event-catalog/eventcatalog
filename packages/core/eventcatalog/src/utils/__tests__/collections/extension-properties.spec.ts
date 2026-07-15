import { z } from 'astro/zod';
import { describe, expect, it } from 'vitest';
import { withExtensionProperties } from '@utils/collections/extension-properties';

const resourceSchema = withExtensionProperties(
  z.object({
    id: z.string(),
    name: z.string(),
    version: z.string(),
  })
);

describe('resource extension properties', () => {
  it('preserves x- properties and their values', () => {
    const resource = {
      id: 'PaymentService',
      name: 'Payment Service',
      version: '1.0.0',
      'x-operational-tier': 1,
      'x-scrum-masters': ['David', 'Andrew'],
      'x-metadata': {
        costCentre: 'payments',
        criticality: 'high',
      },
    };

    expect(resourceSchema.parse(resource)).toEqual(resource);
  });

  it('rejects undeclared properties that do not use the x- prefix', () => {
    const result = resourceSchema.safeParse({
      id: 'PaymentService',
      name: 'Payment Service',
      version: '1.0.0',
      operationalTier: 1,
    });

    expect(result.success).toBe(false);
    if (result.success) return;

    expect(result.error.issues).toEqual([
      expect.objectContaining({
        code: 'custom',
        path: ['operationalTier'],
        message: 'Unknown property "operationalTier". Custom properties must start with "x-".',
      }),
    ]);
  });

  it('rejects the prefix without a property name', () => {
    const result = resourceSchema.safeParse({
      id: 'PaymentService',
      name: 'Payment Service',
      version: '1.0.0',
      'x-': true,
    });

    expect(result.success).toBe(false);
    if (result.success) return;

    expect(result.error.issues[0]).toEqual(
      expect.objectContaining({
        path: ['x-'],
        message: 'Unknown property "x-". Custom properties must start with "x-".',
      })
    );
  });

  it('continues to validate declared properties', () => {
    const result = resourceSchema.safeParse({
      id: 123,
      name: 'Payment Service',
      version: '1.0.0',
      'x-operational-tier': 1,
    });

    expect(result.success).toBe(false);
    if (result.success) return;

    expect(result.error.issues[0]).toEqual(expect.objectContaining({ path: ['id'] }));
  });
});
