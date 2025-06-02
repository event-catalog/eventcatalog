import { ServerIcon } from '@heroicons/react/16/solid';
import type { CollectionEntry } from 'astro:content';
import { Handle } from '@xyflow/react';
import * as ContextMenu from '@radix-ui/react-context-menu';
import { buildUrl } from '@utils/url-builder';
import { getIcon } from '@utils/badges';

interface Data {
  label: string;
  bgColor: string;
  color: string;
  mode: 'simple' | 'full';
  service: CollectionEntry<'services'>;
  showTarget?: boolean;
  showSource?: boolean;
}

function classNames(...classes: any) {
  return classes.filter(Boolean).join(' ');
}

export default function ServiceNode({ data, sourcePosition, targetPosition }: any) {
  const { mode, service } = data as Data;

  const { id, version, owners = [], sends = [], receives = [], name, specifications, repository, styles } = service.data;
  const { node: { color = 'pink', label } = {}, icon = 'ServerIcon' } = styles || {};

  const Icon = getIcon(icon);
  const nodeLabel = label || service?.data?.sidebar?.badge || 'Service';
  const fontSize = nodeLabel.length > 10 ? '7px' : '9px';

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
        <div className={classNames(`w-full rounded-md border flex justify-start  bg-white text-black border-${color}-400`)}>
          <div
            className={classNames(
              `bg-gradient-to-b from-${color}-500 to-${color}-700 relative flex items-center w-5 justify-center rounded-l-sm text-${color}-100`,
              `border-r-[1px] border-${color}-500`
            )}
          >
            {Icon && <Icon className="w-4 h-4 opacity-90 text-white absolute top-1 " />}
            {mode === 'full' && (
              <span
                className={`rotate -rotate-90 w-1/2 text-center absolute bottom-1 text-[${fontSize}] text-white font-bold uppercase tracking-[3px] `}
              >
                {nodeLabel}
              </span>
            )}
          </div>
          <div className="p-1 min-w-60 max-w-[min-content]">
            {targetPosition && <Handle type="target" position={targetPosition} />}
            {sourcePosition && <Handle type="source" position={sourcePosition} />}
            <div className={classNames(mode === 'full' ? `border-b border-gray-200` : '')}>
              <span className="text-xs font-bold block pt-0.5 pb-0.5">{name}</span>
              <div className="flex justify-between">
                <span className="text-[10px] font-light block pt-0.5 pb-0.5 ">v{version}</span>
                {mode === 'simple' && (
                  <span className="text-[10px] text-gray-500 font-light block pt-0.5 pb-0.5 ">{nodeLabel}</span>
                )}
              </div>
            </div>
            {mode === 'full' && (
              <div className="divide-y divide-gray-200 ">
                <div className="leading-3 py-1">
                  <span className="text-[8px] font-light">{service.data.summary}</span>
                </div>

                <div className="grid grid-cols-2 gap-x-4 py-1">
                  <span className="text-xs" style={{ fontSize: '0.2em' }}>
                    Receives messages: {receives.length}
                  </span>
                  <span className="text-xs" style={{ fontSize: '0.2em' }}>
                    Publishes messages: {sends.length}
                  </span>
                  <span className="text-xs" style={{ fontSize: '0.2em' }}>
                    Owners: {owners.length}
                  </span>
                </div>
              </div>
            )}
          </div>
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
