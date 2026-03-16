import { getOwnerNames } from '@utils/collections/owners';
import { satisfies, getResourceTypeLabel, getPointerField } from '@utils/collections/util';
import { getDomainsForService } from '@utils/collections/domains';

export const PRINT_DOT_COLORS: Record<string, string> = {
  event: '#ea580c',
  command: '#2563eb',
  query: '#16a34a',
};

export const PRINT_BADGE_COLORS: Record<string, string> = {
  event: 'bg-gradient-to-br from-orange-50 to-orange-100 text-orange-700 border-orange-300',
  command: 'bg-gradient-to-br from-blue-50 to-blue-100 text-blue-700 border-blue-300',
  query: 'bg-gradient-to-br from-green-50 to-green-100 text-green-700 border-green-300',
};

export interface HydratedParticipant {
  name: string;
  resourceType: string;
  resourceVersion: string;
  messageVersion: string;
  isLatest: boolean;
  owners: string[];
  domain: string | undefined;
}

/**
 * Hydrates a list of producer/consumer collection entries with owner names,
 * domain info, message version, and isLatest badge.
 */
export async function hydrateParticipants(
  list: any[],
  direction: 'sends' | 'receives',
  messageId: string,
  latestVersion: string
): Promise<HydratedParticipant[]> {
  return Promise.all(
    list.map(async (s: any) => {
      const field = getPointerField(s.collection, direction);
      const pointers = s.data?.[field] || [];
      const pointer = pointers.find((p: any) => p.id === messageId);
      const messageVersion = pointer?.version || 'latest';
      const isLatest = !pointer?.version || pointer.version === 'latest' || satisfies(latestVersion, pointer.version);

      // Use getDomainsForService for service participants (getDomains is cached internally)
      let domain: string | undefined;
      if (s.collection === 'services') {
        const domains = await getDomainsForService(s);
        if (domains.length > 0) {
          domain = domains.map((d) => d.data.name || d.data.id).join(', ');
        }
      }

      return {
        name: s.data?.name || s.id,
        resourceType: getResourceTypeLabel(s.collection),
        resourceVersion: s.data?.version || s.version,
        messageVersion,
        isLatest,
        owners: await getOwnerNames(s.data?.owners || []),
        domain,
      };
    })
  );
}
