import { getEventByName, getAllEventsAndVersionsFlattened } from '@/lib/events';
import EventPage, { EventsPageProps } from '../../[name]';

export default function Events(props: EventsPageProps) {
  return <EventPage {...props} />;
}

export async function getStaticProps({ params }) {
  const { name: eventName, version } = params;
  const { event, markdown } = await getEventByName(eventName, version);

  return {
    props: {
      event,
      markdown,
      loadedVersion: version,
    },
  };
}

export async function getStaticPaths() {
  const allEventsAndVersions = getAllEventsAndVersionsFlattened();

  // all but current one

  const paths = allEventsAndVersions.map(({ eventName, version }: any) => ({ params: { name: eventName, version } }));
  return {
    paths,
    fallback: false,
  };
}
