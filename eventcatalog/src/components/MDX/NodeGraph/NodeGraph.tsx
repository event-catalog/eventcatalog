import { useEffect, useMemo, useState, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import {
  ReactFlow,
  Background,
  ConnectionLineType,
  Controls,
  Panel,
  ReactFlowProvider,
  useNodesState,
  useEdgesState,
  type Edge,
  type Node,
  useReactFlow,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { HistoryIcon } from 'lucide-react';
// Nodes and edges
import ServiceNode from './Nodes/Service';
import FlowNode from './Nodes/Flow';
import EventNode from './Nodes/Event';
import QueryNode from './Nodes/Query';
import UserNode from './Nodes/User';
import StepNode from './Nodes/Step';
import CommandNode from './Nodes/Command';
import ExternalSystemNode from './Nodes/ExternalSystem';
import AnimatedMessageEdge from './Edges/AnimatedMessageEdge';
import FlowEdge from './Edges/FlowEdge';
import CustomNode from './Nodes/Custom';

import type { CollectionEntry } from 'astro:content';
import { navigate } from 'astro:transitions/client';
import type { CollectionTypes } from '@types';
import DownloadButton from './DownloadButton';
import { buildUrl } from '@utils/url-builder';
import ChannelNode from './Nodes/Channel';
import { CogIcon } from '@heroicons/react/20/solid';
import { useEventCatalogVisualiser } from 'src/hooks/eventcatalog-visualizer';
interface Props {
  nodes: any;
  edges: any;
  title?: string;
  subtitle?: string;
  includeBackground?: boolean;
  includeControls?: boolean;
  linkTo: 'docs' | 'visualiser';
  includeKey?: boolean;
  linksToVisualiser?: boolean;
  links?: { label: string; url: string }[];
}

const getVisualiserUrlForCollection = (collectionItem: CollectionEntry<CollectionTypes>) => {
  return buildUrl(`/visualiser/${collectionItem.collection}/${collectionItem.data.id}/${collectionItem.data.version}`);
};

const NodeGraphBuilder = ({
  nodes: initialNodes,
  edges: initialEdges,
  title,
  includeBackground = true,
  linkTo = 'docs',
  includeKey = true,
  linksToVisualiser = false,
  links = [],
}: Props) => {
  const nodeTypes = useMemo(
    () => ({
      services: ServiceNode,
      flows: FlowNode,
      events: EventNode,
      channels: ChannelNode,
      queries: QueryNode,
      commands: CommandNode,
      step: StepNode,
      user: UserNode,
      actor: UserNode,
      custom: CustomNode,
      externalSystem: ExternalSystemNode,
    }),
    []
  );
  const edgeTypes = useMemo(
    () => ({
      animated: AnimatedMessageEdge,
      'flow-edge': FlowEdge,
    }),
    []
  );
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isAnimated, setIsAnimated] = useState(false);
  const [animateMessages, setAnimateMessages] = useState(false);
  const { hideChannels, toggleChannelsVisibility } = useEventCatalogVisualiser({ nodes, edges, setNodes, setEdges });
  const { fitView } = useReactFlow();

  const resetNodesAndEdges = useCallback(() => {
    setNodes((nds) =>
      nds.map((node) => {
        node.style = { ...node.style, opacity: 1 };
        return { ...node, animated: animateMessages };
      })
    );
    setEdges((eds) =>
      eds.map((edge) => {
        edge.style = { ...edge.style, opacity: 1 };
        edge.labelStyle = { ...edge.labelStyle, opacity: 1 };
        return { ...edge, data: { ...edge.data, opacity: 1, animated: animateMessages }, animated: animateMessages };
      })
    );
  }, [setNodes, setEdges, animateMessages]);

  const handleNodeClick = useCallback(
    (_: any, node: Node) => {
      if (linksToVisualiser) {
        if (node.type === 'events' || node.type === 'commands') {
          navigate(getVisualiserUrlForCollection(node.data.message as CollectionEntry<CollectionTypes>));
        }
        if (node.type === 'services') {
          navigate(getVisualiserUrlForCollection(node.data.service as CollectionEntry<'services'>));
        }
        return;
      }

      resetNodesAndEdges();

      const connectedNodeIds = new Set<string>();
      connectedNodeIds.add(node.id);

      const updatedEdges = edges.map((edge) => {
        if (edge.source === node.id || edge.target === node.id) {
          connectedNodeIds.add(edge.source);
          connectedNodeIds.add(edge.target);
          return {
            ...edge,
            data: { ...edge.data, opacity: 1, animated: animateMessages },
            style: { ...edge.style, opacity: 1 },
            labelStyle: { ...edge.labelStyle, opacity: 1 },
            animated: true,
          };
        }
        return {
          ...edge,
          data: { ...edge.data, opacity: 0.1, animated: animateMessages },
          style: { ...edge.style, opacity: 0.1 },
          labelStyle: { ...edge.labelStyle, opacity: 0.1 },
          animated: animateMessages,
        };
      });

      const updatedNodes = nodes.map((n) => {
        if (connectedNodeIds.has(n.id)) {
          return { ...n, style: { ...n.style, opacity: 1 } };
        }
        return { ...n, style: { ...n.style, opacity: 0.1 } };
      });

      setNodes(updatedNodes);
      setEdges(updatedEdges);

      // Fit the clicked node and its connected nodes into view
      fitView({
        padding: 0.2,
        duration: 800,
        nodes: updatedNodes.filter((n) => connectedNodeIds.has(n.id)),
      });
    },
    [nodes, edges, setNodes, setEdges, resetNodesAndEdges, fitView]
  );

  const toggleAnimateMessages = () => {
    setAnimateMessages(!animateMessages);
    localStorage.setItem('EventCatalog:animateMessages', JSON.stringify(!animateMessages));
  };

  // animate messages, between views
  useEffect(() => {
    const storedAnimateMessages = localStorage.getItem('EventCatalog:animateMessages');
    if (storedAnimateMessages !== null) {
      setAnimateMessages(storedAnimateMessages === 'true');
    }
  }, []);

  useEffect(() => {
    setEdges((eds) =>
      eds.map((edge) => ({
        ...edge,
        animated: animateMessages,
        type: edge.type === 'flow-edge' ? 'flow-edge' : animateMessages ? 'animated' : 'default',
        data: { ...edge.data, animateMessages, animated: animateMessages },
      }))
    );
  }, [animateMessages]);

  useEffect(() => {
    setTimeout(() => {
      fitView({ duration: 800 });
    }, 150);
  }, []);

  const handlePaneClick = useCallback(() => {
    setIsSettingsOpen(false);
    resetNodesAndEdges();
    fitView({ duration: 800 });
  }, [resetNodesAndEdges, fitView]);

  const handleLegendClick = useCallback(
    (collectionType: string, groupId?: string) => {
      const updatedNodes = nodes.map((node: Node<any>) => {
        // Check if the groupId is set first
        if (groupId && node.data.group && node.data.group?.id === groupId) {
          return { ...node, style: { ...node.style, opacity: 1 } };
        } else {
          if (node.type === collectionType) {
            return { ...node, style: { ...node.style, opacity: 1 } };
          }
        }
        return { ...node, style: { ...node.style, opacity: 0.1 } };
      });

      const updatedEdges = edges.map((edge) => {
        return {
          ...edge,
          data: { ...edge.data, opacity: 0.1 },
          style: { ...edge.style, opacity: 0.1 },
          labelStyle: { ...edge.labelStyle, opacity: 0.1 },
          animated: animateMessages,
        };
      });

      setNodes(updatedNodes);
      setEdges(updatedEdges);

      fitView({
        padding: 0.2,
        duration: 800,
        nodes: updatedNodes.filter((node) => node.type === collectionType),
      });
    },
    [nodes, edges, setNodes, setEdges, fitView]
  );

  const getNodesByCollectionWithColors = useCallback((nodes: Node<any>[]) => {
    const colorClasses = {
      events: 'bg-orange-600',
      services: 'bg-pink-600',
      flows: 'bg-teal-600',
      commands: 'bg-blue-600',
      queries: 'bg-green-600',
      channels: 'bg-gray-600',
      externalSystem: 'bg-pink-600',
      actor: 'bg-yellow-500',
      step: 'bg-gray-700',
    };

    let legendForDomains: { [key: string]: { count: number; colorClass: string; groupId: string } } = {};

    // Find any groups
    const domainGroups = [
      ...new Set(
        nodes.filter((node) => node.data.group && node.data.group?.type === 'Domain').map((node) => node.data.group?.id)
      ),
    ];

    domainGroups.forEach((groupId) => {
      const group = nodes.filter((node) => node.data.group && node.data.group?.id === groupId);
      legendForDomains[`${groupId} (Domain)`] = { count: group.length, colorClass: 'bg-yellow-600', groupId };
    });

    const legendForNodes = nodes.reduce(
      (acc: { [key: string]: { count: number; colorClass: string; groupId?: string } }, node) => {
        const collection = node.type;
        if (collection) {
          if (acc[collection]) {
            acc[collection].count += 1;
          } else {
            acc[collection] = { count: 1, colorClass: colorClasses[collection as keyof typeof colorClasses] || 'bg-black' };
          }
        }
        return acc;
      },
      {}
    );

    return { ...legendForDomains, ...legendForNodes };
  }, []);

  const legend = getNodesByCollectionWithColors(nodes);

  return (
    <ReactFlow
      nodeTypes={nodeTypes}
      edgeTypes={edgeTypes}
      minZoom={0.07}
      nodes={nodes}
      edges={edges}
      fitView
      onNodesChange={onNodesChange}
      onEdgesChange={onEdgesChange}
      connectionLineType={ConnectionLineType.SmoothStep}
      nodeOrigin={[0.1, 0.1]}
      onNodeClick={handleNodeClick}
      onPaneClick={handlePaneClick}
      className="relative"
    >
      <Panel position="top-center" className="w-full pr-6 ">
        <div className="flex space-x-2 justify-between  items-center">
          <div>
            <button
              onClick={() => setIsSettingsOpen(!isSettingsOpen)}
              className="py-2.5 px-3 bg-white rounded-md shadow-md hover:bg-purple-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500"
              aria-label="Open settings"
            >
              <CogIcon className="h-5 w-5 text-gray-600" />
            </button>
          </div>
          {title && (
            <span className="block shadow-sm bg-white text-xl z-10 text-black px-4 py-2 border-gray-200 rounded-md border opacity-80">
              {title}
            </span>
          )}
          <div className="flex justify-end space-x-2">
            <DownloadButton filename={title} addPadding={false} />
            {/* // Dropdown for links */}
            {links.length > 0 && (
              <div className="relative flex items-center -mt-1">
                <span className="absolute left-2 pointer-events-none flex items-center h-full">
                  <HistoryIcon className="h-4 w-4 text-gray-600" />
                </span>
                <select
                  value={links.find((link) => window.location.href.includes(link.url))?.url || links[0].url}
                  onChange={(e) => navigate(e.target.value)}
                  className="appearance-none pl-7 pr-6 py-0 text-[14px] bg-white rounded-md border border-gray-200 hover:bg-gray-100/50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500"
                  style={{ minWidth: 120, height: '26px' }}
                >
                  {links.map((link) => (
                    <option key={link.url} value={link.url}>
                      {link.label}
                    </option>
                  ))}
                </select>
                <span className="absolute right-2 pointer-events-none">
                  <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                  </svg>
                </span>
              </div>
            )}
          </div>
        </div>
      </Panel>

      {isSettingsOpen && (
        <div className="absolute top-[68px] left-5 w-72 p-4 bg-white rounded-lg shadow-lg z-30 border border-gray-200">
          <h3 className="text-lg font-semibold mb-4">Visualizer Settings</h3>
          <div className="space-y-4 ">
            <div>
              <div className="flex items-center justify-between">
                <label htmlFor="message-animation-toggle" className="text-sm font-medium text-gray-700">
                  Simulate Messages
                </label>
                <button
                  id="message-animation-toggle"
                  onClick={toggleAnimateMessages}
                  className={`${
                    animateMessages ? 'bg-purple-600' : 'bg-gray-200'
                  } relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2`}
                >
                  <span
                    className={`${
                      animateMessages ? 'translate-x-6' : 'translate-x-1'
                    } inline-block h-4 w-4 transform rounded-full bg-white transition-transform`}
                  />
                </button>
              </div>
              <p className="text-[10px] text-gray-500">Animate events, queries and commands.</p>
            </div>
            <div>
              <div className="flex items-center justify-between">
                <label htmlFor="message-animation-toggle" className="text-sm font-medium text-gray-700">
                  Hide Channels
                </label>
                <button
                  id="message-animation-toggle"
                  onClick={toggleChannelsVisibility}
                  className={`${
                    hideChannels ? 'bg-purple-600' : 'bg-gray-200'
                  } relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2`}
                >
                  <span
                    className={`${
                      hideChannels ? 'translate-x-6' : 'translate-x-1'
                    } inline-block h-4 w-4 transform rounded-full bg-white transition-transform`}
                  />
                </button>
              </div>
              <p className="text-[10px] text-gray-500">Show or hide channels in the visualizer.</p>
            </div>
          </div>
        </div>
      )}
      {includeBackground && <Background color="#bbb" gap={16} />}
      {includeBackground && <Controls />}
      {includeKey && (
        <Panel position="bottom-right">
          <div className=" bg-white font-light px-4 text-[12px] shadow-md py-1 rounded-md">
            <ul className="m-0 p-0 ">
              {Object.entries(legend).map(([key, { count, colorClass, groupId }]) => (
                <li
                  key={key}
                  className="flex space-x-2 items-center text-[10px] cursor-pointer hover:text-purple-600 hover:underline"
                  onClick={() => handleLegendClick(key, groupId)}
                >
                  <span className={`w-2 h-2 block ${colorClass}`} />
                  <span className="block capitalize">
                    {key} ({count})
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </Panel>
      )}
    </ReactFlow>
  );
};

interface NodeGraphProps {
  id: string;
  title?: string;
  href?: string;
  hrefLabel?: string;
  nodes: Node[];
  edges: Edge[];
  linkTo: 'docs' | 'visualiser';
  includeKey?: boolean;
  footerLabel?: string;
  linksToVisualiser?: boolean;
  links?: { label: string; url: string }[];
}

const NodeGraph = ({
  id,
  nodes,
  edges,
  title,
  href,
  linkTo = 'docs',
  hrefLabel = 'Open in visualizer',
  includeKey = true,
  footerLabel,
  linksToVisualiser = false,
  links = [],
}: NodeGraphProps) => {
  const [elem, setElem] = useState(null);
  const [showFooter, setShowFooter] = useState(true);

  useEffect(() => {
    // @ts-ignore
    setElem(document.getElementById(`${id}-portal`));
  }, []);

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const embed = urlParams.get('embed');
    if (embed === 'true') {
      setShowFooter(false);
    }
  }, []);

  if (!elem) return null;

  return (
    <div>
      {createPortal(
        <ReactFlowProvider>
          <NodeGraphBuilder
            edges={edges}
            nodes={nodes}
            title={title}
            linkTo={linkTo}
            includeKey={includeKey}
            linksToVisualiser={linksToVisualiser}
            links={links}
          />

          {showFooter && (
            <div className="flex justify-between" id="visualiser-footer">
              {footerLabel && (
                <div className="py-2 w-full text-left ">
                  <span className=" text-sm no-underline py-2 text-gray-500">{footerLabel}</span>
                </div>
              )}

              {href && (
                <div className="py-2 w-full text-right flex justify-between">
                  <span className="text-sm text-gray-500 italic">Right click a node to access documentation</span>
                  <a className=" text-sm underline text-gray-800 hover:text-primary" href={href}>
                    {hrefLabel} &rarr;
                  </a>
                </div>
              )}
            </div>
          )}
        </ReactFlowProvider>,
        elem
      )}
    </div>
  );
};

export default NodeGraph;
