import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { findFiles } from '../src/utils/find-files';

describe('findFiles', () => {
  let tempDir: string;

  const write = (file: string) => {
    fs.mkdirSync(path.dirname(path.join(tempDir, file)), { recursive: true });
    fs.writeFileSync(path.join(tempDir, file), '---\n---\n');
  };

  beforeEach(() => {
    tempDir = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'eventcatalog-find-files-')));
    write('systems/billing/index.mdx');
    write('systems/billing/services/invoices/index.mdx');
    write('systems/billing/dist/index.mdx');
  });

  afterEach(() => {
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  it('leaves out files matching a pattern starting with "!"', async () => {
    const files = await findFiles(['**/systems/**/index.{md,mdx}', '!**/systems/**/services/**'], {
      cwd: tempDir,
      ignore: ['**/dist/**'],
    });

    expect(files.map((file) => file.split(path.sep).join('/'))).toEqual(['systems/billing/index.mdx']);
  });

  it('returns absolute paths when asked', async () => {
    const files = await findFiles(['systems/*/index.mdx'], { cwd: tempDir, absolute: true });

    expect(files).toEqual([path.join(tempDir, 'systems/billing/index.mdx')]);
  });
});
