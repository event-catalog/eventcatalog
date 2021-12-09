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
    </Head>
    <Header />
    <Component {...pageProps} />
    <Footer />
  </EventCatalogContextProvider>
);
