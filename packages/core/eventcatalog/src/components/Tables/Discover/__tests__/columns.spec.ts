import { describe, it, expect } from 'vitest';
import { getDiscoverColumns } from '../columns';

const emptyTableConfiguration = { columns: {} } as any;

// Column definitions carry a stable `id`, so we can assert on the shape of the
// table for each collection type without rendering React.
const columnIds = (collectionType: any) =>
  getDiscoverColumns(collectionType, emptyTableConfiguration).map((column: any) => column.id);

describe('getDiscoverColumns', () => {
  it('returns the system columns including services and flows', () => {
    const ids = columnIds('systems');

    expect(ids).toEqual(['name', 'summary', 'services', 'flows', 'badges', 'actions']);
  });

  it('returns the domain columns for domains', () => {
    const ids = columnIds('domains');

    expect(ids).toContain('services');
    expect(ids).toContain('agents');
  });

  it('returns an empty column set for an unknown collection type', () => {
    expect(getDiscoverColumns('unknown' as any, emptyTableConfiguration)).toEqual([]);
  });
});
