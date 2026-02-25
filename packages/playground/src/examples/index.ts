export type { Example } from './types';

import { example as paymentDomain } from './01-payment-domain';
import { example as orderServiceShowcase } from './02-order-service-showcase';
import { example as minimalService } from './03-minimal-service';
import { example as ecommercePlatform } from './04-ecommerce-platform';
import { example as eventDrivenSaga } from './05-event-driven-saga';
import { example as dataProducts } from './06-data-products';
import { example as multiFileImports } from './07-multi-file-imports';
import { example as remoteUrlImports } from './08-remote-url-imports';
import { example as bankingSubdomains } from './09-banking-subdomains';
import { example as planningFutureServices } from './10-planning-future-services';
import { example as enterpriseEcommerce } from './11-enterprise-ecommerce';
import { example as notesAnnotations } from './12-notes-annotations';
import { example as channelRouting } from './13-channel-routing';
import { example as awsEventPipeline } from './14-aws-event-pipeline';
import { example as flowOrderFulfillment } from './15-flow-order-fulfillment';
import { example as flowEcommerceCheckout } from './16-flow-ecommerce-checkout';
import { example as asyncapiImport } from './17-asyncapi-import';
import { example as asyncapiRemoteImport } from './18-asyncapi-remote-import';
import { example as asyncapiServiceImport } from './19-asyncapi-service-import';
import { example as asyncapiMultiService } from './20-asyncapi-multi-service';
import { example as openapiImport } from './21-openapi-import';
import { example as openapiServiceImport } from './22-openapi-service-import';
import { example as openapiAsyncapiMixed } from './23-openapi-asyncapi-mixed';
import { example as openapiRemoteImport } from './24-openapi-remote-import';

import type { Example } from './types';

export const examples: Example[] = [
  paymentDomain,
  orderServiceShowcase,
  minimalService,
  ecommercePlatform,
  eventDrivenSaga,
  dataProducts,
  multiFileImports,
  remoteUrlImports,
  bankingSubdomains,
  planningFutureServices,
  enterpriseEcommerce,
  notesAnnotations,
  channelRouting,
  awsEventPipeline,
  flowOrderFulfillment,
  flowEcommerceCheckout,
  asyncapiImport,
  asyncapiRemoteImport,
  asyncapiServiceImport,
  asyncapiMultiService,
  openapiImport,
  openapiServiceImport,
  openapiAsyncapiMixed,
  openapiRemoteImport,
];
