import { describe, expect, it } from 'vitest';
import { getVersionBannerText } from '@utils/version-banner';
import { getResourceNoun } from '@utils/collections/util';

describe('getVersionBannerText', () => {
  it('reads as a sentence on a previous version of a resource, with a space before the name and the version', () => {
    const text = getVersionBannerText({ subject: getResourceNoun('queries'), latestOf: getResourceNoun('queries') });

    expect(`${text.previous}Get Orders`).toBe('You are looking at a previous version of the query Get Orders');
    expect(`${text.latest}v2.0.0`).toBe('The latest version of this query is v2.0.0');
  });

  it('names an architecture decision in full', () => {
    const text = getVersionBannerText({ subject: getResourceNoun('adrs'), latestOf: getResourceNoun('adrs') });

    expect(text.previous).toBe('You are looking at a previous version of the architecture decision ');
    expect(text.latest).toBe('The latest version of this architecture decision is ');
  });

  it('names the resource a GraphQL schema belongs to, and links to the latest schema', () => {
    const text = getVersionBannerText({ subject: getResourceNoun('domains'), latestOf: 'GraphQL schema' });

    expect(`${text.previous}Ordering`).toBe('You are looking at a previous version of the domain Ordering');
    expect(`${text.latest}v1.0.0`).toBe('The latest version of this GraphQL schema is v1.0.0');
  });

  it('describes a resource doc', () => {
    const text = getVersionBannerText({ subject: `${getResourceNoun('services')} doc`, latestOf: 'doc' });

    expect(`${text.previous}Runbook`).toBe('You are looking at a previous version of the service doc Runbook');
    expect(`${text.latest}v3.1.0`).toBe('The latest version of this doc is v3.1.0');
  });
});
