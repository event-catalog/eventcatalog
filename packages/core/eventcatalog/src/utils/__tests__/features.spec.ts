import path from 'path';
import { isCanvasEnabled, isEventCatalogChatEnabled, isEventCatalogChatVisible, isMarkdownDownloadEnabled } from '../feature';

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

  describe('isEventCatalogChatVisible', () => {
    const originalChat = config.chat;

    afterEach(() => {
      config.chat = originalChat;
    });

    it('shows Ask AI by default without server mode or a configuration file', () => {
      config.output = 'static';
      config.chat = undefined;
      expect(isEventCatalogChatVisible()).toBe(true);
      expect(isEventCatalogChatEnabled()).toBe(false);
    });

    it('shows Ask AI when chat settings omit enabled', () => {
      config.chat = {};
      expect(isEventCatalogChatVisible()).toBe(true);
    });

    it('hides Ask AI when explicitly disabled', () => {
      config.chat = { enabled: false };
      expect(isEventCatalogChatVisible()).toBe(false);
      expect(isEventCatalogChatEnabled()).toBe(false);
    });
  });

  describe('isEventCatalogChatEnabled', () => {
    it('should return true when the user has a eventcatalog.chat.js file and isSSR', () => {
      // Create the fake file
      fs.writeFileSync(
        path.join(process.env.PROJECT_DIR || '', 'eventcatalog.chat.js'),
        'export default () => { return { model: "o4-mini" }; }'
      );
      config.output = 'server';
      expect(isEventCatalogChatEnabled()).toBe(true);

      // Remove the file
      fs.rmSync(path.join(process.env.PROJECT_DIR || '', 'eventcatalog.chat.js'));
    });

    // returns false when no file is found
    it('should return false when no file is found', () => {
      config.output = 'server';
      expect(isEventCatalogChatEnabled()).toBe(false);
    });

    it('should return false when output is not server', () => {
      fs.writeFileSync(
        path.join(process.env.PROJECT_DIR || '', 'eventcatalog.chat.js'),
        'export default () => { return { model: "o4-mini" }; }'
      );
      config.output = 'static';

      expect(isEventCatalogChatEnabled()).toBe(false);

      // Remove the file
      fs.rmSync(path.join(process.env.PROJECT_DIR || '', 'eventcatalog.chat.js'));
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

  describe('isCanvasEnabled (Studio)', () => {
    afterEach(() => {
      config.studio = undefined;
      config.auth = undefined;
    });

    it('is on in the dev server, and in production only when studio.enabled is set', () => {
      config.output = 'server';
      process.env.EVENTCATALOG_DEV_MODE = 'true';
      expect(isCanvasEnabled()).toBe(true);
      process.env.EVENTCATALOG_DEV_MODE = 'false';
      expect(isCanvasEnabled()).toBe(false);
      config.studio = { enabled: true };
      expect(isCanvasEnabled()).toBe(true);
    });

    it('is off everywhere when studio.enabled is false, even in the dev server', () => {
      process.env.EVENTCATALOG_DEV_MODE = 'true';
      config.studio = { enabled: false };
      expect(isCanvasEnabled()).toBe(false);
    });

    it('stays on with sign-in on (only signed-in people can open canvases)', () => {
      config.output = 'server';
      config.studio = { enabled: true };
      config.auth = { enabled: true };
      fs.writeFileSync(path.join(process.env.PROJECT_DIR || '', 'eventcatalog.auth.js'), 'export default {};');
      try {
        expect(isCanvasEnabled()).toBe(true);
      } finally {
        fs.rmSync(path.join(process.env.PROJECT_DIR || '', 'eventcatalog.auth.js'));
      }
    });
  });
});
