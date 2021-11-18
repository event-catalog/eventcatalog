import '../styles/globals.css';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { EventCatalogContextProvider } from '@/hooks/EventCatalog';

export default ({ Component, pageProps }) => {
  return (
    <EventCatalogContextProvider>
      <Header />
      <Component {...pageProps} />
      <Footer/>
    </EventCatalogContextProvider>
  );
};
