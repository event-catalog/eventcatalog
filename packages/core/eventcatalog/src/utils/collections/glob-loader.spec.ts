import picomatch from 'picomatch';
import { describe, expect, it } from 'vitest';
import { withFederatedContent } from './glob-loader';

describe('withFederatedContent', () => {
  it('loads root catalog content from every federated source directory', () => {
    const patterns = withFederatedContent(['services/*/index.(md|mdx)', 'domains/*/index.(md|mdx)', '!domains/*/services/**']);

    expect(patterns).toEqual([
      'services/*/index.(md|mdx)',
      'domains/*/index.(md|mdx)',
      '!domains/*/services/**',
      'federated/*/services/*/index.(md|mdx)',
      'federated/*/domains/*/index.(md|mdx)',
      '!federated/*/domains/*/services/**',
    ]);
    expect(picomatch.isMatch('federated/team-payments--abc123/services/payment-service/index.mdx', patterns)).toBe(true);
    expect(picomatch.isMatch('federated/team-payments--abc123/domains/payments/index.mdx', patterns)).toBe(true);
  });
});
