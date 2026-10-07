import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const license = vi.hoisted(() => ({
  verifyOfflineLicense: vi.fn(),
  clearCache: vi.fn(),
  hasCommercialLicense: vi.fn(),
  isEventCatalogScaleEnabled: vi.fn(),
  isEventCatalogStarterEnabled: vi.fn(),
}));
vi.mock('@eventcatalog/license', () => license);

import { getLicenseAnalytics, getLicenseStatus, getLicenseStatusMessage } from '../utils/license-status';

const DAY = 24 * 60 * 60 * 1000;
const now = Date.UTC(2026, 8, 24);
const exp = Date.UTC(2026, 9, 3) / 1000;

// An unsigned token: the verifier is mocked, only the payload is read
const token = (payload: object) => ['e30', Buffer.from(JSON.stringify(payload)).toString('base64url'), 'signature'].join('.');

describe('license status', () => {
  let projectDirectory: string;

  beforeEach(() => {
    projectDirectory = fs.mkdtempSync(path.join(os.tmpdir(), 'eventcatalog-license-'));
    Object.values(license).forEach((mock) => mock.mockReset());
    license.hasCommercialLicense.mockResolvedValue(false);
    license.isEventCatalogScaleEnabled.mockResolvedValue(false);
    license.isEventCatalogStarterEnabled.mockResolvedValue(false);
    vi.stubEnv('EC_LICENSE', '');
    vi.stubEnv('EVENTCATALOG_SCALE', '');
    vi.stubEnv('EVENTCATALOG_STARTER', '');
  });

  afterEach(() => {
    fs.rmSync(projectDirectory, { recursive: true, force: true });
    vi.unstubAllEnvs();
  });

  describe('getLicenseStatus', () => {
    it('has no license without a license.jwt in the catalog', async () => {
      await expect(getLicenseStatus(projectDirectory)).resolves.toEqual({ state: 'none' });
      expect(license.verifyOfflineLicense).not.toHaveBeenCalled();
    });

    it('is licensed when the license.jwt is a commercial license', async () => {
      const licensePath = path.join(projectDirectory, 'license.jwt');
      fs.writeFileSync(licensePath, token({ org: 'acme', exp }));
      license.hasCommercialLicense.mockResolvedValue(true);
      license.verifyOfflineLicense.mockResolvedValue({ org: 'acme', licenseId: 'ec_1.acme', iat: exp - 30 * 86400, exp });

      await expect(getLicenseStatus(projectDirectory)).resolves.toEqual({
        state: 'licensed',
        org: 'acme',
        licenseId: 'ec_1.acme',
        issuedAt: new Date((exp - 30 * 86400) * 1000),
        expiresAt: new Date(exp * 1000),
      });
      expect(license.verifyOfflineLicense).toHaveBeenCalledWith({ licensePath });
    });

    it('does not check for a Scale or Starter plan with a commercial license', async () => {
      fs.writeFileSync(path.join(projectDirectory, 'license.jwt'), token({ org: 'acme', exp }));
      license.hasCommercialLicense.mockResolvedValue(true);
      license.verifyOfflineLicense.mockResolvedValue({ org: 'acme', exp });

      await expect(getLicenseStatus(projectDirectory)).resolves.toMatchObject({ state: 'licensed' });
      expect(license.isEventCatalogScaleEnabled).not.toHaveBeenCalled();
      expect(license.isEventCatalogStarterEnabled).not.toHaveBeenCalled();
      expect(process.env.EVENTCATALOG_SCALE).toBe('false');
      expect(process.env.EVENTCATALOG_STARTER).toBe('false');
    });

    it('falls back to a Scale plan without a commercial license, and passes it on to Astro', async () => {
      license.isEventCatalogScaleEnabled.mockResolvedValue(true);

      await expect(getLicenseStatus(projectDirectory)).resolves.toEqual({ state: 'plan', plan: 'scale' });
      expect(process.env.EVENTCATALOG_SCALE).toBe('true');
      expect(process.env.EVENTCATALOG_STARTER).toBe('false');
    });

    it('falls back to a Starter plan without a commercial license or a Scale plan', async () => {
      license.isEventCatalogStarterEnabled.mockResolvedValue(true);

      await expect(getLicenseStatus(projectDirectory)).resolves.toEqual({ state: 'plan', plan: 'starter' });
      expect(process.env.EVENTCATALOG_SCALE).toBe('false');
      expect(process.env.EVENTCATALOG_STARTER).toBe('true');
    });

    it('falls back to a Scale plan when the license.jwt has expired', async () => {
      fs.writeFileSync(path.join(projectDirectory, 'license.jwt'), token({ org: 'acme', exp }));
      license.verifyOfflineLicense.mockRejectedValue(
        Object.assign(new Error('License has expired'), { code: 'LICENSE_EXPIRED' })
      );
      // The plan checks verify the expired license.jwt too
      license.isEventCatalogStarterEnabled.mockRejectedValue(new Error('License has expired'));
      license.isEventCatalogScaleEnabled.mockResolvedValue(true);

      await expect(getLicenseStatus(projectDirectory)).resolves.toEqual({ state: 'plan', plan: 'scale' });
    });

    it('reports an expired license when a plan check fails', async () => {
      fs.writeFileSync(path.join(projectDirectory, 'license.jwt'), token({ org: 'acme', exp }));
      license.verifyOfflineLicense.mockRejectedValue(
        Object.assign(new Error('License has expired'), { code: 'LICENSE_EXPIRED' })
      );
      license.isEventCatalogScaleEnabled.mockRejectedValue(new Error('License has expired'));
      license.isEventCatalogStarterEnabled.mockRejectedValue(new Error('License has expired'));

      await expect(getLicenseStatus(projectDirectory)).resolves.toMatchObject({ state: 'expired' });
    });

    it('is expired when the license.jwt verifies within its clock tolerance but is not a commercial license', async () => {
      fs.writeFileSync(path.join(projectDirectory, 'license.jwt'), token({ org: 'acme', exp }));
      license.verifyOfflineLicense.mockResolvedValue({ org: 'acme', exp });

      await expect(getLicenseStatus(projectDirectory)).resolves.toEqual({
        state: 'expired',
        org: 'acme',
        licenseId: undefined,
        issuedAt: undefined,
        expiresAt: new Date(exp * 1000),
      });
    });

    it('reads when an expired license expired', async () => {
      fs.writeFileSync(path.join(projectDirectory, 'license.jwt'), token({ org: 'acme', exp }));
      license.verifyOfflineLicense.mockRejectedValue(
        Object.assign(new Error('License has expired'), { code: 'LICENSE_EXPIRED' })
      );

      await expect(getLicenseStatus(projectDirectory)).resolves.toEqual({
        state: 'expired',
        org: 'acme',
        expiresAt: new Date(exp * 1000),
      });
    });

    it('verifies a license once, and again when the file changes', async () => {
      const licensePath = path.join(projectDirectory, 'license.jwt');
      fs.writeFileSync(licensePath, token({ org: 'acme', exp }));
      license.hasCommercialLicense.mockResolvedValue(true);
      license.verifyOfflineLicense.mockResolvedValue({ org: 'acme', exp });

      await getLicenseStatus(projectDirectory);
      await getLicenseStatus(projectDirectory);
      expect(license.verifyOfflineLicense).toHaveBeenCalledTimes(1);

      const changedAt = new Date(Date.now() + 60_000);
      fs.utimesSync(licensePath, changedAt, changedAt);
      await getLicenseStatus(projectDirectory);
      expect(license.verifyOfflineLicense).toHaveBeenCalledTimes(2);
      expect(license.clearCache).toHaveBeenCalledTimes(2);
    });

    it('explains why a license is invalid, without the verifier logging', async () => {
      fs.writeFileSync(path.join(projectDirectory, 'license.jwt'), token({ exp }));
      license.verifyOfflineLicense.mockImplementation(async () => {
        console.error('logged by the license package');
        throw Object.assign(new Error('bad signature'), { code: 'LICENSE_SIGNATURE_INVALID' });
      });
      const consoleError = vi.spyOn(console, 'error');

      await expect(getLicenseStatus(projectDirectory)).resolves.toEqual({
        state: 'invalid',
        reason: 'its signature is invalid',
      });
      expect(consoleError).not.toHaveBeenCalled();
    });
  });

  describe('getLicenseStatusMessage', () => {
    const tsd = now - 23 * DAY;

    it('shows who the license is for and when it expires', () => {
      const expiresAt = new Date(now + 90 * DAY);
      const message = getLicenseStatusMessage({ state: 'licensed', org: 'acme', expiresAt }, tsd, now);
      expect(message).toMatchObject({ title: 'EventCatalog Commercial License', color: 'green' });
      expect(message?.text).toContain('Licensed to acme');
      expect(message?.text).toContain('(90 days left)');
    });

    it('warns when the license expires in fewer than 30 days', () => {
      const message = getLicenseStatusMessage({ state: 'licensed', org: 'acme', expiresAt: new Date(exp * 1000) }, tsd, now);
      expect(message).toMatchObject({ title: 'EventCatalog Commercial License', color: 'yellow' });
      expect(message?.text).toMatch(/^Licensed to acme\nYour license expires in 9 days, on .+\.\nRenew it/);

      const month = getLicenseStatusMessage({ state: 'licensed', expiresAt: new Date(now + 30 * DAY) }, tsd, now);
      expect(month?.color).toBe('green');
    });

    it('shows the trial without a license', () => {
      const message = getLicenseStatusMessage({ state: 'none' }, tsd, now);
      expect(message).toMatchObject({ title: 'EventCatalog trial', color: 'green' });
      expect(message?.text).toContain('37 days left of your 60-day EventCatalog trial');
    });

    it('shows an expired license in its own box, then the trial', () => {
      const expired = getLicenseStatusMessage({ state: 'expired', org: 'acme', expiresAt: new Date(now - 5 * DAY) }, tsd, now);
      expect(expired).toMatchObject({ title: 'EventCatalog License Expired', color: 'yellow' });
      expect(expired?.text).toMatch(
        /^Your EventCatalog commercial license for acme expired on .+ \(5 days ago\)\.\nRenew it to keep using EventCatalog commercially: https:\/\/eventcatalog\.cloud\n37 days left/
      );
    });

    it('warns about an invalid license, then shows the trial', () => {
      const invalid = getLicenseStatusMessage({ state: 'invalid', reason: 'its signature is invalid' }, tsd, now);
      expect(invalid).toMatchObject({ title: 'EventCatalog license', color: 'yellow' });
      expect(invalid?.text).toMatch(/^Your license\.jwt could not be verified: its signature is invalid\.\n37 days left/);
    });

    it('shows nothing without a license or a trial start date', () => {
      expect(getLicenseStatusMessage({ state: 'none' }, undefined, now)).toBeUndefined();
    });

    it('leaves a Scale or Starter plan to the box the license package shows', () => {
      expect(getLicenseStatusMessage({ state: 'plan', plan: 'scale' }, tsd, now)).toBeUndefined();
    });
  });

  describe('getLicenseAnalytics', () => {
    const tsd = now - 23 * DAY;

    it('reports a commercial license and when it and the trial expire', () => {
      expect(getLicenseAnalytics({ state: 'licensed', org: 'acme', expiresAt: new Date(exp * 1000) }, tsd)).toEqual({
        license: 'commercial',
        licenseState: 'valid',
        licenseExpiry: exp * 1000,
        trialExpiry: tsd + 60 * DAY,
      });
    });

    it('reports a Scale or Starter plan', () => {
      expect(getLicenseAnalytics({ state: 'plan', plan: 'scale' }, tsd)).toMatchObject({
        license: 'scale',
        licenseState: 'valid',
        licenseExpiry: undefined,
      });
      expect(getLicenseAnalytics({ state: 'plan', plan: 'starter' }, tsd)).toMatchObject({ license: 'starter' });
    });

    it('reports the trial otherwise', () => {
      expect(getLicenseAnalytics(undefined, tsd)).toEqual({
        license: 'trial',
        licenseState: 'none',
        licenseExpiry: undefined,
        trialExpiry: tsd + 60 * DAY,
      });
      expect(getLicenseAnalytics({ state: 'expired', expiresAt: new Date(exp * 1000) }, tsd)).toMatchObject({
        license: 'trial',
        licenseState: 'expired',
        licenseExpiry: exp * 1000,
      });
    });
  });
});
