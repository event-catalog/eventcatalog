import path from 'path';
import fs from 'fs';
import { getAllEventsFromPath } from './events';


// eslint-disable-next-line import/prefer-default-export
export const getAllEventsFromDomains = () => {
  const domainsDir = path.join(process.env.PROJECT_DIR, 'domains');
  const domains = fs.readdirSync(domainsDir);

  return domains.reduce((allEventsFromDomains, domainFolder) => {
    const domainDir = path.join(domainsDir, domainFolder);
    const eventsForDomainDir = path.join(domainDir, 'events');
    const domainHasEvents = fs.existsSync(eventsForDomainDir);

    if (domainHasEvents) {
      const domainEvents = getAllEventsFromPath(eventsForDomainDir);

      // Add domains onto events
      const eventsWithDomain = domainEvents.map(event => ({...event, domain: domainFolder}))

      return [...allEventsFromDomains, ...eventsWithDomain];
    }

    return allEventsFromDomains;
  }, []);

};
