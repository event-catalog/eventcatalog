import { findInMap } from '@utils/collections/util';

/**
 * Resolve service/agent pointers to collection entries and hydrate their
 * sends/receives/readsFrom/writesTo relationships.
 */
export const hydrateServices = (
  servicesList: any[],
  serviceMap: Map<string, any[]>,
  messageMap: Map<string, any[]>,
  containerMap: Map<string, any[]>
) => {
  return servicesList
    .map((service: { id: string; version: string | undefined }) => findInMap(serviceMap, service.id, service.version))
    .filter((s) => !!s)
    .map((service) => {
      const sends = (service.data.sends || [])
        .map((msg: any) => findInMap(messageMap, msg.id, msg.version))
        .filter((m: any) => !!m);

      const receives = (service.data.receives || [])
        .map((msg: any) => findInMap(messageMap, msg.id, msg.version))
        .filter((m: any) => !!m);

      const readsFrom = (service.data.readsFrom || [])
        .map((c: any) => findInMap(containerMap, c.id, c.version))
        .filter((c: any) => !!c);

      const writesTo = (service.data.writesTo || [])
        .map((c: any) => findInMap(containerMap, c.id, c.version))
        .filter((c: any) => !!c);

      return {
        ...service,
        data: {
          ...service.data,
          sends: sends as any,
          receives: receives as any,
          readsFrom: readsFrom as any,
          writesTo: writesTo as any,
        },
      };
    });
};

export const hydrateAgents = (
  agentsList: any[],
  agentMap: Map<string, any[]>,
  messageMap: Map<string, any[]>,
  containerMap: Map<string, any[]>
) => hydrateServices(agentsList, agentMap, messageMap, containerMap);
