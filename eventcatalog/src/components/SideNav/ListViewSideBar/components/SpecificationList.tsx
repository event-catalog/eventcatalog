import React from 'react';
import { buildUrl } from '@utils/url-builder';
import type { ServiceItem } from '../types';

interface SpecificationListProps {
  specifications: {
    type: string;
    path: string;
    name?: string;
    filename?: string;
    filenameWithoutExtension?: string;
  }[];
  id: string;
  version: string;
}

const SpecificationList: React.FC<SpecificationListProps> = ({ specifications, id, version }) => {
  const asyncAPISpecifications = specifications.filter((spec) => spec.type === 'asyncapi');
  const openAPISpecifications = specifications.filter((spec) => spec.type === 'openapi');
  const graphQLSpecifications = specifications.filter((spec) => spec.type === 'graphql');

  return (
    <ul className="space-y-0.5 border-l border-gray-200/80 ml-[9px] pl-4">
      {asyncAPISpecifications &&
        asyncAPISpecifications.length > 0 &&
        asyncAPISpecifications.map((spec) => (
          <a
            key={`${spec.name}-asyncapi`}
            href={buildUrl(`/docs/services/${id}/${version}/asyncapi/${spec.filenameWithoutExtension}`)}
            data-active={window.location.href.includes(`docs/services/${id}/${version}/asyncapi`)}
            className={`flex items-center px-2 py-1.5 text-xs text-gray-600 hover:bg-purple-100 rounded-md justify-between ${
              window.location.href.includes(`docs/services/${id}/${version}/asyncapi`) ? 'bg-purple-100' : 'hover:bg-purple-100'
            }`}
          >
            <span className="truncate flex items-center gap-1">{spec.name}</span>
            <span className="text-purple-600 ml-2 text-[10px] uppercase font-medium bg-gray-50 px-4 py-0.5 rounded">
              <img src={buildUrl('/icons/asyncapi.svg', true)} className="w-4 h-4" alt="AsyncAPI" />
            </span>
          </a>
        ))}
      {openAPISpecifications &&
        openAPISpecifications.length > 0 &&
        openAPISpecifications.map((spec) => (
          <a
            key={`${spec.name}-openapi`}
            href={buildUrl(`/docs/services/${id}/${version}/spec/${spec.filenameWithoutExtension}`)}
            data-active={window.location.href.includes(`docs/services/${id}/${version}/spec/${spec.filenameWithoutExtension}`)}
            className={`items-center px-2 py-1.5 text-xs text-gray-600 hover:bg-purple-100 rounded-md flex justify-between ${
              window.location.href.includes(`docs/services/${id}/${version}/spec/${spec.filenameWithoutExtension}`)
                ? 'bg-purple-100'
                : 'hover:bg-purple-100'
            }`}
          >
            <span className="truncate flex items-center gap-1">{spec.name}</span>
            <span className="text-green-600 ml-2 text-[10px] uppercase font-medium bg-gray-50 px-4 py-0.5 rounded">
              <img src={buildUrl('/icons/openapi.svg', true)} className="w-4 h-4" alt="OpenAPI" />
            </span>
          </a>
        ))}
      {graphQLSpecifications &&
        graphQLSpecifications.length > 0 &&
        graphQLSpecifications.map((spec) => (
          <a
            key={`${spec.name}-openapi`}
            href={buildUrl(`/docs/services/${id}/${version}/graphql/${spec.filenameWithoutExtension}`)}
            data-active={window.location.href.includes(`docs/services/${id}/${version}/graphql/${spec.filenameWithoutExtension}`)}
            className={`items-center px-2 py-1.5 text-xs text-gray-600 hover:bg-purple-100 rounded-md flex justify-between ${
              window.location.href.includes(`docs/services/${id}/${version}/graphql/${spec.filenameWithoutExtension}`)
                ? 'bg-purple-100'
                : 'hover:bg-purple-100'
            }`}
          >
            <span className="truncate flex items-center gap-1">{spec.name}</span>
            <span className="text-green-600 ml-2 text-[10px] uppercase font-medium bg-gray-50 px-4 py-0.5 rounded">
              <img src={buildUrl('/icons/graphql.svg', true)} className="w-4 h-4" alt="GraphQL" />
            </span>
          </a>
        ))}
    </ul>
  );
};

export default SpecificationList;
