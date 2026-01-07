import path from 'path';
import {
  isEventCatalogStarterEnabled,
  isEventCatalogScaleEnabled,
  isCustomDocsEnabled,
  isEventCatalogChatEnabled,
  isEventCatalogUpgradeEnabled,
  isCustomLandingPageEnabled,
  isMarkdownDownloadEnabled,
  showEventCatalogBranding,
  showCustomBranding,
  isPrivateRemoteSchemaEnabled,
  isCustomStylesEnabled,
} from '../feature';

import config from '@config';
import fs from 'fs';

vi.mock('@config', () => ({
  default: {
    llmsTxt: {
      enabled: false,
    },
    chat: {
      enabled: true,
    },
  },
}));

describe('features', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    // Reset the environment before each test
    process.env = { ...originalEnv };

    // Set the project directory to the examples/default directory
    process.env.PROJECT_DIR = path.join(__dirname, 'catalog');

    // Create the catalog directory if it doesn't exist
    fs.mkdirSync(process.env.PROJECT_DIR, { recursive: true });
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

  describe('isPrivateRemoteSchemaEnabled', () => {
    it('should return true when EVENTCATALOG_STARTER is true', () => {
      process.env.EVENTCATALOG_STARTER = 'true';
      expect(isPrivateRemoteSchemaEnabled()).toBe(true);
    });

    it('should return true when EVENTCATALOG_SCALE is true', () => {
      process.env.EVENTCATALOG_SCALE = 'true';
      expect(isPrivateRemoteSchemaEnabled()).toBe(true);
    });

    it('should return false when neither feature is enabled', () => {
      delete process.env.EVENTCATALOG_STARTER;
      delete process.env.EVENTCATALOG_SCALE;
      expect(isPrivateRemoteSchemaEnabled()).toBe(false);
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
    it('should return true when EVENTCATALOG_STARTER is true, the user has a eventcatalog.chat.js file and isSSR', () => {
      // Create the fake file
      fs.writeFileSync(
        path.join(process.env.PROJECT_DIR || '', 'eventcatalog.chat.js'),
        'export default () => { return { model: "o4-mini" }; }'
      );
      process.env.EVENTCATALOG_STARTER = 'true';
      config.output = 'server';
      expect(isEventCatalogChatEnabled()).toBe(true);

      // Remove the file
      fs.rmSync(path.join(process.env.PROJECT_DIR || '', 'eventcatalog.chat.js'));
    });

    // returns false when no file is found
    it('should return false when no file is found', () => {
      process.env.EVENTCATALOG_STARTER = 'true';
      config.output = 'server';
      expect(isEventCatalogChatEnabled()).toBe(false);
    });

    it('should return false when output is not server', () => {
      fs.writeFileSync(
        path.join(process.env.PROJECT_DIR || '', 'eventcatalog.chat.js'),
        'export default () => { return { model: "o4-mini" }; }'
      );
      process.env.EVENTCATALOG_STARTER = 'true';
      config.output = 'static';

      expect(isEventCatalogChatEnabled()).toBe(false);

      // Remove the file
      fs.rmSync(path.join(process.env.PROJECT_DIR || '', 'eventcatalog.chat.js'));
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

  describe('isMarkdownDownloadEnabled', () => {
    it('returns false when eventcatalog.config.js (llmsTxt.enabled) is false', () => {
      expect(isMarkdownDownloadEnabled()).toBe(false);
    });

    it('returns true when eventcatalog.config.js (llmsTxt.enabled) is true', () => {
      config.llmsTxt.enabled = true;
      expect(isMarkdownDownloadEnabled()).toBe(true);
    });
  });

  describe('showEventCatalogBranding', () => {
    it('should return true when EVENTCATALOG_SHOW_BRANDING is true', () => {
      process.env.EVENTCATALOG_SHOW_BRANDING = 'true';
      expect(showEventCatalogBranding()).toBe(true);
    });

    it('should return true when EVENTCATALOG_SHOW_BRANDING is not set', () => {
      delete process.env.EVENTCATALOG_SHOW_BRANDING;
      expect(showEventCatalogBranding()).toBe(true);
    });

    it('should return false when EVENTCATALOG_STARTER is true', () => {
      process.env.EVENTCATALOG_STARTER = 'true';
      expect(showEventCatalogBranding()).toBe(false);
    });

    it('should return false when EVENTCATALOG_SCALE is true', () => {
      process.env.EVENTCATALOG_SCALE = 'true';
      expect(showEventCatalogBranding()).toBe(false);
    });

    it('should return false when EVENTCATALOG_STARTER and EVENTCATALOG_SCALE are true', () => {
      process.env.EVENTCATALOG_STARTER = 'true';
      process.env.EVENTCATALOG_SCALE = 'true';
      expect(showEventCatalogBranding()).toBe(false);
    });
  });

  describe('showCustomBranding', () => {
    it('should return true when EVENTCATALOG_STARTER is true', () => {
      process.env.EVENTCATALOG_STARTER = 'true';
      expect(showCustomBranding()).toBe(true);
    });

    it('should return true when EVENTCATALOG_SCALE is true', () => {
      process.env.EVENTCATALOG_SCALE = 'true';
      expect(showCustomBranding()).toBe(true);
    });

    it('should return false when neither feature is enabled', () => {
      delete process.env.EVENTCATALOG_STARTER;
      delete process.env.EVENTCATALOG_SCALE;
      expect(showCustomBranding()).toBe(false);
    });

    it('should return false when EVENTCATALOG_SHOW_BRANDING is true', () => {
      process.env.EVENTCATALOG_SHOW_BRANDING = 'true';
      expect(showCustomBranding()).toBe(false);
    });
  });

  describe('isCustomStylesEnabled', () => {
    it('should return true when EVENTCATALOG_STARTER is true', () => {
      process.env.EVENTCATALOG_STARTER = 'true';
      expect(isCustomStylesEnabled()).toBe(true);
    });

    it('should return true when EVENTCATALOG_SCALE is true', () => {
      process.env.EVENTCATALOG_SCALE = 'true';
      expect(isCustomStylesEnabled()).toBe(true);
    });

    it('should return false when neither feature is enabled', () => {
      delete process.env.EVENTCATALOG_STARTER;
      delete process.env.EVENTCATALOG_SCALE;
      expect(isCustomStylesEnabled()).toBe(false);
    });
  });
});
