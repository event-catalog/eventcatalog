import { isCollectionVisibleInCatalog } from '@eventcatalog';
import { buildUrl } from '@utils/url-builder';
import { getChannels } from '@utils/channels';
import { getDomains } from '@utils/collections/domains';
import { getFlows } from '@utils/collections/flows';
import { getServices } from '@utils/collections/services';
import { getCommands } from '@utils/commands';
import { getEvents } from '@utils/events';
import { getQueries } from '@utils/queries';
import { getTeams } from '@utils/teams';
import { getUsers } from '@utils/users';

export async function getCatalogResources({ currentPath }: { currentPath: string }) {
  const events = await getEvents({ getAllVersions: false });
  const commands = await getCommands({ getAllVersions: false });
  const queries = await getQueries({ getAllVersions: false });
  const services = await getServices({ getAllVersions: false });
  const domains = await getDomains({ getAllVersions: false });
  const channels = await getChannels({ getAllVersions: false });
  const flows = await getFlows({ getAllVersions: false });

  const messages = [...events, ...commands, ...queries];

  // @ts-ignore for large catalogs https://github.com/event-catalog/eventcatalog/issues/552
  const allData = [...domains, ...services, ...messages, ...channels, ...flows];

  const allDataAsSideNav = allData.reduce((acc, item) => {
    const title = item.collection;
    const group = acc[title] || [];
    const route = currentPath.includes('visualiser') ? 'visualiser' : 'docs';

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
    };

    group.push(navigationItem);

    return {
      ...acc,
      [title]: group,
    };
  }, {} as any);

  const sideNav = {
    ...(currentPath.includes('visualiser')
      ? {
          'bounded context map': [
            { label: 'Domain map', href: buildUrl('/visualiser/context-map'), collection: 'bounded-context-map' },
          ],
        }
      : {}),
    ...allDataAsSideNav,
  };

  return sideNav;
}
