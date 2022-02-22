import React from 'react';
import Layout from '@theme/Layout';
import Head from '@docusaurus/Head';

import Hero from '../components/Hero';
import Features from '../components/Features';
import CTA from '../components/CTA';

export default function Home() {
  return (
    <Layout
      title="EventCatalog: Discover, Explore and Document your Event Driven Architectures."
      description="An open source tool powered by markdown to document your Event Driven Architecture."
    >
      <Head>
        <script src="https://cdnjs.cloudflare.com/ajax/libs/highlight.js/9.15.8/highlight.min.js" />
        <meta name="description" content="An open source tool powered by markdown to document your Event Driven Architecture." />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:site" content="https://twitter.com/boyney123" />
        <meta name="twitter:creator" content="https://twitter.com/boyney123" />
        <meta property="og:url" content="https://eventcatalog.dev/" />
        <meta property="og:type" content="website" />
        <meta property="og:title" content="EventCatalog: Discover, Explore and Document your Event Driven Architectures." />
        <meta
          property="og:description"
          content="An open source tool powered by markdown to document your Event Driven Architecture."
        />
        <meta property="og:image" content="https://eventcatalog.dev/img/opengraph.png" />
        <meta property="og:image:alt" content="EventCatalog: Discover, Explore and Document your Event Driven Architectures." />
        <meta property="og:image:width" content="1200" />
        <meta property="og:image:height" content="600" />
        <meta property="og:locale" content="en-GB" />
        <meta name="author" content="David Boyne" />
      </Head>
      <main id="tailwind">
        <Hero />
        <Features />
        <CTA />
      </main>
    </Layout>
  );
}
