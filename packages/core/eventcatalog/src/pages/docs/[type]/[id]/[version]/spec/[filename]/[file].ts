import { isSSR } from '@utils/feature';
import { createRawSpecificationRoute } from '@utils/raw-specification';
import { Page } from '../_[filename].data';

// The specification's file, as written, next to its page
export const prerender = !isSSR();
export const { getStaticPaths, GET } = createRawSpecificationRoute('openapi', Page);
