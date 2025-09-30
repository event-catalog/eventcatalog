import { type CollectionEntry } from 'astro:content';
import type { APIRoute } from 'astro';

import { getServices } from '@utils/collections/services';

const services = await getServices();

export const GET: APIRoute = async ({ params, request }) => {
  const url = new URL(request.url);
  const baseUrl = process.env.LLMS_TXT_BASE_URL || `${url.origin}`;

  const formatServiceWithLinks = (service: CollectionEntry<'services'>) => {
    const sends = service.data.sends as unknown as CollectionEntry<'events'>[];
    const receives = service.data.receives as unknown as CollectionEntry<'events'>[];
    const writesTo = service.data.writesTo as unknown as CollectionEntry<'containers'>[];
    const readsFrom = service.data.readsFrom as unknown as CollectionEntry<'containers'>[];

    const sendsList =
      sends
        .map(
          (send) =>
            `    - [${send.data.name} - ${send.data.version}](${baseUrl}/docs/events/${send.data.id}/${send.data.version}.mdx) - ${send.data.summary}`
        )
        .join('') || '    - Does not send any messages';

    const receivesList =
      receives
        .map(
          (receive) =>
            `    - [${receive.data.name} - ${receive.data.version}](${baseUrl}/docs/events/${receive.data.id}/${receive.data.version}.mdx) - ${receive.data.summary}`
        )
        .join('') || '    - Does not receive any messages';

    const writesToList =
      writesTo
        .map(
          (write) =>
            `    - [${write.data.name} - ${write.data.version}](${baseUrl}/docs/containers/${write.data.id}/${write.data.version}.mdx) - ${write.data.summary}`
        )
        .join('') || '    - Does not write to any containers';

    const readsFromList =
      readsFrom
        .map(
          (read) =>
            `    - [${read.data.name} - ${read.data.version}](${baseUrl}/docs/containers/${read.data.id}/${read.data.version}.mdx) - ${read.data.summary}`
        )
        .join('') || '    - Does not read from any containers';

    return `## [${service.data.name} - ${service.data.version}](${baseUrl}/docs/services/${service.data.id}/${service.data.version}.mdx) - ${service.data.summary}\n  ## Sends\n${sendsList}\n  ## Receives\n${receivesList}\n  ## Writes to\n${writesToList}\n  ## Reads from\n${readsFromList} \n`;
  };

  const content = ['# Services \n\n', services.map((item) => formatServiceWithLinks(item)).join('\n')].join('\n');

  return new Response(content, {
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  });
};
