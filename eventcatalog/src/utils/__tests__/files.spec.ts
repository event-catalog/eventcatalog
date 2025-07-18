import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import path from 'node:path';
import { getAbsoluteFilePathForAstroFile } from '../files';

describe('getAbsoluteFilePathForAstroFile', () => {
  let originalProjectDir: string | undefined;
  let originalCwd: string;

  beforeEach(() => {
    // Store original values
    originalProjectDir = process.env.PROJECT_DIR;
    originalCwd = process.cwd();
  });

  afterEach(() => {
    // Restore original values
    if (originalProjectDir) {
      process.env.PROJECT_DIR = originalProjectDir;
    } else {
      delete process.env.PROJECT_DIR;
    }
    process.chdir(originalCwd);
  });

  describe('with PROJECT_DIR environment variable', () => {
    beforeEach(() => {
      process.env.PROJECT_DIR = '/test/project';
    });

    it('should return absolute path for filePath only', () => {
      const result = getAbsoluteFilePathForAstroFile('src/components/Button.tsx');
      expect(result).toBe(path.join('/test/project', '../', 'src/components/Button.tsx'));
    });

    it('should return absolute path for filePath and fileName', () => {
      const result = getAbsoluteFilePathForAstroFile('src/components/', 'Button.tsx');
      expect(result).toBe(path.join('/test/project', '../', 'src', 'Button.tsx'));
    });

    it('should handle nested directory paths', () => {
      const result = getAbsoluteFilePathForAstroFile('src/utils/helpers/index.ts');
      expect(result).toBe(path.join('/test/project', '../', 'src/utils/helpers/index.ts'));
    });

    it('should handle directory path with fileName', () => {
      const result = getAbsoluteFilePathForAstroFile('src/utils/helpers/', 'index.ts');
      expect(result).toBe(path.join('/test/project', '../', 'src/utils', 'index.ts'));
    });

    it('should handle root level files', () => {
      const result = getAbsoluteFilePathForAstroFile('package.json');
      expect(result).toBe(path.join('/test/project', '../', 'package.json'));
    });

    it('should handle empty filePath with fileName', () => {
      const result = getAbsoluteFilePathForAstroFile('', 'config.js');
      expect(result).toBe(path.join('/test/project', '../', '.', 'config.js'));
    });
  });

  describe('without PROJECT_DIR environment variable', () => {
    beforeEach(() => {
      delete process.env.PROJECT_DIR;
    });

    it('should use process.cwd() as fallback', () => {
      const result = getAbsoluteFilePathForAstroFile('src/components/Button.tsx');
      expect(result).toBe(path.join(process.cwd(), '../', 'src/components/Button.tsx'));
    });

    it('should use process.cwd() with fileName', () => {
      const result = getAbsoluteFilePathForAstroFile('src/components/', 'Button.tsx');
      expect(result).toBe(path.join(process.cwd(), '../', 'src', 'Button.tsx'));
    });
  });

  describe('edge cases', () => {
    beforeEach(() => {
      process.env.PROJECT_DIR = '/test/project';
    });

    it('should handle undefined filePath with fileName', () => {
      const result = getAbsoluteFilePathForAstroFile(undefined as any, 'config.js');
      expect(result).toBe(path.join('/test/project', '../', '.', 'config.js'));
    });

    it('should handle paths with trailing slashes', () => {
      const result = getAbsoluteFilePathForAstroFile('src/components/', 'Button.tsx');
      expect(result).toBe(path.join('/test/project', '../', 'src', 'Button.tsx'));
    });

    it('should handle paths without trailing slashes', () => {
      const result = getAbsoluteFilePathForAstroFile('src/components', 'Button.tsx');
      expect(result).toBe(path.join('/test/project', '../', 'src', 'Button.tsx'));
    });

    it('should handle Windows-style paths', () => {
      const result = getAbsoluteFilePathForAstroFile('src\\components\\Button.tsx');
      expect(result).toBe(path.join('/test/project', '../', 'src\\components\\Button.tsx'));
    });

    it('should handle relative paths with ../', () => {
      const result = getAbsoluteFilePathForAstroFile('../config/settings.json');
      expect(result).toBe(path.join('/test/project', '../', '../config/settings.json'));
    });

    it('should handle absolute paths', () => {
      const result = getAbsoluteFilePathForAstroFile('/absolute/path/file.txt');
      expect(result).toBe(path.join('/test/project', '../', '/absolute/path/file.txt'));
    });

    it('should handle empty fileName', () => {
      const result = getAbsoluteFilePathForAstroFile('src/components/', '');
      expect(result).toBe(path.join('/test/project', '../', 'src/components/'));
    });

    it('should handle undefined fileName (should use filePath only)', () => {
      const result = getAbsoluteFilePathForAstroFile('src/components/Button.tsx', undefined);
      expect(result).toBe(path.join('/test/project', '../', 'src/components/Button.tsx'));
    });

    it('should handle null fileName (should use filePath only)', () => {
      const result = getAbsoluteFilePathForAstroFile('src/components/Button.tsx', null as any);
      expect(result).toBe(path.join('/test/project', '../', 'src/components/Button.tsx'));
    });
  });

  describe('path normalization', () => {
    beforeEach(() => {
      process.env.PROJECT_DIR = '/test/project';
    });

    it('should normalize paths correctly', () => {
      const result = getAbsoluteFilePathForAstroFile('src/./components/../utils/helper.ts');
      expect(result).toBe(path.join('/test/project', '../', 'src/./components/../utils/helper.ts'));
    });

    it('should handle multiple slashes', () => {
      const result = getAbsoluteFilePathForAstroFile('src//components//Button.tsx');
      expect(result).toBe(path.join('/test/project', '../', 'src//components//Button.tsx'));
    });
  });
});
