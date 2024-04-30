import { getExtraDocByName } from '@/lib/services';
import ExtraServiceDoc from '../../../../services/[name]/[extraDoc]';
import { getAllServicesFromDomains } from '@/lib/domains';

export default ExtraServiceDoc;

export async function getStaticProps({ params }: { params: { domain: string; name: string; extraDoc: string } }) {
  try {
    const { service, markdown } = await getExtraDocByName({
      extraDoc: params.extraDoc,
      serviceName: params.name,
      domain: params.domain,
    });

    return {
      props: {
        service,
        markdown,
        breadCrumbs: [
          { name: 'Domain', href: '/domains', current: false },
          { name: service.domain, href: `/domains/${service.domain}`, current: false },
          { name: 'Services', href: `/services`, current: false },
          { name: service.name, href: `/domains/${service.domain}/services/${service.name}`, current: false },
          {
            name: params.extraDoc,
            href: `/domains/${service.domain}/services/${service.name}/${params.extraDoc}`,
            current: true,
          },
        ],
      },
    };
  } catch (error) {
    return {
      props: {
        notFound: true,
        service: { name: params.name },
      },
    };
  }
}

export async function getStaticPaths() {
  const services = getAllServicesFromDomains();
  const paths = services.flatMap((service) =>
    service.extraDocs.map((extraDoc) => ({ params: { name: service.name, domain: service.domain, extraDoc } }))
  );
  return {
    paths,
    fallback: false,
  };
}
