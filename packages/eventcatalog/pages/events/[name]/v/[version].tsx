import { getEventByName } from '@/lib/events';
import EventPage, { EventsPageProps } from '../../[name]';

export default function Events(props: EventsPageProps) {
  return <EventPage {...props} />;
}

export async function getServerSideProps({ params }) {
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
