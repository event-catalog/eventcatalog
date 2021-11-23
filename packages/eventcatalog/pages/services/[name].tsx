import ContentView from '@/components/ContentView'
import {
  getAllServices,
  getServiceBySlug,
  getAllEventsThatPublishAndSubscribeToService,
} from '@/lib/eventcatalog'
import { MDXRemote } from 'next-mdx-remote'

import Admonition from '@/components/Mdx/Admonition'
import Mermaid from '@/components/Mermaid'
import ServiceSidebar from '@/components/Sidebars/ServiceSidebar'
import BreadCrumbs from '@/components/BreadCrumbs'

import { Service, MarkdownFile } from '@/types/index'

interface ServicesPageProps {
  service: Service
  markdown: MarkdownFile
}

export default function Services(props: ServicesPageProps) {

  const { service, markdown } = props; 
  const { name, slug, summary, draft } = service;


  const mdxComponents = {
    Admonition,
    Mermaid: ({ title }) => {
      return (
      <div className="mx-auto w-full py-10">
          {title && <h2 className="text-lg font-medium text-gray-900 underline">{title}</h2>}
          <Mermaid source="service" data={service} />
        </div>
      )
    },
  }

  const pages = [
    { name: 'Services', href: '/services', current: false },
    { name, href: `/services/${slug}`, current: true },
  ]

  return (
    <div>
      <ContentView
        title={name}
        subtitle={summary}
        draft={draft}
        lastModifiedDate="2000"
        breadCrumbs={() => <BreadCrumbs pages={pages} />}
        sidebar={() => (
          <ServiceSidebar
            service={service}
          />
        )}
      >
        {/* @ts-ignore */}
        <MDXRemote {...markdown.source} components={mdxComponents} />
      </ContentView>
    </div>
  )
}

export async function getStaticProps({ params }) {
  const { service, markdown } = await getServiceBySlug(params.name)
  const events = await getAllEventsThatPublishAndSubscribeToService(service.id)
  return {
    props: {
      service: {
        ...service,
        ...events
      },
      markdown
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
