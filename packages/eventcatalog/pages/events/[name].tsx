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
import SchemaViewer from '@/components/Mdx/SchemaViewer/SchemaViewer';

import { getAllEvents, getEventByName } from '@/lib/events';
import { useConfig, useUrl } from '@/hooks/EventCatalog';

import { MarkdownFile } from '@/types/index';
import NodeGraph from '@/components/Mdx/NodeGraph/NodeGraph';

export interface EventsPageProps {
  event: Event;
  eventPath: string;
  breadCrumbs: any;
  markdown: MarkdownFile;
  notFound?: boolean;
  loadedVersion?: string;
}

export const getComponents = ({ event, schema, examples }: any) => ({
  code: ({ className, ...props }) => {
    const match = /language-(\w+)/.exec(className || '');

    return match ? <SyntaxHighlighter language={match[1]} {...props} /> : <code className={className} {...props} />;
  },
  Schema: ({ title }: { title: string }) => {
    if (!schema) return null;

    return (
      <section className="mt-8 xl:mt-10">
        {title && (
          <h2 id="activity-title" className="text-lg font-medium text-gray-900 underline">
            {title}
          </h2>
        )}
        <SyntaxHighlighter language={schema.language} showLineNumbers={false} name={`${event.name} Schema (${schema.language})`}>
          {schema.snippet}
        </SyntaxHighlighter>
      </section>
    );
  },
  SchemaViewer: ({
    title,
    renderRootTreeLines = false,
    defaultExpandedDepth = 1,
    maxHeight,
  }: {
    title?: string;
    renderRootTreeLines?: boolean;
    defaultExpandedDepth?: number;
    maxHeight?: string;
  }) => {
    if (!schema) return null;

    return (
      <section className="mt-8 xl:mt-10">
        {title && <h2 className="text-lg font-medium text-gray-900 underline">{title}</h2>}
        <SchemaViewer
          schema={schema.snippet}
          maxHeight={parseInt(maxHeight, 10)}
          renderRootTreeLines={renderRootTreeLines}
          defaultExpandedDepth={defaultExpandedDepth}
        />
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
  Mermaid: ({ title, charts }: { title?: string; charts?: string[] }) => (
    <div className="mx-auto w-full py-10">
      {title && <h2 className="text-lg font-medium text-gray-900 underline">{title}</h2>}
      <Mermaid source="event" data={event} rootNodeColor={getBackgroundColor(event.name)} charts={charts} />
    </div>
  ),
  NodeGraph: ({
    title,
    maxHeight,
    maxZoom,
    fitView,
    zoomOnScroll,
    isAnimated,
    isDraggable,
  }: // isHorizontal,
  {
    title?: string;
    maxHeight?: number;
    maxZoom?: number;
    fitView?: boolean;
    zoomOnScroll?: boolean;
    isAnimated?: boolean;
    isDraggable?: boolean;
    // isHorizontal?: boolean;
  }) => (
    <div className="mx-auto w-full">
      {title && <h2 className="text-lg font-medium text-gray-900 underline">{title}</h2>}
      <NodeGraph
        source="event"
        data={event}
        rootNodeColor={getBackgroundColor(event.name)}
        maxHeight={maxHeight}
        maxZoom={maxZoom}
        fitView={fitView}
        zoomOnScroll={zoomOnScroll}
        isAnimated={isAnimated}
        isDraggable={isDraggable}
        // isHorizontal={isHorizontal}
      />
    </div>
  ),
});

export default function Events(props: EventsPageProps) {
  const { event, markdown, loadedVersion, notFound, breadCrumbs, eventPath } = props;
  const { title } = useConfig();
  const { getEditUrl, hasEditUrl } = useUrl();

  const { name, summary, draft, schema, examples, version } = event;

  if (notFound)
    return <NotFound type="event" name={event.name} editUrl={hasEditUrl ? getEditUrl(`/events/${name}/index.md`) : ''} />;

  const { lastModifiedDate } = markdown;

  const mdxComponents = getComponents({ event, schema, examples }) as any;

  return (
    <>
      <Head>
        <title>
          {title} - {name} v{version}
        </title>
      </Head>
      <ContentView
        title={name}
        editUrl={hasEditUrl ? getEditUrl(`${eventPath}/index.md`) : ''}
        subtitle={summary}
        draft={draft}
        lastModifiedDate={lastModifiedDate}
        tags={[{ label: `v${version}` }]}
        breadCrumbs={<BreadCrumbs pages={breadCrumbs} />}
        isOldVersion={loadedVersion !== 'latest'}
        latestVersionUrl={eventPath}
        version={loadedVersion}
        sidebar={
          <EventSideBar
            event={event}
            urlPath={eventPath}
            loadedVersion={loadedVersion}
            isOldVersion={loadedVersion !== 'latest'}
          />
        }
      >
        <MDXRemote {...markdown.source} components={mdxComponents} />
      </ContentView>
    </>
  );
}

export async function getStaticProps({ params }) {
  try {
    const { event, markdown } = await getEventByName({
      eventName: params.name,
    });

    return {
      props: {
        event,
        eventPath: `/events/${event.name}`,
        breadCrumbs: [
          { name: 'Events', href: '/events', current: false },
          { name: event.name, href: `/events/${event.name}`, current: true },
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
  const events = getAllEvents();
  const eventsWithoutDomains = events.filter((event) => !event.domain);

  const paths = eventsWithoutDomains.map((event) => ({ params: { name: event.name } }));

  return {
    paths,
    fallback: false,
  };
}
