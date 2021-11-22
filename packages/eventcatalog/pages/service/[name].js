import ContentView from '@/components/ContentView'
import { getAllServices, getServiceBySlug, getAllEventsThatPublishAndSubscribeToService } from '@/lib/eventcatalog'
import { MDXRemote } from 'next-mdx-remote'

import Admonition from '@/components/Mdx/Admonition'
import Mermaid from '@/components/Mermaid'


export default function Doc(props) {

  const components = {
    Admonition,
    Mermaid: ({ title }) => {
      return (
        <div className="mx-auto w-full py-10">
          {title && <h2 className="text-lg font-medium text-gray-900 underline">{title}</h2>}
          <Mermaid source="service" service={{ ...props }} />
        </div>
      )
    }
  }

  return (
    <div>
      <ContentView {...props}>
        <MDXRemote {...props.source} components={components} />
      </ContentView>
    </div>
  )
}

export async function getStaticProps({ params }) {
  const service = await getServiceBySlug(params.name)
  const events = await getAllEventsThatPublishAndSubscribeToService(service.id);

  return {
    props: {
      ...service,
      events
    },
  }
}

export async function getStaticPaths() {
  const services = getAllServices()
  const paths = services.map((service) => ({ params: { name: service.data.slug } }))

  return {
    paths,
    fallback: false,
  }
}
