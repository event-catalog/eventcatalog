import { getOwnerNames } from '@utils/collections/owners';
import { satisfies, getResourceTypeLabel, getPointerField } from '@utils/collections/util';
import { getDomainsForService } from '@utils/collections/domains';

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
