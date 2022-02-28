import Head from 'next/head';
import { Service, Domain } from '@eventcatalog/types';

import DomainGrid from '@/components/Grids/DomainGrid';
import { getAllServices } from '@/lib/services';
import { useConfig } from '@/hooks/EventCatalog';
import { getAllDomains } from '@/lib/domains';

export interface PageProps {
  services: Service[];
  domains: Domain[];
}

export default function Page({ domains }: PageProps) {
  const { title } = useConfig();

  return (
    <>
      <Head>
        <title>{title} - All Domains</title>
      </Head>
      <main className="max-w-7xl mx-auto md:min-h-screen px-4 md:px-0">
        <div className="relative z-10 flex items-baseline justify-between pt-8 pb-6 border-b border-gray-200">
          <h1 className="text-2xl font-extrabold tracking-tight text-gray-900">Domains ({domains.length})</h1>
        </div>

        <section className="pt-6 pb-24">
          <div className="grid grid-cols-4 gap-x-8 gap-y-10">
            <form className="hidden lg:block">
              <div className="border-b border-gray-200 pb-6">
                <h3 className="-my-3 flow-root">
                  <div className="py-3 bg-white w-full flex items-center justify-between text-sm text-gray-400 hover:text-gray-500">
                    <span className="font-medium text-gray-900">Features</span>
                  </div>
                </h3>
                <div className="mt-4 text-xs text-gray-400">No Filters for Domains</div>
              </div>
            </form>

            <div className="col-span-4 lg:col-span-3">
              <div>
                <h2 className="text-gray-500 text-xs font-medium uppercase tracking-wide">Domains</h2>
                <DomainGrid domains={domains} />
              </div>
            </div>
          </div>
        </section>
      </main>
    </>
  );
}

export async function getStaticProps() {
  const services = getAllServices();
  const allDomains = await getAllDomains();
  const domains = allDomains.map((item) => item.domain);

  return {
    props: {
      services,
      domains,
    },
  };
}
