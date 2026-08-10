import { describe, expect, it } from 'vitest';
import { InvalidIndexError, parseIndex } from '../parse-index';

const validIndex = {
  indexVersion: 1,
  source: 'acme/payments',
  commit: '4a1b7e2',
  resources: [
    {
      type: 'service',
      id: 'payment-service',
      version: '1.0.0',
      name: 'Payment Service',
      contentPath: 'services/payment-service/index.mdx',
      contentHash: 'sha256:3e63897b7cc3a92411599289d00d686f1b1fc8e336927efa46101c8943410c70',
      receives: [{ id: 'payment-requested', version: '2.0.0' }],
    },
  ],
};

describe('parseIndex', () => {
  it('parses a valid federation index', () => {
    expect(parseIndex(validIndex)).toEqual(validIndex);
  });

  it('rejects an unsupported index version', () => {
    expect(() => parseIndex({ ...validIndex, indexVersion: 2 })).toThrow(
      new InvalidIndexError([{ path: ['indexVersion'], message: 'Invalid input: expected 1' }])
    );
  });

  it('reports the path to a malformed nested pointer', () => {
    const input = structuredClone(validIndex);
    input.resources[0].receives = [{ version: '2.0.0' } as { id: string; version: string }];

    expect(() => parseIndex(input)).toThrow(
      new InvalidIndexError([
        {
          path: ['resources', 0, 'receives', 0, 'id'],
          message: 'Invalid input: expected string, received undefined',
        },
      ])
    );
  });

  it('rejects a malformed content hash', () => {
    const input = structuredClone(validIndex);
    input.resources[0].contentHash = 'sha256:not-a-digest';

    expect(() => parseIndex(input)).toThrow(
      new InvalidIndexError([
        {
          path: ['resources', 0, 'contentHash'],
          message: 'Expected a full sha256 digest',
        },
      ])
    );
  });

  it('rejects unknown index fields', () => {
    expect(() => parseIndex({ ...validIndex, unexpected: true })).toThrow(
      new InvalidIndexError([{ path: [], message: 'Unrecognized key: "unexpected"' }])
    );
  });
});
