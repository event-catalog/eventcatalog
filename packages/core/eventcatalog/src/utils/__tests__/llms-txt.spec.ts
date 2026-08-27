import { describe, expect, it } from 'vitest';
import { formatVersionedItem, joinLlmsItems, renderUbiquitousLanguages, ubiquitousLanguageMarkdownUrl } from '@utils/llms-txt';

describe('llms.txt formatting', () => {
  it('joins catalog entries with newlines so each resource is on its own line', () => {
    const events = [
      { data: { id: 'vessel-arrived', name: 'Vessel Arrived', version: '1.0.0', summary: 'Ship is alongside.' } },
      { data: { id: 'berth-allocated', name: 'Berth Allocated', version: '2.0.0', summary: 'Quay window reserved.' } },
    ];

    const section = joinLlmsItems(events.map((item) => formatVersionedItem('http://localhost:3000', item, 'events')));

    expect(section).toBe(
      [
        '- [Vessel Arrived - vessel-arrived - 1.0.0 ](http://localhost:3000/docs/events/vessel-arrived/1.0.0.mdx) - Ship is alongside.',
        '- [Berth Allocated - berth-allocated - 2.0.0 ](http://localhost:3000/docs/events/berth-allocated/2.0.0.mdx) - Quay window reserved.',
      ].join('\n')
    );
    expect(section).not.toContain('alongside.- [Berth');
  });

  it('keeps hyphenated domain ids intact in ubiquitous language markdown URLs', () => {
    expect(ubiquitousLanguageMarkdownUrl('http://localhost:3000', 'vessel-operations')).toBe(
      'http://localhost:3000/docs/domains/vessel-operations/language.mdx'
    );
  });

  it('renders ubiquitous language links from the domain resource id, not the collection id', () => {
    const section = renderUbiquitousLanguages(
      'http://localhost:3000',
      [{ id: 'vessel-operations-1.0.0', data: { id: 'vessel-operations', name: 'Vessel Operations' } }],
      {
        'vessel-operations-1.0.0': [
          {
            properties: [{ name: 'Vessel Visit', summary: 'A single call of a ship at this terminal.' }],
          },
        ],
      }
    );

    expect(section).toContain('/docs/domains/vessel-operations/language.mdx');
    expect(section).not.toContain('/docs/domains/vessel/language.mdx');
    expect(section).toContain('Vessel Operations Domain');
  });
});
