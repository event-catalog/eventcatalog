import { describe, it, expect } from 'vitest';
import { isSameOrigin, resolveHeaderTemplates, resolveHeaders } from '@utils/remote-spec';

describe('remote-spec utils', () => {
  it('resolves allowed prefixed env vars by default', () => {
    process.env.EVENTCATALOG_TOKEN = 'abc123';

    expect(resolveHeaderTemplates('Bearer ${EVENTCATALOG_TOKEN}')).toBe('Bearer abc123');
  });

  it('does not resolve non-prefixed env vars by default', () => {
    process.env.DATABASE_URL = 'secret';

    expect(resolveHeaderTemplates('Leak ${DATABASE_URL}')).toBe('Leak ');
  });

  it('resolves any env var when allowAnyEnvInHeaders is enabled', () => {
    process.env.DATABASE_URL = 'secret';

    expect(resolveHeaderTemplates('Leak ${DATABASE_URL}', { allowAnyEnvInHeaders: true })).toBe('Leak secret');
  });

  it('resolves all headers in an object', () => {
    process.env.EC_PAT = 'token';

    expect(resolveHeaders({ Authorization: 'Basic ${EC_PAT}', 'X-Test': 'static' })).toEqual({
      Authorization: 'Basic token',
      'X-Test': 'static',
    });
  });

  it('checks same-origin accurately', () => {
    expect(isSameOrigin('https://api.example.com/spec.yaml', 'https://api.example.com/refs/common.yaml')).toBe(true);
    expect(isSameOrigin('https://api.example.com/spec.yaml', 'https://attacker.example/ref.yaml')).toBe(false);
  });
});
