import { expect } from 'vitest';

interface CliCustomMatchers<R = unknown> {
  toEqualDsl: (expected: string) => R;
}

declare module 'vitest' {
  interface Assertion<T = any> extends CliCustomMatchers<T> {}
  interface AsymmetricMatchersContaining extends CliCustomMatchers {}
}

declare global {
  var dsl: (strings: TemplateStringsArray, ...values: unknown[]) => string;

  namespace vitest {
    interface Assertion<T> {
      toEqualDsl(expected: string): T;
    }
  }
}

function dedentBlock(input: string): string {
  const normalizedNewlines = input.replace(/\r\n/g, '\n');
  const lines = normalizedNewlines.split('\n');

  while (lines.length > 0 && lines[0].trim() === '') lines.shift();
  while (lines.length > 0 && lines[lines.length - 1].trim() === '') lines.pop();

  const nonEmptyLines = lines.filter((line) => line.trim().length > 0);
  const indents = nonEmptyLines.map((line) => {
    const match = line.match(/^[ \t]*/);
    return match ? match[0].length : 0;
  });
  const minIndent = indents.length > 0 ? Math.min(...indents) : 0;

  return lines
    .map((line) => line.replace(new RegExp(`^[ \\t]{0,${minIndent}}`), ''))
    .map((line) => line.replace(/[ \t]+$/g, ''))
    .join('\n');
}

function dsl(strings: TemplateStringsArray, ...values: unknown[]): string {
  const raw = String.raw({ raw: strings }, ...values);
  return dedentBlock(raw);
}

globalThis.dsl = dsl;

expect.extend({
  toEqualDsl(received: unknown, expected: string) {
    if (typeof received !== 'string') {
      return {
        pass: false,
        message: () => `expected a string, but received ${typeof received}`,
      };
    }

    const normalizedReceived = dedentBlock(received);
    const normalizedExpected = dedentBlock(expected);
    const pass = normalizedReceived === normalizedExpected;

    return {
      pass,
      message: () =>
        pass
          ? `expected DSL not to be equal:\n${normalizedExpected}`
          : `expected DSL to be equal.\n\nReceived:\n${normalizedReceived}\n\nExpected:\n${normalizedExpected}`,
    };
  },
});
