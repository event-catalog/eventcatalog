import { MDXRemote } from 'next-mdx-remote'

import Editor from '@/components/Mdx/Editor'
import Admonition from '@/components/Mdx/Admonition'
import EventsTable from '@/components/Mdx/EventsTable'

import ContentView from '@/components/ContentView'
import Mermaid from '@/components/Mermaid'
import EventSideBar from '@/components/Sidebars/EventSidebar'
import BreadCrumbs from '@/components/BreadCrumbs'

import { getAllEvents, getEventById } from '@/lib/eventcatalog'

import { Event, MarkdownFile } from '@/types/index'

interface EventsPageProps {
  event: Event
  markdown: MarkdownFile
}

export default function Events(props: EventsPageProps) {

  const { event, markdown } = props;
  const { name, summary, draft, schema, owners, domains, producers, consumers, version } = event;
  const { lastModifiedDate } = markdown;

  const pages = [
    { name: 'Events', href: '/events', current: false },
    { name, href: `/services/${name}`, current: true },
  ]

  const mdxComponents = {
    Schema: (schemaProps) => {
      return (
        <section className="mt-8 xl:mt-10">
          {schemaProps.title && (
            <div className="pb-4">
              <h2 id="activity-title" className="text-lg font-medium text-gray-900 underline">
                {schemaProps.title}
              </h2>
            </div>
          )}
          <Editor value={schema} {...schemaProps} />
        </section>
      )
    },
    Admonition,
    Mermaid: ({ title }) => {
      return (
        <div className="mx-auto w-full py-10">
          {title && <h2 className="text-lg font-medium text-gray-900 underline">{title}</h2>}
          <Mermaid data={event} />
        </div>
      )
    },
    EventsWithinSameDomain: () => {
      return null;
      return (
        <section className="mt-8 xl:mt-10">
          <div className="pb-4">
            <h2 id="activity-title" className="text-lg font-medium text-gray-900 underline">
              Simular Events
            </h2>
          </div>
          <EventsTable />
        </section>
      )
    },
  }

  return (
    <div>
      <ContentView
        // {...props}
        title={name}
        subtitle={summary}
        draft={draft}
        lastModifiedDate={lastModifiedDate}
        tags={[{ label: `v${version}`}]}
        breadCrumbs={() => <BreadCrumbs pages={pages} />}
        sidebar={() => (
          <EventSideBar
            event={props.event}
          />
        )}
      >
        <MDXRemote {...props.markdown.source} components={mdxComponents} />
      </ContentView>
    </div>
  )
}

export async function getStaticProps({ params }) {
  const { event, markdown } = await getEventById(params.name)

  return {
    props: {
      event,
      markdown
    },
  }
}

export async function getStaticPaths() {
  const events = getAllEvents()
  const paths = events.map((event) => ({ params: { name: event.name } }))

  return {
    paths,
    fallback: false,
  }
}
