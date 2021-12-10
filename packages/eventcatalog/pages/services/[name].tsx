import { MDXRemote } from 'next-mdx-remote';
import { Service } from '@eventcatalogtest/types';
import { editUrl } from '../../eventcatalog.config.js';
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

function MermaidComponent({ title, service }: { title: string; service: Service }) {
  return (
    <div className="mx-auto w-full py-10">
      {title && <h2 className="text-lg font-medium text-gray-900 underline">{title}</h2>}
      <Mermaid source="service" data={service} rootNodeColor={getBackgroundColor(service.name)} />
    </div>
  );
}

const getComponents = (service) => ({
  Admonition,
  Mermaid: ({ title }: { title: string }) => <MermaidComponent service={service} title={title} />,
});

export default function Services(props: ServicesPageProps) {
  const { service, markdown, notFound } = props;
  const { getEditUrl } = useUrl();

  if (notFound) return <NotFound type="service" name={service.name} editUrl={editUrl} />;

  const { name, summary, draft } = service;
  const { lastModifiedDate } = markdown;

  const mdxComponents = getComponents(service);

  const pages = [
    { name: 'Services', href: '/services', current: false },
    { name, href: `/services/${name}`, current: true },
  ];

  return (
    <div>
      <ContentView
        title={name}
        editUrl={getEditUrl(`/services/${name}/index.md`)}
        subtitle={summary}
        draft={draft}
        lastModifiedDate={lastModifiedDate}
        breadCrumbs={<BreadCrumbs pages={pages} />}
        sidebar={<ServiceSidebar service={service} />}
      >
        {/* @ts-ignore */}
        <MDXRemote {...markdown.source} components={mdxComponents} />
      </ContentView>
    </div>
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
