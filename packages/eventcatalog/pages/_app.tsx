import '../styles/globals.css';
import { AppProps } from 'next/app';
import Head from 'next/head';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { EventCatalogContextProvider } from '@/hooks/EventCatalog';

export default ({ Component, pageProps }: AppProps) => (
  <EventCatalogContextProvider>
    <Head>
      <title>EventCatalog</title>
      <script src="//unpkg.com/three" />
      <script src="//unpkg.com/three/examples/js/renderers/CSS2DRenderer.js" />

      <link rel="stylesheet" href="https://cdn.bootcss.com/font-awesome/4.7.0/css/font-awesome.css" />

      <meta
        name="description"
        content="An open source project to Discover, Explore and Document your Event Driven Architectures."
      />
      <meta property="og:url" content="https://eventcatalog.dev/" />
      <meta property="og:type" content="website" />
      <meta property="og:title" content="EventCatalog | Discover, Explore and Document your Event Driven Architectures." />
      <meta
        property="og:description"
        content="An open source tool powered by markdown to document your Event Driven Architecture."
      />
      <meta property="og:image" content="https://eventcatalog.dev/img/opengraph.png" />
      <meta property="og:image:alt" content="EventCatalog | Discover, Explore and Document your Event Driven Architectures." />
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
