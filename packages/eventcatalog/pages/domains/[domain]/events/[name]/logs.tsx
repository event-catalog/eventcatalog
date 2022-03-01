import LogPage from '../../../../events/[name]/logs';
import { getLogsForEvent, getEventByName } from '@/lib/events';
import { getAllEventsFromDomains } from '@/lib/domains';

export default LogPage;

export const getStaticProps = async ({ params }) => {
  const { name: eventName, domain } = params;

  const history = await getLogsForEvent({ eventName, domain });
  const { event } = await getEventByName({ eventName, domain });

  return {
    props: {
      changes: history,
      event,
      breadCrumbs: [
        { name: 'Domain', href: '/domains', current: false },
        { name: event.domain, href: `/domains/${event.domain}`, current: false },
        { name: 'Events', href: `/events?domain=${event.domain}`, current: false },
        { name: event.name, href: `/domains/${event.domain}/events/${event.name}`, current: true },
        { name: 'Logs', href: `/events/${event.name}/history`, current: true },
      ],
    },
  };
};

export async function getStaticPaths() {
  const events = getAllEventsFromDomains();
  const paths = events.map((event) => ({ params: { name: event.name, domain: event.domain } }));
  return {
    paths,
    fallback: false,
  };
}
