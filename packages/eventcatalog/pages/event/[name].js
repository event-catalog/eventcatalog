import { MDXRemote } from 'next-mdx-remote'

import Editor from '@/components/Mdx/Editor'
import Admonition from '@/components/Mdx/Admonition'
import EventsTable from '@/components/Mdx/EventsTable'
import EventFlow from '@/components/EventFlow'
import EventView from '@/components/EventView'
import Mermaid from '@/components/Mermaid'

import { getAllEvents, getEventById } from '@/lib/eventcatalog'

export default function Doc(props) {
  const components = {
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
          <Editor value={props.schema} {...schemaProps} />
        </section>
      )
    },
    Admonition,
    Mermaid: ({ title }) => {
      return (
        <div className="mx-auto w-full py-10">
          {title && <h2 className="text-lg font-medium text-gray-900 underline">{title}</h2>}
          <Mermaid event={{ ...props }} />
        </div>
      )
    },
    EventFlowDiagram: ({ title }) => {
      return (
        <section className="mt-8 xl:mt-10">
          <div className="pb-4">
            <h2 id="activity-title" className="text-lg font-medium text-gray-900 underline">
              Producers & Consumers
            </h2>
          </div>
          <EventFlow event={{ ...props }} />
        </section>
      )
    },
    EventsWithinSameDomain: () => {
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
      <EventView {...props}>
        <MDXRemote {...props.source} components={components} />
      </EventView>
    </div>
  )
}

export async function getStaticProps({ params }) {
  const event = await getEventById(params.name)

  return {
    props: {
      ...event,
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
