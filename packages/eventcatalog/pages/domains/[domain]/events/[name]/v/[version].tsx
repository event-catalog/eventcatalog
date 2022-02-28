import { getEventByName, getAllEventsAndVersionsFlattened } from '@/lib/events';
import EventPage from '../../[name]';

export default EventPage;

export async function getStaticProps({ params }) {
  const { name: eventName, version, domain } = params;

  const { event, markdown } = await getEventByName({ eventName, version, domain });

  return {
    props: {
      event,
      markdown,
      eventPath: `/domains/${event.domain}/events/${event.name}`,
      breadCrumbs: [
        { name: 'Domain', href: '/events', current: false },
        { name: event.domain, href: `/domains/${event.domain}`, current: false },
        { name: 'Events', href: `/events?domain=${event.domain}`, current: false },
        { name: event.name, href: `/domains/${event.domain}/events/${event.name}`, current: false },
        { name: `v${version}`, href: `/domains/${event.domain}/events/${event.name}/v/${version}`, current: true },
      ],
      loadedVersion: version,
    },
  };
}

export async function getStaticPaths() {
  const allEventsAndVersions = getAllEventsAndVersionsFlattened();
  const eventsWithDomains = allEventsAndVersions.filter((item) => !!item.domain);

  const paths = eventsWithDomains.map(({ eventName, version, domain = '' }: any) => ({
    params: { name: eventName, version, domain },
  }));
  return {
    paths,
    fallback: false,
  };
}
