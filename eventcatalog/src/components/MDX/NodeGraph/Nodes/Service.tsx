import { Handle } from '@xyflow/react';
import * as ContextMenu from '@radix-ui/react-context-menu';
import { buildUrl } from '@utils/url-builder';
import { Position } from '@xyflow/react';

import { nodeComponents, type ServiceNode } from '@eventcatalog/visualizer';
const ServiceComponent = nodeComponents.service;

export default function ServiceNode(props: ServiceNode) {
  const { id, version, specifications, repository } = props.data.service as any;

  let asyncApiFiles = Array.isArray(specifications) ? specifications?.filter((spec) => spec.type === 'asyncapi') : ([] as any);
  let openApiFiles = Array.isArray(specifications) ? specifications?.filter((spec) => spec.type === 'openapi') : ([] as any);

  if (!Array.isArray(specifications) && specifications?.asyncapiPath) {
    asyncApiFiles.push({ path: specifications.asyncapiPath, type: 'asyncapi', name: 'AsyncAPI' });
  }

  if (!Array.isArray(specifications) && specifications?.openapiPath) {
    openApiFiles.push({ path: specifications.openapiPath, type: 'openapi', name: 'OpenAPI' });
  }

  // Add filename on asyncApiFiles and openApiFiles
  asyncApiFiles = asyncApiFiles.map((file: any) => {
    return {
      ...file,
      filename: file.path.split('/').pop()?.split('.').shift(),
    };
  });
  openApiFiles = openApiFiles.map((file: any) => {
    return {
      ...file,
      filename: file.path.split('/').pop()?.split('.').shift(),
      name: file.name,
    };
  });

  const repositoryUrl = repository?.url;

  return (
    <ContextMenu.Root>
      <ContextMenu.Trigger>
        <div className="relative">
          <Handle
            type="target"
            position={Position.Left}
            style={{ width: 10, height: 10, background: 'pink', zIndex: 10 }}
            className="bg-pink-500"
          />
          <Handle
            type="source"
            position={Position.Right}
            style={{ width: 10, height: 10, background: 'pink', zIndex: 10 }}
            className="bg-pink-500"
          />
          <ServiceComponent {...props} />
        </div>
      </ContextMenu.Trigger>
      <ContextMenu.Portal>
        <ContextMenu.Content className="min-w-[220px] bg-white rounded-md p-1 shadow-md border border-gray-200">
          <ContextMenu.Item
            asChild
            className="text-sm px-2 py-1.5 outline-none cursor-pointer hover:bg-orange-100 rounded-sm flex items-center"
          >
            <a href={buildUrl(`/docs/services/${id}/${version}`)}>Read documentation</a>
          </ContextMenu.Item>
          <ContextMenu.Separator className="h-[1px] bg-gray-200 m-1" />
          {asyncApiFiles.length > 0 &&
            asyncApiFiles.map((file: any) => (
              <ContextMenu.Item asChild key={file.path}>
                <a
                  href={buildUrl(`/docs/services/${id}/${version}/asyncapi/${file.filename}`)}
                  className="text-sm px-2 py-1.5 outline-none cursor-pointer hover:bg-orange-100 rounded-sm flex items-center"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  View AsyncAPI specification {file.name ? `(${file.name})` : ''}
                </a>
              </ContextMenu.Item>
            ))}
          {openApiFiles.length > 0 &&
            openApiFiles.map((file: any) => (
              <ContextMenu.Item asChild key={file.path}>
                <a
                  href={buildUrl(`/docs/services/${id}/${version}/spec/${file.filename}`)}
                  className="text-sm px-2 py-1.5 outline-none cursor-pointer hover:bg-orange-100 rounded-sm flex items-center"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  View OpenAPI specification {file.name ? `(${file.name})` : ''}
                </a>
              </ContextMenu.Item>
            ))}
          {asyncApiFiles.length > 0 && openApiFiles.length > 0 && <ContextMenu.Separator className="h-[1px] bg-gray-200 m-1" />}
          {repositoryUrl && (
            <>
              <ContextMenu.Item asChild>
                <a
                  href={repositoryUrl}
                  className="text-sm px-2 py-1.5 outline-none cursor-pointer hover:bg-orange-100 rounded-sm flex items-center"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  View code repository
                </a>
              </ContextMenu.Item>
              <ContextMenu.Separator className="h-[1px] bg-gray-200 m-1" />
            </>
          )}
          <ContextMenu.Item asChild>
            <a
              href={buildUrl(`/docs/services/${id}/${version}/changelog`)}
              className="text-sm px-2 py-1.5 outline-none cursor-pointer hover:bg-orange-100 rounded-sm flex items-center"
              target="_blank"
              rel="noopener noreferrer"
            >
              Read changelog
            </a>
          </ContextMenu.Item>
        </ContextMenu.Content>
      </ContextMenu.Portal>
    </ContextMenu.Root>
  );
}
