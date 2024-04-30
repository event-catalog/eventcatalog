import Head from 'next/head';
import { MDXRemote } from 'next-mdx-remote';
import { useConfig, useUrl } from '@/hooks/EventCatalog';
import { getAllServices, getExtraDocByName } from '@/lib/services';
import { MarkdownFile } from '@/types/index';
import { Service } from '@eventcatalog/types';
import NotFound from '@/components/NotFound';
import ContentView from '@/components/ContentView';
import BreadCrumbs from '@/components/BreadCrumbs';
import ServiceSidebar from '@/components/Sidebars/ServiceSidebar';
import { getComponents } from '../[name]';

interface ExtraServiceDocPageProps {
  service: Service;
  markdown: MarkdownFile;
  notFound?: boolean;
  breadCrumbs: any;
}

export default function ExtraServiceDoc(props: ExtraServiceDocPageProps) {
  const { service, markdown, notFound, breadCrumbs } = props;
  const { title } = useConfig();
  const { getEditUrl, hasEditUrl } = useUrl();

  const editURL = () => {
    if (!hasEditUrl) return '';
    const path = service.domain
      ? `/domains/${service.domain}/services/${service.name}/index.md`
      : `/services/${service.name}/index.md`;

    return getEditUrl(path);
  };

  if (notFound) return <NotFound type="service" name={service.name} editUrl={editURL()} />;

  const { name, summary, draft } = service;
  const { lastModifiedDate } = markdown;

  const mdxComponents = getComponents(service);

  return (
    <>
      <Head>
        <title>
          {title} - {name}
        </title>
      </Head>
      <ContentView
        title={name}
        editUrl={editURL()}
        subtitle={summary}
        draft={draft}
        lastModifiedDate={lastModifiedDate}
        breadCrumbs={<BreadCrumbs pages={breadCrumbs} homePath="/services" />}
        sidebar={<ServiceSidebar service={service} />}
      >
        {/* @ts-ignore */}
        <MDXRemote {...markdown.source} components={mdxComponents} />
      </ContentView>
    </>
  );
}

export async function getStaticProps({ params }: { params: { name: string; extraDoc: string } }) {
  try {
    const { service, markdown } = await getExtraDocByName({
      extraDoc: params.extraDoc,
      serviceName: params.name,
    });

    return {
      props: {
        service,
        markdown,
        breadCrumbs: [
          { name: 'Services', href: `/services`, current: false },
          { name: service.name, href: `/services/${service.name}`, current: false },
          { name: params.extraDoc, href: `/services/${service.name}/${params.extraDoc}`, current: true },
        ],
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
  const paths = services.flatMap((service) =>
    service.extraDocs.map((extraDoc) => ({ params: { name: service.name, extraDoc } }))
  );
  return {
    paths,
    fallback: false,
  };
}
