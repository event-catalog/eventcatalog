import { beforeEach, describe, expect, it, vi } from 'vitest';

const license = vi.hoisted(() => ({
  isEventCatalogEnterpriseEnabled: vi.fn<() => Promise<boolean>>(),
}));

vi.mock('@eventcatalog/license', () => license);

import { isFederationEnabled } from '../federation/entitlement';

describe('federation entitlement', () => {
  beforeEach(() => {
    license.isEventCatalogEnterpriseEnabled.mockReset();
  });

  it('uses the EventCatalog Enterprise entitlement', async () => {
    license.isEventCatalogEnterpriseEnabled.mockResolvedValueOnce(true);

    await expect(isFederationEnabled()).resolves.toBe(true);
    expect(license.isEventCatalogEnterpriseEnabled).toHaveBeenCalledOnce();
  });
});
