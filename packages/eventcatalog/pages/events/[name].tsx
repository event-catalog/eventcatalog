import { MDXRemote } from 'next-mdx-remote'

import Admonition from '@/components/Mdx/Admonition'
import Examples from '@/components/Mdx/Examples'

import { getBackgroundColor } from '@/utils/random-bg'

import ContentView from '@/components/ContentView'
import Mermaid from '@/components/Mermaid'
import EventSideBar from '@/components/Sidebars/EventSidebar'
import BreadCrumbs from '@/components/BreadCrumbs'
import SyntaxHighlighter from '@/components/SyntaxHighlighter'

import { getAllEvents, getEventByName } from '@/lib/events'
import { useUrl } from '@/hooks/EventCatalog'

import { MarkdownFile } from '@/types/index'

import { Event } from '@eventcatalogtest/types'

interface EventsPageProps {
  event: Event
  markdown: MarkdownFile
}

export default function Events(props: EventsPageProps) {
  const { event, markdown } = props
  const { name, summary, draft, schema, examples, version } = event
  const { lastModifiedDate } = markdown
  const { getEditUrl } = useUrl();

  const pages = [
    { name: 'Events', href: '/events', current: false },
    { name, href: `/services/${name}`, current: true },
  ]

  const mdxComponents = {
    code: ({ className, ...props }) => {
      const match = /language-(\w+)/.exec(className || '')

      return match ? (
        <SyntaxHighlighter language={match[1]} {...props} />
      ) : (
        <code className={className} {...props} />
      )
    },
    Schema: ({ title = 'Event Schema'}) => {

      console.log('s', schema)

      return (
        <section className="mt-8 xl:mt-10">
              <h2 id="activity-title" className="text-lg font-medium text-gray-900 underline">
                {title}
              </h2>
           <SyntaxHighlighter language={schema.language} showLineNumbers={true} name={`${event.name} Schema`}>
              {schema.snippet}
            </SyntaxHighlighter>
        </section>
      )
    },
    Admonition,
    EventExamples: (props) => {
      return <Examples {...props} examples={examples} showLineNumbers />
    },
    Mermaid: ({ title }) => {
      return (
        <div className="mx-auto w-full py-10">
          {title && <h2 className="text-lg font-medium text-gray-900 underline">{title}</h2>}
          <Mermaid data={event} rootNodeColor={getBackgroundColor(event.name)} />
        </div>
      )
    }
  }

  return (
    <div>
      <ContentView
        // {...props}
        title={name}
        editUrl={getEditUrl(`/events/${name}/index.md`)}
        subtitle={summary}
        draft={draft}
        lastModifiedDate={lastModifiedDate}
        tags={[{ label: `v${version}` }]}
        breadCrumbs={() => <BreadCrumbs pages={pages} />}
        sidebar={() => <EventSideBar event={props.event} />}
      >
        <MDXRemote {...props.markdown.source} components={mdxComponents} />
      </ContentView>
    </div>
  )
}

export async function getStaticProps({ params }) {
  const { event, markdown } = await getEventByName(params.name)
  

  return {
    props: {
      event,
      markdown,
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
