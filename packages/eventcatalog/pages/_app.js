import '../styles/globals.css'
import Head from 'next/head'
import Header from '@/components/Header'
import Footer from '@/components/Footer'
import { EventCatalogContextProvider } from '@/hooks/EventCatalog'

export default ({ Component, pageProps }) => {
  return (
    <EventCatalogContextProvider>
      <Head>
        <title>EventCatalog</title>
        <script src="//unpkg.com/three"></script>
        <script src="//unpkg.com/three/examples/js/renderers/CSS2DRenderer.js"></script>
      </Head>
      <Header />
      <Component {...pageProps} />
      <Footer />
    </EventCatalogContextProvider>
  )
}
