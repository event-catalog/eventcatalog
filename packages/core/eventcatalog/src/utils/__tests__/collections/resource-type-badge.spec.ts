import { describe, expect, it } from 'vitest';
import { getResourceTypeBadge } from '@utils/collections/resource-type-badge';
import { getIconForCollection } from '@utils/collections/icons';

describe('getResourceTypeBadge', () => {
  it('names the type of the resource and shows its icon', () => {
    expect(getResourceTypeBadge('domains')).toEqual({
      textColor: 'gray',
      content: 'Domain',
      icon: getIconForCollection('domains'),
    });
    expect(getResourceTypeBadge('events')).toEqual({ textColor: 'gray', content: 'Event', icon: getIconForCollection('events') });
  });

  it('only says service for a service', () => {
    expect(getResourceTypeBadge('services').content).toBe('Service');
    expect(getResourceTypeBadge('queries').content).toBe('Query');
    expect(getResourceTypeBadge('commands').content).toBe('Command');
  });
});
