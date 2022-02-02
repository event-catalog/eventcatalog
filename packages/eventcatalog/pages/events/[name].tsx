import Head from 'next/head';
import { MDXRemote } from 'next-mdx-remote';

import { Event } from '@eventcatalog/types';
import Admonition from '@/components/Mdx/Admonition';
import Examples from '@/components/Mdx/Examples';

import getBackgroundColor from '@/utils/random-bg';

import ContentView from '@/components/ContentView';
import Mermaid from '@/components/Mermaid';
import EventSideBar from '@/components/Sidebars/EventSidebar';
import NotFound from '@/components/NotFound';
import BreadCrumbs from '@/components/BreadCrumbs';
import SyntaxHighlighter from '@/components/SyntaxHighlighter';

import { getAllEvents, getEventByName } from '@/lib/events';
import { useConfig, useUrl } from '@/hooks/EventCatalog';

import { MarkdownFile } from '@/types/index';
import NodeGraph from '@/components/NodeGraph/NodeGraph';

export interface EventsPageProps {
  event: Event;
  markdown: MarkdownFile;
  notFound?: boolean;
  loadedVersion?: string;
}

export const getComponents = ({ event, schema, examples }: any) => ({
  code: ({ className, ...props }) => {
    const match = /language-(\w+)/.exec(className || '');

    return match ? <SyntaxHighlighter language={match[1]} {...props} /> : <code className={className} {...props} />;
  },
  Schema: ({ title = 'Event Schema' }: { title: string }) => {
    if (!schema) return null;

    return (
      <section className="mt-8 xl:mt-10">
        <h2 id="activity-title" className="text-lg font-medium text-gray-900 underline">
          {title}
        </h2>
        <SyntaxHighlighter language={schema.language} showLineNumbers={false} name={`${event.name} Schema (${schema.language})`}>
          {schema.snippet}
        </SyntaxHighlighter>
      </section>
    );
  },
  Admonition,
  EventExamples: (props) => {
    if (examples.length > 0) {
      return <Examples {...props} examples={examples} showLineNumbers />;
    }
    console.log(
      'You are using the <EventExamples /> component without any examples, please read https://eventcatalog.dev/docs/events/adding-examples for more information'
    );
    return null;
  },
  Mermaid: ({ title, charts }: { title: string; charts?: string[] }) => (
    <div className="mx-auto w-full py-10">
      {title && <h2 className="text-lg font-medium text-gray-900 underline">{title}</h2>}
      <Mermaid source="event" data={event} rootNodeColor={getBackgroundColor(event.name)} charts={charts} />
    </div>
  ),
  NodeGraph: ({ title, maxHeight }: { title: string; maxHeight?: number }) => (
    <div className="mx-auto w-full">
      {title && <h2 className="text-lg font-medium text-gray-900 underline">{title}</h2>}
      <NodeGraph source="event" data={event} rootNodeColor={getBackgroundColor(event.name)} maxHeight={maxHeight} />
    </div>
  ),
});

export default function Events(props: EventsPageProps) {
  const { event, markdown, loadedVersion, notFound } = props;
  const { title } = useConfig();
  const { getEditUrl, hasEditUrl } = useUrl();

  const { name, summary, draft, schema, examples, version } = event;

  if (notFound)
    return <NotFound type="event" name={event.name} editUrl={hasEditUrl ? getEditUrl(`/events/${name}/index.md`) : ''} />;

  const { lastModifiedDate } = markdown;

  const pages = [
    { name: 'Events', href: '/events', current: false },
    { name, href: `/services/${name}`, current: true },
  ];

  const mdxComponents = getComponents({ event, schema, examples });

  return (
    <>
      <Head>
        <title>
          {title} - {name} v{version}
        </title>
      </Head>
      <ContentView
        title={name}
        editUrl={hasEditUrl ? getEditUrl(`/events/${name}/index.md`) : ''}
        subtitle={summary}
        draft={draft}
        lastModifiedDate={lastModifiedDate}
        tags={[{ label: `v${version}` }]}
        breadCrumbs={<BreadCrumbs pages={pages} />}
        isOldVersion={loadedVersion !== 'latest'}
        latestVersionUrl={`/events/${name}`}
        version={loadedVersion}
        sidebar={<EventSideBar event={event} loadedVersion={loadedVersion} isOldVersion={loadedVersion !== 'latest'} />}
      >
        <MDXRemote {...markdown.source} components={mdxComponents} />
      </ContentView>
    </>
  );
}

export async function getStaticProps({ params }) {
  try {
    const { event, markdown } = await getEventByName(params.name);
    return {
      props: {
        event,
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
  const events = getAllEvents();
  const paths = events.map((event) => ({ params: { name: event.name } }));

  return {
    paths,
    fallback: false,
  };
}
