import LogPage from '../../../../events/[name]/logs';
import { getLogsForEvent, getEventByName } from '@/lib/events';
import { getAllEventsFromDomains } from '@/lib/domains';

export default LogPage;

export const getStaticProps = async ({ params }) => {
  const { name: eventName, domain } = params;

  const history = await getLogsForEvent({ eventName, domain });
  const { event: { version } = {} } = await getEventByName({ eventName, domain });

  return {
    props: {
      changes: history,
      name: eventName,
      currentVersion: version,
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

