import { getEventByName, getAllEventsAndVersionsFlattened } from '@/lib/events';
import EventPage, { EventsPageProps } from '../../[name]';

export default function Events(props: EventsPageProps) {
  return <EventPage {...props} />;
}

export async function getStaticProps({ params }) {
  const { name: eventName, version } = params;
  const { event, markdown } = await getEventByName({ eventName, version });

  return {
    props: {
      event,
      markdown,
      loadedVersion: version,
      eventPath: `/events/${event.name}`,
      breadCrumbs: [
        { name: 'Events', href: `/events?domain=${event.domain}`, current: false },
        { name: event.name, href: `/events/${event.name}`, current: false },
        { name: `v${version}`, href: `/events/${event.name}/v/${version}`, current: true },
      ],
    },
  };
}

export async function getStaticPaths() {
  const allEventsAndVersions = getAllEventsAndVersionsFlattened();
  const eventsWithDomains = allEventsAndVersions.filter((item) => !!item.domain === false);

  // all but current one

  const paths = eventsWithDomains.map(({ eventName, version }: any) => ({ params: { name: eventName, version } }));
  return {
    paths,
    fallback: false,
  };
}
