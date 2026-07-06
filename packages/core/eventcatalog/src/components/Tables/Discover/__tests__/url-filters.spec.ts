import { describe, expect, it } from 'vitest';
import { buildDiscoverFilterSearch, filterKnownValues, parseDiscoverFilterSearch } from '../url-filters';

describe('discover filter URL helpers', () => {
  it('parses repeated filter params from the URL', () => {
    expect(
      parseDiscoverFilterSearch('?q=orders&domain=Sales&domain=Payments&owner=team-a&property=hasOwners&latest=false&drafts=true')
    ).toEqual({
      q: 'orders',
      domains: ['Sales', 'Payments'],
      owners: ['team-a'],
      producers: [],
      consumers: [],
      agentProviders: [],
      agentModels: [],
      badges: [],
      properties: ['hasOwners'],
      statuses: [],
      showOnlyLatest: false,
      onlyShowDrafts: true,
    });
  });

  it('writes only non-default filter params and preserves unrelated params', () => {
    expect(
      buildDiscoverFilterSearch(
        {
          q: 'orders',
          domains: ['Sales'],
          owners: [],
          producers: [],
          consumers: [],
          agentProviders: [],
          agentModels: [],
          badges: ['Critical'],
          properties: ['hasOwners'],
          statuses: [],
          showOnlyLatest: false,
          onlyShowDrafts: false,
        },
        '?environment=prod&domain=Old'
      )
    ).toBe('?environment=prod&q=orders&domain=Sales&badge=Critical&property=hasOwners&latest=false');
  });

  it('filters stale values against the options available on the current page', () => {
    expect(filterKnownValues(['Sales', 'Deleted'], new Set(['Sales', 'Payments']))).toEqual(['Sales']);
  });
});
