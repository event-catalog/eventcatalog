import { describe, it, expect, vi, afterEach } from 'vitest';
import { reportErrors } from '../src/reporters';
import { ValidationError } from '../src/types';

const error = (overrides: Partial<ValidationError>): ValidationError => ({
  type: 'schema',
  resource: 'service/a',
  message: 'Something is wrong',
  file: 'services/a/index.mdx',
  severity: 'error',
  rule: 'schema/required-fields',
  line: 2,
  column: 1,
  ...overrides,
});

const captureOutput = () => {
  const lines: string[] = [];
  vi.spyOn(console, 'log').mockImplementation((...args: unknown[]) => {
    lines.push(args.join(' '));
  });
  return lines;
};

describe('reportErrors summary', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('reports the number of files checked and ignored, not the number of files with problems', () => {
    const lines = captureOutput();

    const summary = reportErrors(
      [error({}), error({ file: 'services/b/index.mdx', severity: 'warning', rule: 'best-practices/description-required' })],
      [],
      { filesChecked: 40, filesIgnored: 3 }
    );

    expect(summary).toMatchObject({ totalErrors: 1, totalWarnings: 1, filesChecked: 40, filesIgnored: 3, filesWithErrors: 2 });
    const output = lines.join('\n');
    expect(output).toContain('2 problems (1 error, 1 warning) in 2 files');
    expect(output).toContain('40 files checked, 3 files ignored');
  });

  it('prints the checked count once on success', () => {
    const lines = captureOutput();

    const summary = reportErrors([], [], { filesChecked: 1 });

    expect(summary.filesChecked).toBe(1);
    expect(lines.filter((line) => line.includes('file checked'))).toHaveLength(1);
    expect(lines.join('\n')).toContain('1 file checked');
    expect(lines.join('\n')).not.toContain('ignored');
  });

  it('drops warnings entirely in quiet mode', () => {
    const lines = captureOutput();

    const summary = reportErrors([error({ severity: 'warning', rule: 'best-practices/description-required' })], [], {
      quiet: true,
      filesChecked: 1,
    });

    expect(summary.totalWarnings).toBe(0);
    expect(lines.join('\n')).toContain('No problems found');
  });

  it('pluralises correctly', () => {
    const lines = captureOutput();

    reportErrors([error({})], [], { filesChecked: 1 });

    expect(lines.join('\n')).toContain('1 problem (1 error, 0 warnings) in 1 file');
  });

  it('still accepts the legacy boolean verbose argument', () => {
    captureOutput();
    expect(() => reportErrors([error({})], [], true)).not.toThrow();
  });
});
