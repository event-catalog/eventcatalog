import { isCollectionVisibleInCatalog } from '@eventcatalog';
import { buildUrl } from '@utils/url-builder';
import { getChannels } from '@utils/channels';
import { getDomains } from '@utils/collections/domains';
import { getFlows } from '@utils/collections/flows';
import { getServices, getSpecificationsForService } from '@utils/collections/services';
import { getCommands } from '@utils/commands';
import { getEvents } from '@utils/events';
import { getQueries } from '@utils/queries';
import { getDesigns } from '@utils/collections/designs';
import { getContainers } from '@utils/collections/containers';

const stripCollection = (collection: any) => {
  return collection.map((item: any) => ({
    data: {
      id: item.data.id,
      version: item.data.version,
    },
  }));
};

export async function getResourcesForNavigation({ currentPath }: { currentPath: string }) {
  const events = await getEvents({ getAllVersions: false });
  const commands = await getCommands({ getAllVersions: false });
  const queries = await getQueries({ getAllVersions: false });
  const services = await getServices({ getAllVersions: false });
  const domains = await getDomains({ getAllVersions: false });
  const channels = await getChannels({ getAllVersions: false });
  const flows = await getFlows({ getAllVersions: false });
  const containers = await getContainers({ getAllVersions: false });
  const designs = await getDesigns({ getAllVersions: false });

  const messages = [...events, ...commands, ...queries];

  // messages that are not in a service (sends or receives)
  const messagesNotInService = messages.filter(
    (message) =>
      !services.some(
        (service) =>
          service.data?.sends?.some((send: any) => send.data.id === message.data.id) ||
          service.data?.receives?.some((receive: any) => receive.data.id === message.data.id)
      )
  );

  const route = currentPath.includes('visualiser') ? 'visualiser' : 'docs';

  // Just the domains for now.
  const allDataAsSideNav = [...domains, ...services, ...flows, ...channels, ...containers].reduce((acc, item) => {
    const title = item.collection;
    const group = acc[title] || [];

    const isCollectionDomain = item.collection === 'domains';
    const isCollectionService = item.collection === 'services';

    const servicesCount = isCollectionDomain ? item.data.services?.length || 0 : 0;
    const sends = isCollectionService ? item.data.sends || null : null;
    const receives = isCollectionService ? item.data.receives || null : null;
    const entities = isCollectionDomain || isCollectionService ? item.data.entities || null : null;

    const writesTo = isCollectionService ? item.data.writesTo || null : null;
    const readsFrom = isCollectionService ? item.data.readsFrom || null : null;

    // Add href to the sends and receives
    const sendsWithHref = sends?.map((send: any) => ({
      id: send.data.id,
      data: {
        name: send.data.name,
        sidebar: send.data.sidebar,
        aggregateRoot: send?.data?.aggregateRoot,
        draft: send.data.draft,
      },
      collection: send.collection,
      href: buildUrl(`/${route}/${send.collection}/${send.data.id}/${send.data.version}`),
    }));
    const receivesWithHref = receives?.map((receive: any) => ({
      id: receive.data.id,
      data: {
        name: receive.data.name,
        sidebar: receive.data.sidebar,
        aggregateRoot: receive?.data?.aggregateRoot,
        draft: receive.data.draft,
      },
      collection: receive.collection,
      href: buildUrl(`/${route}/${receive.collection}/${receive.data.id}/${receive.data.version}`),
    }));
    const entitiesWithHref = entities?.map((entity: any) => ({
      id: entity.data.id,
      data: {
        name: entity.data.name,
        sidebar: entity.data.sidebar,
        aggregateRoot: entity?.data?.aggregateRoot,
        draft: entity.data.draft,
      },
      collection: entity.collection,
      href: buildUrl(`/${route}/${entity.collection}/${entity.data.id}/${entity.data.version}`),
    }));

    const writesToWithHref = writesTo?.map((writeTo: any) => ({
      id: writeTo.data.id,
      data: {
        name: writeTo.data.name,
        sidebar: {
          badge: writeTo.data.container_type || writeTo.collection,
          backgroundColor: 'bg-blue-100 text-blue-600',
        },
      },
      collection: writeTo.collection,
      href: buildUrl(`/${route}/${writeTo.collection}/${writeTo.data.id}/${writeTo.data.version}`),
    }));

    const readsFromWithHref = readsFrom?.map((readFrom: any) => ({
      id: readFrom.data.id,
      data: {
        name: readFrom.data.name,
        sidebar: {
          badge: readFrom.data.container_type || readFrom.collection,
          backgroundColor: 'bg-blue-100 text-indigo-600',
        },
      },
      collection: readFrom.collection,
      href: buildUrl(`/${route}/${readFrom.collection}/${readFrom.data.id}/${readFrom.data.version}`),
    }));

    // don't render items if we are in the visualiser and the item has visualiser set to false
    if (currentPath.includes('visualiser') && item.data.visualiser === false) {
      return acc;
    }

    const navigationItem = {
      label: item.data.name,
      version: item.data.version,
      // items: item.collection === 'users' ? [] : item.headings,
      visible: isCollectionVisibleInCatalog(item.collection),
      // @ts-ignore
      href: item.data.version
        ? // @ts-ignore
          buildUrl(`/${route}/${item.collection}/${item.data.id}/${item.data.version}`)
        : buildUrl(`/${route}/${item.collection}/${item.data.id}`),
      collection: item.collection,
      servicesCount,
      id: item.data.id,
      name: item.data.name,
      draft: item.data.draft,
      services: isCollectionDomain ? stripCollection(item.data.services) : null,
      domains: isCollectionDomain ? stripCollection(item.data.domains) : null,
      sends: sendsWithHref,
      receives: receivesWithHref,
      entities: entitiesWithHref,
      specifications: isCollectionService ? getSpecificationsForService(item) : null,
      writesTo: writesToWithHref,
      readsFrom: readsFromWithHref,
      sidebar: item.data?.sidebar,
      renderInVisualiser: item.data?.visualiser ?? true,
    };

    group.push(navigationItem);

    return {
      ...acc,
      [title]: group,
    };
  }, {} as any);

  // Add messagesNotInService
  const messagesNotInServiceAsSideNav = messagesNotInService.map((item) => ({
    label: item.data.name,
    version: item.data.version,
    id: item.data.id,
    name: item.data.name,
    draft: item.data.draft,
    href: buildUrl(`/${route}/${item.collection}/${item.data.id}/${item.data.version}`),
    collection: item.collection,
  }));

  const sideNav = {
    ...(currentPath.includes('visualiser')
      ? {
          'context-map': [
            {
              label: 'Domain Integration Map',
              href: buildUrl('/visualiser/domain-integrations'),
              collection: 'domain-integrations',
            },
          ],
        }
      : {}),
    ...allDataAsSideNav,
    messagesNotInService: messagesNotInServiceAsSideNav,
  };

  // Add designs?
  if (designs.length > 0) {
    sideNav['designs'] = designs.map((design) => ({
      label: design.data.name,
      href: buildUrl(`/visualiser/designs/${design.data.id}`),
      collection: 'designs',
    }));
  }

  return sideNav;
}
