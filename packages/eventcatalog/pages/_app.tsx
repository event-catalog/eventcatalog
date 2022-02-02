import '../styles/globals.css';
import { AppProps } from 'next/app';

import Head from 'next/head';
import { useEffect, useState } from 'react';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { EventCatalogContextProvider, useConfig } from '@/hooks/EventCatalog';

function Page({ Component, pageProps }: AppProps) {
  const { title, tagline } = useConfig();

  const [url, setUrl] = useState('https://eventcatalog.dev');
  useEffect(() => {
    setUrl(window.location.href);
  }, []);

  return (
    <EventCatalogContextProvider>
      <Head>
        <title>{title}</title>
        <script src="//unpkg.com/three" />
        <script src="//unpkg.com/three/examples/js/renderers/CSS2DRenderer.js" />

        <link rel="stylesheet" href="https://cdn.bootcss.com/font-awesome/4.7.0/css/font-awesome.css" />

        <meta name="description" content={tagline} />

        <meta property="og:url" content={url} />
        <meta property="og:type" content="website" />
        <meta property="og:title" content={title} />
        <meta property="og:description" content={tagline} />
        <meta property="og:image" content={`${url}img/opengraph.png`} />
        <meta property="og:image:alt" content={`${title} | ${tagline}`} />
        <meta property="og:image:width" content="1200" />
        <meta property="og:image:height" content="600" />
        <meta property="og:locale" content="en-GB" />
        <meta name="author" content="David Boyne" />

        {/* Need to load this before any of the Html2Diff Code */}
        <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/highlight.js/9.13.1/styles/atom-one-light.min.css" />
      </Head>
      <Header />
      <Component {...pageProps} />
      <Footer />
    </EventCatalogContextProvider>
  );
}

export default Page;
