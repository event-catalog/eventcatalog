import ServicePage from '../../../services/[name]';
import { getAllServices, getServiceByName } from '@/lib/services';

export default ServicePage;

export async function getStaticProps({ params }) {
  try {
    const { service, markdown } = await getServiceByName({
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
          { name: service.name, href: `/domains/${service.domain}/services/${service.name}`, current: true },
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
  const services = getAllServices();
  const paths = services.map((service) => ({ params: { name: service.name, domain: service.domain } }));
  return {
    paths,
    fallback: false,
  };
}
