import { describe, expect, it } from 'vitest';
import { getServiceSpecifications, getSpecIconUrl } from './specification-utils';

describe('generic specification icons', () => {
  it('preserves and resolves a custom icon from service specifications', () => {
    const [specification] = getServiceSpecifications({
      specifications: [
        {
          type: 'generic',
          path: 'specification.json',
          icon: '/icons/custom-api.png',
        },
      ],
    });

    expect(specification.icon).toBe('/icons/custom-api.png');
    expect(getSpecIconUrl(specification)).toBe('/icons/custom-api.png');
  });

  it('uses the default API icon when a generic specification has no custom icon', () => {
    const [specification] = getServiceSpecifications({
      specifications: [{ type: 'generic', path: 'specification.yaml' }],
    });

    expect(getSpecIconUrl(specification)).toBe('/icons/api.svg');
  });

  it('keeps existing specification icons unchanged', () => {
    const [specification] = getServiceSpecifications({
      specifications: [{ type: 'openapi', path: 'openapi.yaml', icon: '/icons/custom-api.png' }],
    });

    expect(getSpecIconUrl(specification)).toBe('/icons/openapi.svg');
  });
});
