import '../styles/globals.css';
import { AppProps } from 'next/app';

import Head from 'next/head';
import getConfig from 'next/config';
import { OpenGraphConfig } from '@eventcatalog/types';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { EventCatalogContextProvider, useConfig } from '@/hooks/EventCatalog';

function Page({ Component, pageProps }: AppProps) {
  const {
    title = 'EventCatalog | Discover, Explore and Document your Event Driven Architectures.',
    tagline = 'An open source tool powered by markdown to document your Event Driven Architecture.',
    homepageLink = 'https://eventcatalog.dev/',
    openGraph = {},
  } = useConfig();
  const { publicRuntimeConfig: { basePath = '' } = {} } = getConfig();
  const {
    ogTitle = title,
    ogDescription = tagline,
    ogImage = 'https://eventcatalog.dev/img/opengraph.png',
    ogUrl = homepageLink,
  } = openGraph as OpenGraphConfig;

  return (
    <EventCatalogContextProvider>
      <Head>
        <title>{title}</title>

        <meta name="description" content={tagline} />

        <link rel="icon" href={`${basePath}/favicon.ico`} />

        {ogUrl && ogUrl !== '' && <meta property="og:url" content={ogUrl} />}
        <meta property="og:type" content="website" />
        {ogTitle && <meta property="og:title" content={ogTitle} />}
        {ogDescription && <meta property="og:description" content={ogDescription} />}
        {ogImage && (
          <>
            <meta property="og:image" content={ogImage} />
            <meta property="og:image:alt" content={`${ogTitle} | ${ogDescription}`} />
            <meta property="og:image:width" content="1200" />
            <meta property="og:image:height" content="600" />
          </>
        )}
        <meta property="og:locale" content="en-GB" />
        <meta name="author" content="David Boyne" />
      </Head>
      <Header />
      <Component {...pageProps} />
      <Footer />
    </EventCatalogContextProvider>
  );
}

export default Page;
