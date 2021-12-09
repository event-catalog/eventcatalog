import React from 'react';
import Layout from '@theme/Layout';

import Hero from '../components/Hero';
import Features from '../components/Features';
import CTA from '../components/CTA';

export default function Home() {
  return (
    <Layout
      title="EventCatalog: Simple tool to document your events"
      description="Description will go into a meta tag in <head />"
    >
      <main id="tailwind">
        <Hero />
        <Features />
        <CTA />
      </main>
    </Layout>
  );
}
