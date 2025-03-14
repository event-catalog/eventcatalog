import rss from '@astrojs/rss';
import { getCollection } from 'astro:content';
import { statSync } from 'fs';
import { buildUrl } from '@utils/url-builder';
import config from '@config';
import { getGitHistory } from '@utils/git';

const isRSSEnabled = config.rss?.enabled;
const rssLimit = config.rss?.limit || 15;

const collections = ['events', 'services', 'domains', 'commands', 'queries', 'flows', 'all'];

export function getStaticPaths() {
  return collections.map((collection) => ({
    params: { resource: collection },
  }));
}

export async function GET(context) {
  if (!isRSSEnabled) {
    return new Response('RSS is not enabled for this EventCatalog.', { status: 404 });
  }

  const collection = context.params.resource;
  let items = [];

  if (collection === 'all') {
    const events = await getCollection('events');
    const services = await getCollection('services');
    const domains = await getCollection('domains');
    const commands = await getCollection('commands');
    const flows = await getCollection('flows');
    items = [...events, ...services, ...domains, ...commands, ...flows];
  } else {
    items = await getCollection(collection);
  }

  const rssItems = items
    // Make sure the item is valid before we try and get the git history
    .filter((item) => item?.filePath)
    .map((event) => {
      const pathToFile = event.filePath;

      let modifiedDate;
      let modifiedAuthor;

      try {
        const gitHistory = getGitHistory(pathToFile, {
          includeAuthor: true,
          age: 'newest',
        });

        modifiedDate = gitHistory.date;
        modifiedAuthor = gitHistory.author;
      } catch (error) {
        // Failed to get git history, use the file stats
        const stats = statSync(pathToFile);
        modifiedDate = stats.mtime;
        modifiedAuthor = undefined;
      }

      return {
        ...event,
        modifiedDate: modifiedDate,
        modifiedAuthor: modifiedAuthor,
      };
    })
    .sort((a, b) => b.modifiedDate - a.modifiedDate) // Sort in descending order (newest first)
    .slice(0, rssLimit); // Only take the first 10 items

  return rss({
    // `<title>` field in output xml
    title:
      collection === 'all'
        ? 'Documented resources in EventCatalog'
        : `${collection.charAt(0).toUpperCase() + collection.slice(1)}`,
    stylesheet: '/rss.xsl',
    // `<description>` field in output xml
    description: collection === 'all' ? 'Documented resources in EventCatalog' : `Documented ${collection} in EventCatalog`,
    // Pull in your project "site" from the endpoint context
    // https://docs.astro.build/en/reference/api-reference/#site
    site: context.site,
    // Array of `<item>`s in output xml
    // See "Generating items" section for examples using content collections and glob imports
    items: rssItems.map((event) => ({
      title: event.data.name,
      link: buildUrl(`/docs/${collection}/${event.data.id}/${event.data.version}`),
      pubDate: event.modifiedDate,
      description: event.data.summary,
      // Optional: Include modified date in the RSS feed
      lastBuildDate: items.find((item) => item.id === event.id)?.modifiedDate,
      author: event.modifiedAuthor,
      // categories: event.data.badges,
    })),
    // (optional) inject custom xml
    customData: `<language>en-us</language>`,
  });
}
