import { buildUrl } from '@utils/url-builder';

export type SpecificationType = 'openapi' | 'asyncapi' | 'graphql';

export interface Specification {
  type: SpecificationType;
  path: string;
  name?: string;
  filename: string;
  filenameWithoutExtension: string;
}

export const getSpecUrl = (spec: Specification, serviceId: string, serviceVersion: string): string => {
  switch (spec.type) {
    case 'openapi':
      return buildUrl(`/docs/services/${serviceId}/${serviceVersion}/spec/${spec.filenameWithoutExtension}`);
    case 'asyncapi':
      return buildUrl(`/docs/services/${serviceId}/${serviceVersion}/asyncapi/${spec.filenameWithoutExtension}`);
    case 'graphql':
      return buildUrl(`/docs/services/${serviceId}/${serviceVersion}/graphql/${spec.filenameWithoutExtension}`);
    default:
      return '#';
  }
};

export const getSpecIcon = (type: string): string => {
  switch (type) {
    case 'openapi':
      return 'openapi';
    case 'asyncapi':
      return 'asyncapi';
    case 'graphql':
      return 'graphql';
    default:
      return 'json-schema';
  }
};

export const getSpecLabel = (type: string): string => {
  switch (type) {
    case 'openapi':
      return 'OpenAPI';
    case 'asyncapi':
      return 'AsyncAPI';
    case 'graphql':
      return 'GraphQL';
    default:
      return type;
  }
};

export const getSpecColor = (type: string): string => {
  switch (type) {
    case 'openapi':
      return 'green';
    case 'asyncapi':
      return 'purple';
    case 'graphql':
      return 'pink';
    default:
      return 'gray';
  }
};

// Helper to normalize specifications from service data
export const getServiceSpecifications = (data: any): Specification[] => {
  const specs = data?.specifications;
  if (!specs) return [];

  // Handle array format
  if (Array.isArray(specs)) {
    return specs.map((spec: any) => {
      const filename = spec.path?.split('/').pop() || spec.path;
      const filenameWithoutExtension = filename?.replace(/\.[^/.]+$/, '') || '';
      return {
        type: spec.type,
        path: spec.path,
        name: spec.name,
        filename,
        filenameWithoutExtension,
      };
    });
  }

  // Handle legacy object format
  const result: Specification[] = [];
  if (specs.asyncapiPath) {
    const filename = specs.asyncapiPath.split('/').pop();
    result.push({
      type: 'asyncapi',
      path: specs.asyncapiPath,
      filename,
      filenameWithoutExtension: filename?.replace(/\.[^/.]+$/, '') || '',
    });
  }
  if (specs.openapiPath) {
    const filename = specs.openapiPath.split('/').pop();
    result.push({
      type: 'openapi',
      path: specs.openapiPath,
      filename,
      filenameWithoutExtension: filename?.replace(/\.[^/.]+$/, '') || '',
    });
  }
  return result;
};
