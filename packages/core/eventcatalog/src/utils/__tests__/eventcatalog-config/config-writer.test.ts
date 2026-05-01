import { describe, expect, it } from 'vitest';
import { applyConfigUpdate } from '@utils/eventcatalog-config/config-writer';

const FULL_EXAMPLE = `import path from "path";
import url from "url";

const __dirname = path.dirname(url.fileURLToPath(import.meta.url));

/** @type {import('../../bin/eventcatalog.config').Config} */
export default {
  cId: '8027010c-f3d6-417a-8234-e2f46087fc56',
  title: 'FlowMart',
  tagline: 'Demo catalog tagline.',
  organizationName: 'FlowMart',
  homepageLink: 'https://eventcatalog.dev',
  // editUrl is commented out intentionally
  // editUrl: 'https://github.com/event-catalog/eventcatalog/edit/main',
  port: 3000,
  outDir: 'dist',
  logo: {
    alt: 'FlowMart',
    // src: '/logo.png',
    text: 'FlowMart',
  },
  // Theme: 'default', 'ocean', 'sapphire', 'sunset', 'forest'
  theme: 'default',
};
`;

const MINIMAL = `export default {
  cId: 'abc',
  title: 'Hello',
};
`;

const NO_LOGO = `export default {
  title: 'Hello',
  theme: 'ocean',
};
`;

const LOGO_NO_ALT = `export default {
  title: 'Hello',
  logo: {
    text: 'Hi',
  },
};
`;

describe('config-writer: applyConfigUpdate', () => {
  describe('replace existing string property', () => {
    it('replaces the title and preserves everything else byte-identical', () => {
      const result = applyConfigUpdate(FULL_EXAMPLE, { title: 'NewTitle' });
      expect(result).toContain("title: 'NewTitle'");
      // imports preserved
      expect(result).toContain('import path from "path"');
      expect(result).toContain('import url from "url"');
      // computed dirname preserved
      expect(result).toContain('const __dirname = path.dirname(url.fileURLToPath(import.meta.url))');
      // JSDoc preserved
      expect(result).toContain("/** @type {import('../../bin/eventcatalog.config').Config} */");
      // commented-out lines preserved
      expect(result).toContain('// editUrl is commented out intentionally');
      expect(result).toContain("// editUrl: 'https://github.com/event-catalog/eventcatalog/edit/main'");
      expect(result).toContain("// src: '/logo.png'");
      expect(result).toContain("// Theme: 'default', 'ocean', 'sapphire', 'sunset', 'forest'");
      // unchanged fields preserved verbatim
      expect(result).toContain("cId: '8027010c-f3d6-417a-8234-e2f46087fc56'");
      expect(result).toContain('port: 3000');
      expect(result).toContain("outDir: 'dist'");
      expect(result).toContain("theme: 'default'");
    });

    it('replaces nested logo.text', () => {
      const result = applyConfigUpdate(FULL_EXAMPLE, { logo: { text: 'NewLogo' } });
      expect(result).toContain("text: 'NewLogo'");
      expect(result).toContain("alt: 'FlowMart'"); // sibling preserved
      expect(result).toContain("// src: '/logo.png'"); // comment inside logo preserved
    });
  });

  describe('insert missing property', () => {
    it('inserts editUrl when absent', () => {
      const result = applyConfigUpdate(MINIMAL, { editUrl: 'https://example.com' });
      expect(result).toContain("editUrl: 'https://example.com'");
      expect(result).toContain("title: 'Hello'");
      expect(result).toContain("cId: 'abc'");
    });

    it('inserts the entire logo object when absent', () => {
      const result = applyConfigUpdate(NO_LOGO, { logo: { text: 'New', alt: 'NewAlt' } });
      expect(result).toContain('logo:');
      expect(result).toContain("text: 'New'");
      expect(result).toContain("alt: 'NewAlt'");
      expect(result).toContain("title: 'Hello'");
      expect(result).toContain("theme: 'ocean'");
    });

    it('inserts a missing nested property without disturbing existing ones', () => {
      const result = applyConfigUpdate(LOGO_NO_ALT, { logo: { alt: 'AddedAlt' } });
      expect(result).toContain("alt: 'AddedAlt'");
      expect(result).toContain("text: 'Hi'");
    });
  });

  describe('remove property', () => {
    it('removes a top-level property when value is null', () => {
      const result = applyConfigUpdate(FULL_EXAMPLE, { tagline: null });
      expect(result).not.toContain('tagline:');
      expect(result).toContain("title: 'FlowMart'");
    });

    it('removes a nested property when value is null', () => {
      const result = applyConfigUpdate(FULL_EXAMPLE, { logo: { alt: null } });
      // alt should be gone, text should remain
      expect(result).not.toMatch(/^\s*alt:/m);
      expect(result).toContain("text: 'FlowMart'");
    });

    it('removes the parent object if all its properties become null', () => {
      const result = applyConfigUpdate(LOGO_NO_ALT, { logo: { text: null } });
      expect(result).not.toContain('logo:');
      expect(result).toContain("title: 'Hello'");
    });
  });

  describe('no-op write', () => {
    it('produces functionally equivalent source when setting an existing value to itself', () => {
      const result = applyConfigUpdate(FULL_EXAMPLE, { title: 'FlowMart' });
      // Recast may re-print the touched node, but everything else must match
      expect(result).toContain("title: 'FlowMart'");
      expect(result).toContain('import path from "path"');
      expect(result).toContain('// editUrl is commented out intentionally');
      expect(result).toContain("// src: '/logo.png'");
      expect(result).toContain('port: 3000');
    });
  });

  describe('multiple updates in one call', () => {
    it('applies a top-level change, a nested change, and a removal together', () => {
      const result = applyConfigUpdate(FULL_EXAMPLE, {
        title: 'Bundle',
        tagline: null,
        logo: { text: 'BundleLogo' },
      });
      expect(result).toContain("title: 'Bundle'");
      expect(result).not.toContain('tagline:');
      expect(result).toContain("text: 'BundleLogo'");
      expect(result).toContain("alt: 'FlowMart'"); // untouched nested sibling
      expect(result).toContain('import path from "path"'); // imports still here
    });
  });

  describe('boolean values', () => {
    it('inserts a nested boolean property when absent', () => {
      const result = applyConfigUpdate(MINIMAL, { llmsTxt: { enabled: true } });
      expect(result).toMatch(/llmsTxt:\s*{[^}]*enabled:\s*true/);
    });

    it('replaces a nested boolean property in place', () => {
      const source = `export default {
  title: 'Hello',
  llmsTxt: {
    enabled: true,
  },
};
`;
      const result = applyConfigUpdate(source, { llmsTxt: { enabled: false } });
      expect(result).toMatch(/enabled:\s*false/);
      expect(result).not.toMatch(/enabled:\s*true/);
    });

    it('sets a top-level boolean property', () => {
      const result = applyConfigUpdate(MINIMAL, { trailingSlash: true });
      expect(result).toMatch(/trailingSlash:\s*true/);
    });
  });
});
