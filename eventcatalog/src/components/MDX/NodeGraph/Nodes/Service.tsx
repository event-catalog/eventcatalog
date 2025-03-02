import { ServerIcon } from '@heroicons/react/16/solid';
import type { CollectionEntry } from 'astro:content';
import { Handle } from '@xyflow/react';
import * as ContextMenu from '@radix-ui/react-context-menu';
import { buildUrl } from '@utils/url-builder';

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
  const { label, bgColor = 'bg-blue-500', mode, service } = data as Data;

  const { id, version, owners = [], sends = [], receives = [], name, specifications, repository } = service.data;
  const asyncApiPath = specifications?.asyncapiPath;
  const openApiPath = specifications?.openapiPath;
  const repositoryUrl = repository?.url;

  return (
    <ContextMenu.Root>
      <ContextMenu.Trigger>
        <div className={classNames('w-full rounded-md border flex justify-start  bg-white text-black border-pink-500')}>
          <div
            className={classNames(
              'bg-gradient-to-b from-pink-500 to-pink-700 relative flex items-center w-5 justify-center rounded-l-sm text-red-100-500',
              `border-r-[1px] border-pink-500`
            )}
          >
            <ServerIcon className="w-4 h-4 opacity-90 text-white absolute top-1 " />
            {mode === 'full' && (
              <span className="rotate -rotate-90 w-1/2 text-center absolute bottom-1 text-[9px] text-white font-bold uppercase tracking-[3px] ">
                Service
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
                {mode === 'simple' && <span className="text-[10px] text-gray-500 font-light block pt-0.5 pb-0.5 ">Service</span>}
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
          {asyncApiPath && (
            <ContextMenu.Item asChild>
              <a
                href={buildUrl(`/docs/services/${id}/${version}/asyncapi`)}
                className="text-sm px-2 py-1.5 outline-none cursor-pointer hover:bg-orange-100 rounded-sm flex items-center"
                target="_blank"
                rel="noopener noreferrer"
              >
                View AsyncAPI specification
              </a>
            </ContextMenu.Item>
          )}
          {openApiPath && (
            <ContextMenu.Item asChild>
              <a
                href={buildUrl(`/docs/services/${id}/${version}/spec`)}
                className="text-sm px-2 py-1.5 outline-none cursor-pointer hover:bg-orange-100 rounded-sm flex items-center"
                target="_blank"
                rel="noopener noreferrer"
              >
                View OpenAPI specification
              </a>
            </ContextMenu.Item>
          )}
          {asyncApiPath && openApiPath && <ContextMenu.Separator className="h-[1px] bg-gray-200 m-1" />}
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
