import { describe, expect, it } from 'vitest';
import { getCollectionTextColorClass } from '@utils/collection-colors';
import {
  getResourceReferenceColorName,
  getResourceReferenceColors,
  getResourceReferenceStyle,
} from '@utils/resource-reference-colors';

describe('resource-reference-colors', () => {
  it('maps resource types to the same colors used in the explore tables', () => {
    expect(getResourceReferenceColorName('service')).toBe('pink');
    expect(getResourceReferenceColorName('agent')).toBe('sky');
    expect(getResourceReferenceColorName('event')).toBe('orange');
    expect(getResourceReferenceColorName('command')).toBe('blue');
    expect(getResourceReferenceColorName('query')).toBe('green');
    expect(getResourceReferenceColorName('domain')).toBe('yellow');
    expect(getResourceReferenceColorName('flow')).toBe('teal');
    expect(getResourceReferenceColorName('channel')).toBe('purple');
    expect(getResourceReferenceColorName('entity')).toBe('purple');
    expect(getResourceReferenceColorName('container')).toBe('indigo');
    expect(getResourceReferenceColorName('team')).toBe('gray');
    expect(getResourceReferenceColorName('user')).toBe('gray');
    expect(getResourceReferenceColorName('data-product')).toBe('cyan');
  });

  it('falls back to gray for unknown resource types', () => {
    expect(getResourceReferenceColorName('unknown')).toBe('gray');
  });

  it('softens the type colour: mixed with the page text (by the theme strength) for the text, faint for the underline and hover', () => {
    expect(getResourceReferenceStyle('service')).toBe(
      '--ec-resource-ref-bg: rgb(236 72 153 / 0.1); --ec-resource-ref-color: color-mix(in srgb, rgb(236 72 153) var(--ec-resource-ref-strength, 80%), rgb(var(--ec-page-text))); --ec-resource-ref-decoration: rgb(236 72 153 / var(--ec-resource-ref-decoration-alpha, 0.5)); color: var(--ec-resource-ref-color); text-decoration-color: var(--ec-resource-ref-decoration)'
    );
  });

  it('uses the active theme accent color for custom documentation references', () => {
    expect(getResourceReferenceStyle('doc')).toBe(
      '--ec-resource-ref-bg: rgb(var(--ec-accent) / 0.1); --ec-resource-ref-color: color-mix(in srgb, rgb(var(--ec-accent)) var(--ec-resource-ref-strength, 80%), rgb(var(--ec-page-text))); --ec-resource-ref-decoration: rgb(var(--ec-accent) / var(--ec-resource-ref-decoration-alpha, 0.5)); color: var(--ec-resource-ref-color); text-decoration-color: var(--ec-resource-ref-decoration)'
    );
  });

  it('gives the chat the same colours as the docs', () => {
    expect(getResourceReferenceColors('236 72 153')).toEqual({
      '--ec-resource-ref-bg': 'rgb(236 72 153 / 0.1)',
      '--ec-resource-ref-color':
        'color-mix(in srgb, rgb(236 72 153) var(--ec-resource-ref-strength, 80%), rgb(var(--ec-page-text)))',
      '--ec-resource-ref-decoration': 'rgb(236 72 153 / var(--ec-resource-ref-decoration-alpha, 0.5))',
    });
  });

  it('returns static Tailwind text classes for collection colors', () => {
    expect(getCollectionTextColorClass('indigo')).toBe('text-indigo-500');
    expect(getCollectionTextColorClass('sky')).toBe('text-sky-500');
    expect(getCollectionTextColorClass('unknown', 'text-[rgb(var(--ec-icon-color))]')).toBe('text-[rgb(var(--ec-icon-color))]');
  });
});
