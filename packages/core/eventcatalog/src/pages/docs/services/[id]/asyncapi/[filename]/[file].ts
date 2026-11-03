import { isSSR } from '@utils/feature';
import { Page } from '../../../../[type]/[id]/[version]/asyncapi/_[filename].data';
import { createLatestServiceRawSpecificationRoute } from '../../../_latest-raw-specification-route';

// The file of the service's latest specification, at a URL that doesn't change with each release
export const prerender = !isSSR();
export const { getStaticPaths, GET } = createLatestServiceRawSpecificationRoute('asyncapi', Page);
