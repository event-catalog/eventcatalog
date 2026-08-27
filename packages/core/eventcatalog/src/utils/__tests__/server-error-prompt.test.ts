import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { VERSION as CORE_VERSION } from '../../../../src/constants';
import {
  BUG_REPORT_ISSUE_URL,
  buildAgentBugPrompt,
  EVENTCATALOG_REPO_URL,
  getBugFormOutputLabel,
  getErrorMessage,
  getErrorStack,
  getPlatformLabel,
  PAGE_URL_PLACEHOLDER,
  USER_AGENT_PLACEHOLDER,
  VERSION,
} from '../server-error-prompt';

const corePackageJson = JSON.parse(
  readFileSync(path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../../package.json'), 'utf8')
) as { version: string };

describe('server-error-prompt', () => {
  it('reuses VERSION from @eventcatalog/core constants instead of hardcoding it', () => {
    expect(VERSION).toBe(CORE_VERSION);
    expect(VERSION).toBe(corePackageJson.version);
    expect(VERSION).toMatch(/^\d+\.\d+\.\d+/);
  });

  describe('getErrorMessage', () => {
    it('uses the Error message when present', () => {
      expect(getErrorMessage(new Error('Unable to load domain'))).toBe('Unable to load domain');
    });

    it('uses a non-empty string error as-is', () => {
      expect(getErrorMessage('render failed')).toBe('render failed');
    });

    it('falls back to a generic message when no error is provided', () => {
      expect(getErrorMessage(undefined)).toBe('An unexpected error occurred while rendering this page.');
      expect(getErrorMessage(null)).toBe('An unexpected error occurred while rendering this page.');
    });

    it('serializes unknown objects instead of dumping [object Object]', () => {
      expect(getErrorMessage({ code: 'ENOTFOUND' })).toBe('{"code":"ENOTFOUND"}');
    });
  });

  describe('getErrorStack', () => {
    it('returns the stack from an Error', () => {
      const error = new Error('boom');
      expect(getErrorStack(error)).toContain('Error: boom');
    });

    it('returns undefined for non-Error values', () => {
      expect(getErrorStack('boom')).toBeUndefined();
      expect(getErrorStack({ message: 'boom' })).toBeUndefined();
    });
  });

  describe('getPlatformLabel', () => {
    it('maps Node process.platform values to the bug form options', () => {
      expect(getPlatformLabel('darwin')).toBe('MacOS');
      expect(getPlatformLabel('linux')).toBe('Linux');
      expect(getPlatformLabel('win32')).toBe('Windows');
      expect(getPlatformLabel('freebsd')).toBe('Other');
    });
  });

  describe('getBugFormOutputLabel', () => {
    it('maps isSSR() to the bug.yml Output dropdown labels', () => {
      expect(getBugFormOutputLabel(false)).toBe('Static');
      expect(getBugFormOutputLabel(true)).toBe('Server (Server Side Rendering)');
    });
  });

  describe('buildAgentBugPrompt', () => {
    const prompt = buildAgentBugPrompt({
      errorMessage: 'Cannot read properties of undefined (reading "data")',
      errorStack: 'Error: Cannot read properties of undefined\n    at renderPage',
      pageUrl: 'http://localhost:3000/docs/services/Orders/1.0.0',
      userAgent: 'Mozilla/5.0 TestAgent',
      eventCatalogVersion: '4.8.2',
      isSSR: false,
      isDevMode: true,
      nodeVersion: 'v22.14.0',
      platform: 'darwin',
    });

    it('tells an agent to file a bug on event-catalog/eventcatalog using the existing bug.yml form', () => {
      expect(prompt).toContain(EVENTCATALOG_REPO_URL);
      expect(prompt).toContain(BUG_REPORT_ISSUE_URL);
      expect(prompt).toContain('GitHub YAML issue forms cannot be URL-prefilled');
    });

    it('includes the bug.yml field labels and diagnostic details', () => {
      expect(prompt).toContain('### I tried this:');
      expect(prompt).toContain('### This happened:');
      expect(prompt).toContain('### I expected this:');
      expect(prompt).toContain('### EventCatalog Version:');
      expect(prompt).toContain('@eventcatalog/core@4.8.2');
      expect(prompt).toContain('### Output:');
      expect(prompt).toContain('Static');
      expect(prompt).toContain('### Node.js Version:');
      expect(prompt).toContain('v22.14.0');
      expect(prompt).toContain('### Platform(s):');
      expect(prompt).toContain('MacOS');
      expect(prompt).toContain('http://localhost:3000/docs/services/Orders/1.0.0');
      expect(prompt).toContain('Mozilla/5.0 TestAgent');
      expect(prompt).toContain('Cannot read properties of undefined (reading "data")');
      expect(prompt).toContain('EVENTCATALOG_DEV_MODE: true');
      expect(prompt).toContain('isSSR(): false');
    });

    it('instructs the agent not to invent features or include secrets, catalog content, or HybridPage 404s', () => {
      expect(prompt).toContain('Do not invent features');
      expect(prompt).toContain('Do not include secrets, credentials, tokens, environment variable values, or catalog content');
      expect(prompt).toContain('HybridPage missing resources throw an empty 404 Response, not a 500');
    });

    it('includes a development stack when one is provided', () => {
      expect(prompt).toContain('at renderPage');
    });

    it('omits the stack when it was not captured', () => {
      const withoutStack = buildAgentBugPrompt({
        errorMessage: 'boom',
        eventCatalogVersion: VERSION,
      });

      expect(withoutStack).not.toContain('Stack (captured in development only');
      expect(withoutStack).toContain(`@eventcatalog/core@${VERSION}`);
    });

    it('uses placeholders for page URL and user agent so the 500 page can fill them at copy time', () => {
      const withPlaceholders = buildAgentBugPrompt({
        errorMessage: 'boom',
      });

      expect(withPlaceholders).toContain(PAGE_URL_PLACEHOLDER);
      expect(withPlaceholders).toContain(USER_AGENT_PLACEHOLDER);
    });
  });
});
