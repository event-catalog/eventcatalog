import { describe, expect, it } from 'vitest';
import { formatCustomPropertyLabel, getCustomProperties, getCustomProperty, isCustomPropertyName } from './custom-properties';

describe('custom properties MDX components', () => {
  it('recognizes extension property names', () => {
    expect(isCustomPropertyName('x-owner')).toBe(true);
    expect(isCustomPropertyName('x-')).toBe(false);
    expect(isCustomPropertyName('owner')).toBe(false);
  });

  it('creates a readable label without changing uppercase text', () => {
    expect(formatCustomPropertyLabel('x-operational-tier')).toBe('Operational Tier');
    expect(formatCustomPropertyLabel('x-PII_classification')).toBe('PII Classification');
  });

  it('extracts only custom properties and preserves their values', () => {
    const properties = getCustomProperties({
      id: 'payment-api',
      'x-operational-tier': 1,
      'x-on-call': { schedule: 'payments-primary' },
    });

    expect(properties).toEqual([
      { name: 'x-operational-tier', label: 'Operational Tier', value: 1 },
      { name: 'x-on-call', label: 'On Call', value: { schedule: 'payments-primary' } },
    ]);
  });

  it('gets a named custom property', () => {
    expect(getCustomProperty({ 'x-owner': 'payments' }, 'x-owner')).toEqual({
      name: 'x-owner',
      label: 'Owner',
      value: 'payments',
    });
    expect(getCustomProperty({ owner: 'payments' }, 'owner')).toBeUndefined();
    expect(getCustomProperty({ 'x-owner': 'payments' }, 'x-missing')).toBeUndefined();
  });
});
