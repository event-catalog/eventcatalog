import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { LicenseSettings, type LicenseProps } from '../LicenseSettings';

const DAY_IN_MS = 24 * 60 * 60 * 1000;
const NOW = Date.UTC(2026, 9, 14);
const LICENSE_URL = 'https://github.com/event-catalog/eventcatalog/blob/main/LICENSE';

const render = (license: LicenseProps, trialStartedAt = NOW - 7 * DAY_IN_MS) =>
  renderToStaticMarkup(
    <LicenseSettings license={license} trialStartedAt={trialStartedAt} renderedAt={NOW} licenseUrl={LICENSE_URL} />
  );

describe('LicenseSettings', () => {
  it('links to the license', () => {
    expect(render({ state: 'none' })).toContain(`href="${LICENSE_URL}"`);
  });

  it('shows the trial without a license', () => {
    expect(render({ state: 'none' })).toContain('EventCatalog trial');
  });

  it('links to pricing to buy a license while the trial runs', () => {
    const html = render({ state: 'none' });

    expect(html).toContain('Buy a license');
    expect(html).toContain('href="https://www.eventcatalog.dev/pricing"');
    expect(html).toContain('href="https://www.eventcatalog.dev/book-demo"');
    expect(html).toContain('You may qualify for Free Use');
  });

  it('links to the Business order form once the trial has ended', () => {
    const html = render({ state: 'none' }, NOW - 90 * DAY_IN_MS);

    expect(html).toContain('Buy Business');
    expect(html).toContain('href="https://www.eventcatalog.dev/buy?source=cli"');
    expect(html).not.toContain('Buy a license');
  });

  it('does not ask a licensed catalog to buy', () => {
    expect(render({ state: 'licensed', org: 'acme', expiresAt: NOW + 200 * DAY_IN_MS })).not.toMatch(/Buy (a license|Business)/);
  });

  it('shows an expired commercial license and how to renew it, not the trial', () => {
    const html = render({ state: 'expired', org: 'acme', expiresAt: NOW - DAY_IN_MS });

    expect(html).toContain('Your commercial license has expired');
    expect(html).toContain('need a commercial license to use EventCatalog in production');
    expect(html).toContain('Your catalog keeps building and running');
    expect(html).toContain('href="https://www.eventcatalog.dev/book-demo"');
    expect(html).toContain('You may qualify for Free Use');
    expect(html).not.toContain('EventCatalog trial');
  });

  it('asks a customer with a legacy Scale or Starter key to contact us for a license.jwt', () => {
    const html = render({ state: 'plan', plan: 'scale' });

    expect(html).toContain('EventCatalog Scale');
    expect(html).toContain('legacy license key');
    expect(html).toContain('mailto:hello@eventcatalog.dev?subject=');
    expect(html).not.toContain('EventCatalog trial');
  });

  it('does not mention legacy keys with a license.jwt', () => {
    expect(render({ state: 'licensed', org: 'acme', expiresAt: NOW + 200 * DAY_IN_MS })).not.toContain('legacy');
  });
});
