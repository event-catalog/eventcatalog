import ContentView from '@/components/ContentView'
import {
  getAllServices,
  getServiceByName
} from '@/lib/services'

import { MDXRemote } from 'next-mdx-remote'

import Admonition from '@/components/Mdx/Admonition'
import Mermaid from '@/components/Mermaid'
import ServiceSidebar from '@/components/Sidebars/ServiceSidebar'
import BreadCrumbs from '@/components/BreadCrumbs'
import { getBackgroundColor } from '@/utils/random-bg'
import { useUrl } from '@/hooks/EventCatalog'

import { MarkdownFile } from '@/types/index'

import { Service } from '@eventcatalogtest/types'

interface ServicesPageProps {
  service: Service
  markdown: MarkdownFile
}

export default function Services(props: ServicesPageProps) {

  const { service, markdown } = props; 
  const { name, summary, draft } = service;

  const { getEditUrl } = useUrl();


  const mdxComponents = {
    Admonition,
    Mermaid: ({ title }) => {
      return (
      <div className="mx-auto w-full py-10">
          {title && <h2 className="text-lg font-medium text-gray-900 underline">{title}</h2>}
          <Mermaid source="service" data={service}  rootNodeColor={getBackgroundColor(service.name)} />
        </div>
      )
    },
  }

  const pages = [
    { name: 'Services', href: '/services', current: false },
    { name, href: `/services/${name}`, current: true },
  ]

  return (
    <div>
      <ContentView
        title={name}
        editUrl={getEditUrl(`/services/${name}/index.md`)}
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
  const { service, markdown } = await getServiceByName(params.name)
  return {
    props: {
      service: service,
      markdown
    },
  }
}

export async function getStaticPaths() {
  const services = getAllServices()
  const paths = services.map((service) => ({ params: { name: service.name } }))
  return {
    paths,
    fallback: false,
  }
}
