import {
  isEventCatalogStarterEnabled,
  isEventCatalogScaleEnabled,
  isCustomDocsEnabled,
  isEventCatalogChatEnabled,
  isEventCatalogUpgradeEnabled,
  isCustomLandingPageEnabled,
} from '../feature';

describe('features', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    // Reset the environment before each test
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe('isEventCatalogStarterEnabled', () => {
    it('should return true when EVENTCATALOG_STARTER is true', () => {
      process.env.EVENTCATALOG_STARTER = 'true';
      expect(isEventCatalogStarterEnabled()).toBe(true);
    });

    it('should return false when EVENTCATALOG_STARTER is not true', () => {
      process.env.EVENTCATALOG_STARTER = 'false';
      expect(isEventCatalogStarterEnabled()).toBe(false);
    });

    it('should return false when EVENTCATALOG_STARTER is not set', () => {
      delete process.env.EVENTCATALOG_STARTER;
      expect(isEventCatalogStarterEnabled()).toBe(false);
    });
  });

  describe('isEventCatalogScaleEnabled', () => {
    it('should return true when EVENTCATALOG_SCALE is true', () => {
      process.env.EVENTCATALOG_SCALE = 'true';
      expect(isEventCatalogScaleEnabled()).toBe(true);
    });

    it('should return false when EVENTCATALOG_SCALE is not true', () => {
      process.env.EVENTCATALOG_SCALE = 'false';
      expect(isEventCatalogScaleEnabled()).toBe(false);
    });

    it('should return false when EVENTCATALOG_SCALE is not set', () => {
      delete process.env.EVENTCATALOG_SCALE;
      expect(isEventCatalogScaleEnabled()).toBe(false);
    });
  });

  describe('isCustomDocsEnabled', () => {
    it('should return true when EVENTCATALOG_STARTER is true', () => {
      process.env.EVENTCATALOG_STARTER = 'true';
      expect(isCustomDocsEnabled()).toBe(true);
    });

    it('should return true when EVENTCATALOG_SCALE is true', () => {
      process.env.EVENTCATALOG_SCALE = 'true';
      expect(isCustomDocsEnabled()).toBe(true);
    });

    it('should return false when neither feature is enabled', () => {
      delete process.env.EVENTCATALOG_STARTER;
      delete process.env.EVENTCATALOG_SCALE;
      expect(isCustomDocsEnabled()).toBe(false);
    });
  });

  describe('isEventCatalogChatEnabled', () => {
    it('should return true when EVENTCATALOG_STARTER is true', () => {
      process.env.EVENTCATALOG_STARTER = 'true';
      expect(isEventCatalogChatEnabled()).toBe(true);
    });

    it('should return true when EVENTCATALOG_SCALE is true', () => {
      process.env.EVENTCATALOG_SCALE = 'true';
      expect(isEventCatalogChatEnabled()).toBe(true);
    });

    it('should return false when neither feature is enabled', () => {
      delete process.env.EVENTCATALOG_STARTER;
      delete process.env.EVENTCATALOG_SCALE;
      expect(isEventCatalogChatEnabled()).toBe(false);
    });
  });

  describe('isEventCatalogUpgradeEnabled', () => {
    it('should return true when neither STARTER nor SCALE is enabled', () => {
      delete process.env.EVENTCATALOG_STARTER;
      delete process.env.EVENTCATALOG_SCALE;
      expect(isEventCatalogUpgradeEnabled()).toBe(true);
    });

    it('should return false when EVENTCATALOG_STARTER is true', () => {
      process.env.EVENTCATALOG_STARTER = 'true';
      expect(isEventCatalogUpgradeEnabled()).toBe(false);
    });

    it('should return false when EVENTCATALOG_SCALE is true', () => {
      process.env.EVENTCATALOG_SCALE = 'true';
      expect(isEventCatalogUpgradeEnabled()).toBe(false);
    });
  });

  describe('isCustomLandingPageEnabled', () => {
    it('should return true when EVENTCATALOG_STARTER is true', () => {
      process.env.EVENTCATALOG_STARTER = 'true';
      expect(isCustomLandingPageEnabled()).toBe(true);
    });

    it('should return true when EVENTCATALOG_SCALE is true', () => {
      process.env.EVENTCATALOG_SCALE = 'true';
      expect(isCustomLandingPageEnabled()).toBe(true);
    });

    it('should return false when neither feature is enabled', () => {
      delete process.env.EVENTCATALOG_STARTER;
      delete process.env.EVENTCATALOG_SCALE;
      expect(isCustomLandingPageEnabled()).toBe(false);
    });
  });
});
