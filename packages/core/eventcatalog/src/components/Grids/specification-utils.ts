import { isIconPath, resolveIconUrl } from '@utils/icon';
import { buildUrl } from '@utils/url-builder';

export type SpecificationType = 'openapi' | 'asyncapi' | 'graphql' | 'generic';

export interface Specification {
  type: SpecificationType;
  path: string;
  name?: string;
  icon?: string;
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
    case 'generic':
      return buildUrl(`/docs/services/${serviceId}/${serviceVersion}/generic/${spec.filenameWithoutExtension}`);
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
    case 'generic':
      return 'api';
    default:
      return 'json-schema';
  }
};

export const getSpecIconUrl = (spec: Specification): string => {
  if (spec.type === 'generic' && isIconPath(spec.icon)) return resolveIconUrl(spec.icon);
  return buildUrl(`/icons/${getSpecIcon(spec.type)}.svg`, true);
};

export const getSpecLabel = (type: string): string => {
  switch (type) {
    case 'openapi':
      return 'OpenAPI';
    case 'asyncapi':
      return 'AsyncAPI';
    case 'graphql':
      return 'GraphQL';
    case 'generic':
      return 'API';
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
    case 'generic':
      return 'gray';
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
        icon: spec.icon,
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
