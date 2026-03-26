import { describe, it, expect } from 'vitest';
import { partitionMessagesByGroup } from '../utils';

const makePointer = (id: string, version: string, group?: string) => ({
  id,
  version,
  ...(group ? { group } : {}),
});

const makeMessage = (id: string, version: string, collection: string) => ({
  data: { id, version },
  collection,
});

describe('partitionMessagesByGroup', () => {
  it('returns all messages as ungrouped when no pointers have group', () => {
    const pointers = [makePointer('Evt1', '1.0.0'), makePointer('Evt2', '2.0.0')];
    const messages = [makeMessage('Evt1', '1.0.0', 'events'), makeMessage('Evt2', '2.0.0', 'events')];

    const result = partitionMessagesByGroup(pointers, messages);

    expect(result.grouped.size).toBe(0);
    expect(result.ungrouped.messages).toHaveLength(2);
    expect(result.ungrouped.pointers).toHaveLength(2);
  });

  it('groups messages by group name', () => {
    const pointers = [
      makePointer('Evt1', '1.0.0', 'GroupA'),
      makePointer('Evt2', '2.0.0', 'GroupA'),
      makePointer('Evt3', '1.0.0', 'GroupB'),
    ];
    const messages = [
      makeMessage('Evt1', '1.0.0', 'events'),
      makeMessage('Evt2', '2.0.0', 'events'),
      makeMessage('Evt3', '1.0.0', 'commands'),
    ];

    const result = partitionMessagesByGroup(pointers, messages);

    expect(result.grouped.size).toBe(2);
    expect(result.grouped.get('GroupA')!.messages).toHaveLength(2);
    expect(result.grouped.get('GroupA')!.pointers).toHaveLength(2);
    expect(result.grouped.get('GroupB')!.messages).toHaveLength(1);
    expect(result.ungrouped.messages).toHaveLength(0);
  });

  it('handles mix of grouped and ungrouped', () => {
    const pointers = [makePointer('Evt1', '1.0.0', 'GroupA'), makePointer('Evt2', '2.0.0')];
    const messages = [makeMessage('Evt1', '1.0.0', 'events'), makeMessage('Evt2', '2.0.0', 'events')];

    const result = partitionMessagesByGroup(pointers, messages);

    expect(result.grouped.size).toBe(1);
    expect(result.grouped.get('GroupA')!.messages).toHaveLength(1);
    expect(result.ungrouped.messages).toHaveLength(1);
  });

  it('same message in multiple groups creates entries in both groups', () => {
    const pointers = [makePointer('Evt1', '1.0.0', 'GroupA'), makePointer('Evt1', '1.0.0', 'GroupB')];
    const messages = [makeMessage('Evt1', '1.0.0', 'events'), makeMessage('Evt1', '1.0.0', 'events')];

    const result = partitionMessagesByGroup(pointers, messages);

    expect(result.grouped.get('GroupA')!.messages).toHaveLength(1);
    expect(result.grouped.get('GroupB')!.messages).toHaveLength(1);
  });

  it('skips pointers whose message cannot be found (hydration miss)', () => {
    const pointers = [makePointer('Missing', '1.0.0', 'GroupA')];
    const messages: any[] = [];

    const result = partitionMessagesByGroup(pointers, messages);

    expect(result.grouped.get('GroupA')!.messages).toHaveLength(0);
    expect(result.grouped.get('GroupA')!.pointers).toHaveLength(1);
  });
});
