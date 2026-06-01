import { describe, expect, it } from 'vitest';
import { buildEnvironmentUrl, findCurrentEnvironment } from './EnvironmentDropdown';

const environments = [
  {
    name: 'Development',
    url: 'https://example.com/event-catalog/dev',
    shortName: 'Dev',
  },
  {
    name: 'UAT',
    url: 'https://example.com/event-catalog/uat',
    shortName: 'UAT',
  },
  {
    name: 'Production',
    url: 'https://example.com/event-catalog/prod',
    shortName: 'Prod',
  },
];

describe('EnvironmentDropdown', () => {
  it('finds the current environment when environments share an origin but use different base paths', () => {
    expect(findCurrentEnvironment(environments, 'https://example.com/event-catalog/uat/services/foo')?.name).toBe('UAT');
  });

  it('builds environment urls by replacing the current environment base path', () => {
    expect(
      buildEnvironmentUrl(
        'https://example.com/event-catalog/prod',
        'https://example.com/event-catalog/uat/services/foo',
        'https://example.com/event-catalog/uat'
      )
    ).toBe('https://example.com/event-catalog/prod/services/foo');
  });

  it('preserves search params and hashes when switching environments', () => {
    expect(
      buildEnvironmentUrl(
        'https://example.com/event-catalog/prod',
        'https://example.com/event-catalog/uat/services/foo?tab=messages#latest',
        'https://example.com/event-catalog/uat'
      )
    ).toBe('https://example.com/event-catalog/prod/services/foo?tab=messages#latest');
  });

  it('keeps existing origin based environment switching for root catalogs', () => {
    expect(
      buildEnvironmentUrl('https://prod.example.com', 'https://uat.example.com/services/foo', 'https://uat.example.com')
    ).toBe('https://prod.example.com/services/foo');
  });

  it('switches from a root catalog to a subpath catalog', () => {
    expect(buildEnvironmentUrl('https://example.com/prod', 'https://example.com/services/foo', 'https://example.com')).toBe(
      'https://example.com/prod/services/foo'
    );
  });

  it('preserves the current path when the current environment is unknown', () => {
    expect(buildEnvironmentUrl('https://example.com/prod', 'http://localhost:3000/services/foo')).toBe(
      'https://example.com/prod/services/foo'
    );
  });
});
