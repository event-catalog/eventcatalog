import { describe, expect, it } from 'vitest';
import { resolveTemplateVariables } from '@utils/remote-file';

describe('resolveTemplateVariables', () => {
  it('resolves placeholders from process.env fallback', () => {
    process.env.AZURE_DEVOPS_PAT_BASE64 = 'abc123';

    expect(resolveTemplateVariables('Basic ${AZURE_DEVOPS_PAT_BASE64}')).toBe('Basic abc123');
  });

  it('resolves nested object values', () => {
    process.env.API_KEY = 'secret';

    expect(resolveTemplateVariables({ headers: { Authorization: 'Bearer ${API_KEY}' } })).toEqual({
      headers: { Authorization: 'Bearer secret' },
    });
  });

  it('returns empty string when variable is missing', () => {
    delete process.env.MISSING_VAR;

    expect(resolveTemplateVariables('x-${MISSING_VAR}-y')).toBe('x--y');
  });
});
