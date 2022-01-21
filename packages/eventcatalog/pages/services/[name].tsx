import Head from 'next/head';
import { MDXRemote } from 'next-mdx-remote';
import { Service } from '@eventcatalog/types';
import ContentView from '@/components/ContentView';
import { getAllServices, getServiceByName } from '@/lib/services';

import Admonition from '@/components/Mdx/Admonition';
import Mermaid from '@/components/Mermaid';
import ServiceSidebar from '@/components/Sidebars/ServiceSidebar';
import BreadCrumbs from '@/components/BreadCrumbs';
import NotFound from '@/components/NotFound';
import getBackgroundColor from '@/utils/random-bg';
import { useUrl } from '@/hooks/EventCatalog';

import { MarkdownFile } from '@/types/index';

interface ServicesPageProps {
  service: Service;
  markdown: MarkdownFile;
  notFound?: boolean;
}

function MermaidComponent({ title, service, charts }: { title: string; service: Service; charts?: string[] }) {
  return (
    <div className="mx-auto w-full py-10">
      {title && <h2 className="text-lg font-medium text-gray-900 underline">{title}</h2>}
      <Mermaid source="service" data={service} rootNodeColor={getBackgroundColor(service.name)} charts={charts} />
    </div>
  );
}

const getComponents = (service) => ({
  Admonition,
  Mermaid: ({ title, charts }: { title: string; charts?: string[] }) => (
    <MermaidComponent service={service} title={title} charts={charts} />
  ),
});

export default function Services(props: ServicesPageProps) {
  const { service, markdown, notFound } = props;
  const { getEditUrl, hasEditUrl } = useUrl();

  if (notFound)
    return (
      <NotFound type="service" name={service.name} editUrl={hasEditUrl ? getEditUrl(`/services/${service.name}/index.md`) : ''} />
    );

  const { name, summary, draft } = service;
  const { lastModifiedDate } = markdown;

  const mdxComponents = getComponents(service);

  const pages = [
    { name: 'Services', href: '/services', current: false },
    { name, href: `/services/${name}`, current: true },
  ];

  return (
    <>
      <Head>
        <title>{name}</title>
      </Head>
      <ContentView
        title={name}
        editUrl={hasEditUrl ? getEditUrl(`/services/${name}/index.md`) : ''}
        subtitle={summary}
        draft={draft}
        lastModifiedDate={lastModifiedDate}
        breadCrumbs={<BreadCrumbs pages={pages} homePath="/services" />}
        sidebar={<ServiceSidebar service={service} />}
      >
        {/* @ts-ignore */}
        <MDXRemote {...markdown.source} components={mdxComponents} />
      </ContentView>
    </>
  );
}

export async function getStaticProps({ params }) {
  try {
    const { service, markdown } = await getServiceByName(params.name);

    return {
      props: {
        service,
        markdown,
      },
    };
  } catch (error) {
    return {
      props: {
        notFound: true,
        service: { name: params.name },
      },
    };
  }
}

export async function getStaticPaths() {
  const services = getAllServices();
  const paths = services.map((service) => ({ params: { name: service.name } }));
  return {
    paths,
    fallback: 'blocking',
  };
}
