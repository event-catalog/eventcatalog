import type { CollectionEntry } from 'astro:content';
import { Handle, useReactFlow, useOnSelectionChange, Position } from '@xyflow/react';
import * as ContextMenu from '@radix-ui/react-context-menu';
import { buildUrl } from '@utils/url-builder';
import { getIcon } from '@utils/badges';
import { useState } from 'react';

interface Data {
  mode: 'simple' | 'full';
  domain: CollectionEntry<'domains'>;
}

export default function DomainNode({ data, id: nodeId }: any) {
  const { mode, domain } = data as Data;
  const reactFlow = useReactFlow();
  const [highlightedServices, setHighlightedServices] = useState<Set<string>>(new Set());

  const { id, version, name, services = [], styles } = domain.data;
  const { icon = 'RectangleGroupIcon' } = styles || {};

  const Icon = getIcon(icon);
  const ServerIcon = getIcon('ServerIcon');

  // Listen for selection changes to highlight connected services
  useOnSelectionChange({
    onChange: ({ nodes: selectedNodes }) => {
      if (selectedNodes.length === 0) {
        setHighlightedServices(new Set());
        return;
      }

      const selectedNode = selectedNodes[0];
      if (!selectedNode) {
        setHighlightedServices(new Set());
        return;
      }

      // Get all edges
      const edges = reactFlow.getEdges();
      const connectedServiceIds = new Set<string>();

      // Find services connected to the selected node
      edges.forEach((edge) => {
        if (edge.source === selectedNode.id || edge.target === selectedNode.id) {
          // Check if this edge connects to our domain
          if (edge.source === nodeId && edge.sourceHandle) {
            // Extract service ID from sourceHandle (format: "serviceId-source")
            const serviceId = edge.sourceHandle.replace('-source', '');
            connectedServiceIds.add(serviceId);
          }
          if (edge.target === nodeId && edge.targetHandle) {
            // Extract service ID from targetHandle (format: "serviceId-target")
            const serviceId = edge.targetHandle.replace('-target', '');
            connectedServiceIds.add(serviceId);
          }
        }
      });

      setHighlightedServices(connectedServiceIds);
    },
  });

  return (
    <ContextMenu.Root>
      <ContextMenu.Trigger>
        <div className="w-full rounded-lg border-2 border-yellow-400 bg-white shadow-lg">
          <div className="bg-yellow-100 px-3 py-2 flex items-center space-x-2">
            {Icon && <Icon className="w-4 h-4 text-yellow-700" />}
            <div>
              <span className="text-sm font-bold text-yellow-900">{name}</span>
              <span className="text-xs text-yellow-700 ml-2">v{version}</span>
            </div>
          </div>
          {mode === 'full' && services.length > 0 && (
            <div>
              {services.map((service: any, index: number) => {
                const isHighlighted = highlightedServices.has(service.data.id);

                return (
                  <ContextMenu.Root key={`${service.data.id}-${index}`}>
                    <ContextMenu.Trigger asChild>
                      <div
                        className={`relative flex items-center justify-between px-3 py-2 cursor-pointer ${index !== services.length - 1 ? 'border-b border-gray-300' : ''} ${isHighlighted ? 'bg-pink-100 border-pink-300' : ''}`}
                      >
                        <Handle
                          type="target"
                          position={Position.Left}
                          id={`${service.data.id}-target`}
                          className="!left-[-1px] !w-2 !h-2 !bg-gray-400 !border !border-gray-500 !rounded-full !z-10"
                          style={{ left: '-1px' }}
                        />
                        <Handle
                          type="source"
                          position={Position.Right}
                          id={`${service.data.id}-source`}
                          className="!right-[-1px] !w-2 !h-2 !bg-gray-400 !border !border-gray-500 !rounded-full !z-10"
                          style={{ right: '-1px' }}
                        />
                        <div className="flex items-center space-x-3">
                          <div className="flex items-center justify-center w-5 h-5 bg-pink-500 rounded">
                            {ServerIcon && <ServerIcon className="w-3 h-3 text-white" />}
                          </div>
                          <span className="text-sm font-medium text-gray-900">{service.data.name || service.data.id}</span>
                        </div>
                        <div className="flex items-center space-x-4 text-sm text-gray-600">
                          <span className="text-xs">v{service.data.version}</span>
                        </div>
                      </div>
                    </ContextMenu.Trigger>
                    <ContextMenu.Portal>
                      <ContextMenu.Content className="min-w-[220px] bg-white rounded-md p-1 shadow-md border border-gray-200">
                        <ContextMenu.Item
                          className="text-sm px-2 py-1.5 outline-none cursor-pointer hover:bg-orange-100 rounded-sm flex items-center"
                          onClick={() =>
                            (window.location.href = buildUrl(`/docs/services/${service.data.id}/${service.data.version}`))
                          }
                        >
                          View Service Documentation
                        </ContextMenu.Item>
                        <ContextMenu.Item
                          className="text-sm px-2 py-1.5 outline-none cursor-pointer hover:bg-orange-100 rounded-sm flex items-center"
                          onClick={() =>
                            (window.location.href = buildUrl(`/visualiser/services/${service.data.id}/${service.data.version}`))
                          }
                        >
                          View Service Visualizer
                        </ContextMenu.Item>
                      </ContextMenu.Content>
                    </ContextMenu.Portal>
                  </ContextMenu.Root>
                );
              })}
            </div>
          )}
        </div>
      </ContextMenu.Trigger>
      <ContextMenu.Portal>
        <ContextMenu.Content className="min-w-[220px] bg-white rounded-md p-1 shadow-md border border-gray-200">
          <ContextMenu.Item
            className="text-sm px-2 py-1.5 outline-none cursor-pointer hover:bg-orange-100 rounded-sm flex items-center"
            onClick={() => (window.location.href = buildUrl(`/docs/domains/${id}/${version}`))}
          >
            View Domain Documentation
          </ContextMenu.Item>
          <ContextMenu.Item
            className="text-sm px-2 py-1.5 outline-none cursor-pointer hover:bg-orange-100 rounded-sm flex items-center"
            onClick={() => (window.location.href = buildUrl(`/visualiser/domains/${id}/${version}`))}
          >
            View Domain Visualizer
          </ContextMenu.Item>
        </ContextMenu.Content>
      </ContextMenu.Portal>
    </ContextMenu.Root>
  );
}
