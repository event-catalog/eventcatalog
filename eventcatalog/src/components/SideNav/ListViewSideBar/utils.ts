import { isCollectionVisibleInCatalog } from '@eventcatalog';
import { buildUrl } from '@utils/url-builder';
import { getChannels } from '@utils/channels';
import { getDomains } from '@utils/collections/domains';
import { getFlows } from '@utils/collections/flows';
import { getServices } from '@utils/collections/services';
import { getCommands } from '@utils/commands';
import { getEvents } from '@utils/events';
import { getQueries } from '@utils/queries';

export async function getResourcesForNavigation({ currentPath }: { currentPath: string }) {
  const events = await getEvents({ getAllVersions: false });
  const commands = await getCommands({ getAllVersions: false });
  const queries = await getQueries({ getAllVersions: false });
  const services = await getServices({ getAllVersions: false });
  const domains = await getDomains({ getAllVersions: false });
  const channels = await getChannels({ getAllVersions: false });
  const flows = await getFlows({ getAllVersions: false });

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
  const allDataAsSideNav = [...domains, ...services, ...flows, ...channels].reduce((acc, item) => {
    const title = item.collection;
    const group = acc[title] || [];

    const servicesCount = item.collection === 'domains' ? item.data.services?.length || 0 : 0;
    const sends = item.collection === 'services' ? item.data.sends || null : null;
    const receives = item.collection === 'services' ? item.data.receives || null : null;

    // Add href to the sends and receives
    const sendsWithHref = sends?.map((send: any) => ({
      ...send,
      href: buildUrl(`/${route}/${send.collection}/${send.data.id}/${send.data.version}`),
    }));
    const receivesWithHref = receives?.map((receive: any) => ({
      ...receive,
      href: buildUrl(`/${route}/${receive.collection}/${receive.data.id}/${receive.data.version}`),
    }));

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
      services: item.collection === 'domains' ? item.data.services : null,
      sends: sendsWithHref,
      receives: receivesWithHref,
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
    href: buildUrl(`/${route}/${item.collection}/${item.data.id}/${item.data.version}`),
    collection: item.collection,
  }));

  const sideNav = {
    ...(currentPath.includes('visualiser')
      ? {
          'bounded context map': [
            { label: 'Domain map', href: buildUrl('/visualiser/context-map'), collection: 'bounded-context-map' },
          ],
        }
      : {}),
    ...allDataAsSideNav,
    messagesNotInService: messagesNotInServiceAsSideNav,
  };

  return sideNav;
}
