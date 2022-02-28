import { getEventByName } from '@/lib/events';
import { getAllEventsFromDomains } from '@/lib/domains';
import EventsPage from '../../../events/[name]';

export default EventsPage;

export async function getStaticProps({ params }) {
  try {
    const { event, markdown } = await getEventByName({
      eventName: params.name,
      domain: params.domain,
    });

    return {
      props: {
        event,
        eventPath: `/domains/${event.domain}/events/${event.name}`,
        breadCrumbs: [
          { name: 'Domain', href: '/domains', current: false },
          { name: event.domain, href: `/domains/${event.domain}`, current: false },
          { name: 'Events', href: `/events?domain=${event.domain}`, current: false },
          { name: event.name, href: `/domains/${event.domain}/events/${event.name}`, current: true },
        ],
        markdown,
        loadedVersion: 'latest',
      },
    };
  } catch (error) {
    return {
      props: {
        notFound: true,
        event: { name: params.name },
      },
    };
  }
}

export async function getStaticPaths() {
  const events = getAllEventsFromDomains();
  const paths = events.map((event) => ({ params: { name: event.name, domain: event.domain } }));

  return {
    paths,
    fallback: false,
  };
}
