import fs from 'node:fs';
import path from 'node:path';
import { clearCache, verifyOfflineLicense } from '@eventcatalog/license';

export { LICENSE_FAQ_URL } from './trial';

// Details from the license token
export type LicenseDetails = { org?: string; licenseId?: string; issuedAt?: Date };

export type LicenseStatus =
  | { state: 'none' }
  | ({ state: 'licensed'; expiresAt: Date } & LicenseDetails)
  | ({ state: 'expired'; expiresAt?: Date } & LicenseDetails)
  | { state: 'invalid'; reason: string };

const toDate = (seconds: unknown) => (typeof seconds === 'number' ? new Date(seconds * 1000) : undefined);

const getDetails = (claims: Record<string, unknown>): LicenseDetails => ({
  org: typeof claims.org === 'string' ? claims.org : undefined,
  licenseId: typeof claims.licenseId === 'string' ? claims.licenseId : undefined,
  issuedAt: toDate(claims.iat),
});

const INVALID_REASONS: Record<string, string> = {
  LICENSE_FILE_EMPTY: 'the file is empty',
  LICENSE_NOT_YET_VALID: 'it is not valid yet',
  LICENSE_SIGNATURE_INVALID: 'its signature is invalid',
  LICENSE_VALIDATION_FAILED: 'it was not issued by EventCatalog',
};

// The license file: EC_LICENSE, or license.jwt in the root of the catalog
export const getLicenseFilePath = (projectDirectory: string) =>
  process.env.EC_LICENSE || path.join(projectDirectory, 'license.jwt');

// The token's claims, without verifying it (for an expired license, which the verifier rejects)
const readClaims = (licenseFilePath: string): Record<string, unknown> => {
  try {
    const payload = fs.readFileSync(licenseFilePath, 'utf8').trim().split('.')[1];
    return JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
  } catch {
    return {};
  }
};

// Verified statuses by license file and its last change, so a license is checked once per change
const statusCache = new Map<string, Promise<LicenseStatus>>();

/**
 * Verifies the catalog's license.jwt offline (signature, issuer, audience and dates).
 * Cached until the license file changes.
 */
export const getLicenseStatus = (projectDirectory = process.env.PROJECT_DIR || process.cwd()): Promise<LicenseStatus> => {
  const licensePath = getLicenseFilePath(projectDirectory);
  const modifiedAt = fs.statSync(licensePath, { throwIfNoEntry: false })?.mtimeMs;
  if (modifiedAt === undefined) return Promise.resolve({ state: 'none' });

  const key = `${licensePath}:${modifiedAt}`;
  if (!statusCache.has(key)) statusCache.set(key, verifyLicense(licensePath));
  return statusCache.get(key)!;
};

const verifyLicense = async (licensePath: string): Promise<LicenseStatus> => {
  // The license package logs its own errors; callers report the status instead
  const consoleError = console.error;
  console.error = () => {};
  try {
    // The package keeps the first license it verifies; this file may have changed since
    clearCache();
    const entitlements = await verifyOfflineLicense({ licensePath });
    if (typeof entitlements.exp !== 'number') return { state: 'invalid', reason: 'it has no expiry date' };
    return { state: 'licensed', ...getDetails(entitlements), expiresAt: new Date(entitlements.exp * 1000) };
  } catch (error: any) {
    if (error?.code === 'LICENSE_EXPIRED') {
      const claims = readClaims(licensePath);
      return { state: 'expired', ...getDetails(claims), expiresAt: toDate(claims.exp) };
    }
    return { state: 'invalid', reason: INVALID_REASONS[error?.code] || error?.message || String(error) };
  } finally {
    console.error = consoleError;
  }
};
