/**
 * Licensed under the EventCatalog Commercial License.
 * See /packages/core/eventcatalog/src/enterprise/LICENSE
 */

import { describe, it, expect } from 'vitest';
import { chunkMarkdownByHeadings, buildDocsSearchIndex, extractSnippet } from '../utils/docs-search';

describe('chunkMarkdownByHeadings', () => {
  it('splits markdown into sections by headings, keeping heading text and content', () => {
    const markdown = [
      'Some intro text before any heading.',
      '',
      '## Refund failures',
      'How to handle refund failures.',
      '',
      '### Escalation',
      'Escalate to the payments team.',
      '',
      '## Chargeback handling',
      'Chargebacks are handled weekly.',
    ].join('\n');

    const chunks = chunkMarkdownByHeadings(markdown);

    expect(chunks).toEqual([
      { heading: null, content: 'Some intro text before any heading.' },
      { heading: 'Refund failures', content: 'How to handle refund failures.' },
      { heading: 'Escalation', content: 'Escalate to the payments team.' },
      { heading: 'Chargeback handling', content: 'Chargebacks are handled weekly.' },
    ]);
  });

  it('returns a single chunk with null heading when there are no headings', () => {
    const chunks = chunkMarkdownByHeadings('Just a short doc with no headings.');
    expect(chunks).toEqual([{ heading: null, content: 'Just a short doc with no headings.' }]);
  });

  it('does not treat lines inside fenced code blocks as headings', () => {
    const markdown = ['## Setup', '```bash', '# this is a comment, not a heading', 'echo hello', '```', 'Done.'].join('\n');

    const chunks = chunkMarkdownByHeadings(markdown);

    expect(chunks).toHaveLength(1);
    expect(chunks[0].heading).toBe('Setup');
    expect(chunks[0].content).toContain('# this is a comment, not a heading');
  });

  it('returns no chunks for empty markdown', () => {
    expect(chunkMarkdownByHeadings('')).toEqual([]);
  });
});

describe('buildDocsSearchIndex', () => {
  const docs = [
    {
      id: 'docs/payments/runbook',
      title: 'Payment Runbook',
      summary: 'How we operate payments',
      body: [
        '## Refund failures',
        'When a refund fails, retry the refund three times.',
        '## Chargeback handling',
        'Chargebacks are disputed via the acquirer portal.',
      ].join('\n'),
    },
    {
      id: 'docs/onboarding',
      title: 'Onboarding Guide',
      summary: 'Getting started as a new engineer',
      body: ['## First week', 'Set up your laptop and request access to the acquirer portal.'].join('\n'),
    },
    {
      id: 'docs/chargebacks',
      title: 'Chargeback Policy',
      summary: 'Company policy for chargebacks',
      body: 'We follow the network rules for all disputes.',
    },
  ];

  it('finds documents by terms in the body and returns the matched section heading', () => {
    const index = buildDocsSearchIndex(docs);
    const results = index.search('refund fails');

    expect(results.length).toBeGreaterThan(0);
    expect(results[0].docId).toBe('docs/payments/runbook');
    expect(results[0].heading).toBe('Refund failures');
    expect(results[0].title).toBe('Payment Runbook');
  });

  it('ranks title matches above body-only matches', () => {
    const index = buildDocsSearchIndex(docs);
    const results = index.search('chargeback');

    // 'Chargeback Policy' matches on title; runbook only matches in a section
    expect(results[0].docId).toBe('docs/chargebacks');
  });

  it('includes a snippet containing the matched term', () => {
    const index = buildDocsSearchIndex(docs);
    const results = index.search('acquirer portal');

    expect(results[0].snippet.toLowerCase()).toContain('acquirer portal');
  });

  it('returns an empty array when nothing matches', () => {
    const index = buildDocsSearchIndex(docs);
    expect(index.search('zzzzz-nonexistent-term')).toEqual([]);
  });

  it('respects the limit option', () => {
    const index = buildDocsSearchIndex(docs);
    const results = index.search('chargeback', { limit: 1 });
    expect(results).toHaveLength(1);
  });
});

describe('extractSnippet', () => {
  it('returns text around the first matched term with ellipses for long content', () => {
    const padding = 'lorem ipsum dolor sit amet '.repeat(20);
    const content = `${padding}the acquirer portal is used for disputes ${padding}`;

    const snippet = extractSnippet(content, 'acquirer');

    expect(snippet).toContain('acquirer portal');
    expect(snippet.length).toBeLessThan(content.length);
    expect(snippet.startsWith('…')).toBe(true);
    expect(snippet.endsWith('…')).toBe(true);
  });

  it('falls back to the start of the content when no term matches', () => {
    const content = 'A short description of something.';
    expect(extractSnippet(content, 'nonexistent')).toBe('A short description of something.');
  });
});
