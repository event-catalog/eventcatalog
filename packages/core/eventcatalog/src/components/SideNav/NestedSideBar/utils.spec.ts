import { describe, expect, it } from 'vitest';
import { isGroupCollapsed } from './utils';

describe('isGroupCollapsed', () => {
  it('ignores persisted collapse state when the group cannot be expanded', () => {
    expect(isGroupCollapsed(false, 'group-1', new Set(['group-1']))).toBe(false);
  });

  it('uses persisted collapse state when the group can be expanded', () => {
    expect(isGroupCollapsed(true, 'adrs:status:superseded', new Set(['adrs:status:superseded']))).toBe(true);
  });
});
