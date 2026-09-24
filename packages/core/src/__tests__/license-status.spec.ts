import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const license = vi.hoisted(() => ({ verifyOfflineLicense: vi.fn(), clearCache: vi.fn() }));
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
    license.verifyOfflineLicense.mockReset();
    license.clearCache.mockReset();
    vi.stubEnv('EC_LICENSE', '');
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

    it('is licensed when the license.jwt verifies', async () => {
      const licensePath = path.join(projectDirectory, 'license.jwt');
      fs.writeFileSync(licensePath, token({ org: 'acme', exp }));
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
      const message = getLicenseStatusMessage({ state: 'licensed', org: 'acme', expiresAt: new Date(exp * 1000) }, tsd, now);
      expect(message).toMatchObject({ title: 'EventCatalog license', color: 'green' });
      expect(message?.text).toContain('Licensed to acme');
      expect(message?.text).toContain('(9 days left)');
    });

    it('shows the trial without a license', () => {
      const message = getLicenseStatusMessage({ state: 'none' }, tsd, now);
      expect(message).toMatchObject({ title: 'EventCatalog trial', color: 'green' });
      expect(message?.text).toContain('67 days left of your 90-day EventCatalog trial');
    });

    it('warns about an expired or invalid license, then shows the trial', () => {
      const expired = getLicenseStatusMessage({ state: 'expired', expiresAt: new Date(exp * 1000) }, tsd, now);
      expect(expired).toMatchObject({ title: 'EventCatalog license', color: 'yellow' });
      expect(expired?.text).toMatch(/^Your EventCatalog license expired on .+\.\n67 days left/);

      const invalid = getLicenseStatusMessage({ state: 'invalid', reason: 'its signature is invalid' }, tsd, now);
      expect(invalid?.text).toMatch(/^Your license\.jwt could not be verified: its signature is invalid\.\n67 days left/);
    });

    it('shows nothing without a license or a trial start date', () => {
      expect(getLicenseStatusMessage({ state: 'none' }, undefined, now)).toBeUndefined();
    });
  });

  describe('getLicenseAnalytics', () => {
    const tsd = now - 23 * DAY;

    it('reports a commercial license and when it and the trial expire', () => {
      expect(getLicenseAnalytics({ state: 'licensed', org: 'acme', expiresAt: new Date(exp * 1000) }, tsd)).toEqual({
        license: 'commercial',
        licenseState: 'valid',
        licenseExpiry: exp * 1000,
        trialExpiry: tsd + 90 * DAY,
      });
    });

    it('reports the trial otherwise', () => {
      expect(getLicenseAnalytics(undefined, tsd)).toEqual({
        license: 'trial',
        licenseState: 'none',
        licenseExpiry: undefined,
        trialExpiry: tsd + 90 * DAY,
      });
      expect(getLicenseAnalytics({ state: 'expired', expiresAt: new Date(exp * 1000) }, tsd)).toMatchObject({
        license: 'trial',
        licenseState: 'expired',
        licenseExpiry: exp * 1000,
      });
    });
  });
});
