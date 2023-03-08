import Head from 'next/head';
import { MDXRemote } from 'next-mdx-remote';

import { Domain } from '@eventcatalog/types';
import ContentView from '@/components/ContentView';
import { getDomainByName, getAllDomains } from '@/lib/domains';

import Admonition from '@/components/Mdx/Admonition';
import DomainSideBar from '@/components/Sidebars/DomainSidebar';
import BreadCrumbs from '@/components/BreadCrumbs';
import NotFound from '@/components/NotFound';
import { useConfig, useUrl } from '@/hooks/EventCatalog';

import getBackgroundColor from '@/utils/random-bg';

import { MarkdownFile } from '@/types/index';
import NodeGraph from '@/components/Mdx/NodeGraph/NodeGraph';

interface DomainsPageProps {
  domain: Domain;
  markdown: MarkdownFile;
  notFound?: boolean;
}

const getComponents = (domain: Domain) => ({
  Admonition,
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
        source="domain"
        data={domain}
        rootNodeColor={getBackgroundColor(domain.name)}
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

export default function Domains(props: DomainsPageProps) {
  const { domain, markdown, notFound } = props;
  const { title } = useConfig();
  const { getEditUrl, hasEditUrl } = useUrl();

  if (notFound)
    return (
      // TODO: Allow domain not found
      <NotFound type="domain" name={domain.name} editUrl={hasEditUrl ? getEditUrl(`/domains/${domain.name}/index.md`) : ''} />
    );

  const { name, summary } = domain;
  const { lastModifiedDate } = markdown;

  const mdxComponents = getComponents(domain);

  const pages = [
    { name: 'Domains', href: '/domains', current: false },
    { name, href: `/domains/${name}`, current: true },
  ];

  return (
    <>
      <Head>
        <title>
          {title} - {name}
        </title>
      </Head>
      <ContentView
        title={name}
        editUrl={hasEditUrl ? getEditUrl(`/domains/${name}/index.md`) : ''}
        subtitle={summary}
        lastModifiedDate={lastModifiedDate}
        breadCrumbs={<BreadCrumbs pages={pages} homePath="/domains" />}
        sidebar={<DomainSideBar domain={domain} />}
      >
        {/* @ts-ignore */}
        <MDXRemote {...markdown.source} components={mdxComponents} />
      </ContentView>
    </>
  );
}

export async function getStaticProps({ params }) {
  try {
    const { domain, markdown } = await getDomainByName({ domainName: params.domain });

    return {
      props: {
        domain,
        markdown,
      },
    };
  } catch (error) {
    return {
      props: {
        notFound: true,
        domain: { name: params.domain },
      },
    };
  }
}

export async function getStaticPaths() {
  const data = await getAllDomains();
  const domains = data.map((item) => item.domain);

  const paths = domains.map((domain) => ({ params: { domain: domain.name } }));

  return {
    paths,
    fallback: false,
  };
}
