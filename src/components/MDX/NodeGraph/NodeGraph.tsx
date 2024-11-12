import { useEffect, useMemo, useState, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import ReactFlow, {
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
  getBezierPath,
  BaseEdge,
  SmoothStepEdge,
} from 'reactflow';
import 'reactflow/dist/style.css';

// Nodes and edges
import ServiceNode from './Nodes/Service';
import EventNode from './Nodes/Event';
import QueryNode from './Nodes/Query';
import UserNode from './Nodes/User';
import StepNode from './Nodes/Step';
import CommandNode from './Nodes/Command';
import ExternalSystemNode from './Nodes/ExternalSystem';
import AnimatedMessageEdge from './Edges/AnimatedMessageEdge';

import type { CollectionEntry } from 'astro:content';
import { navigate } from 'astro:transitions/client';
import type { CollectionTypes } from '@types';
import DownloadButton from './DownloadButton';
import { buildUrl } from '@utils/url-builder';
import ChannelNode from './Nodes/Channel';
import { CogIcon } from '@heroicons/react/20/solid';

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
}: Props) => {
  const nodeTypes = useMemo(
    () => ({
      services: ServiceNode,
      events: EventNode,
      channels: ChannelNode,
      queries: QueryNode,
      commands: CommandNode,
      step: StepNode,
      user: UserNode,
      actor: UserNode,
      externalSystem: ExternalSystemNode,
    }),
    []
  );
  const edgeTypes = useMemo(
    () => ({
      animated: AnimatedMessageEdge,
    }),
    []
  );
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isAnimated, setIsAnimated] = useState(false);
  const [animateMessages, setAnimateMessages] = useState(false);

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
        return { ...edge, data: { ...edge.data, opacity: 1 }, animated: animateMessages };
      })
    );
  }, [setNodes, setEdges, animateMessages]);

  const handleNodeClick = useCallback(
    (_: any, node: Node) => {
      if (linksToVisualiser) {
        if (node.type === 'events' || node.type === 'commands') {
          navigate(getVisualiserUrlForCollection(node.data.message));
        }
        if (node.type === 'services') {
          navigate(getVisualiserUrlForCollection(node.data.service));
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
            data: { ...edge.data, opacity: 1 },
            style: { ...edge.style, opacity: 1 },
            labelStyle: { ...edge.labelStyle, opacity: 1 },
            animated: true,
          };
        }
        return {
          ...edge,
          data: { ...edge.data, opacity: 0.1 },
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

  const toggleAnimation = () => {
    setIsAnimated(!isAnimated);
    setEdges((eds) =>
      eds.map((edge) => ({
        ...edge,
        animated: !isAnimated,
      }))
    );
  };

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
        type: animateMessages ? 'animated' : 'default',
        data: { ...edge.data, animateMessages },
      }))
    );
  }, [animateMessages]);

  const handlePaneClick = useCallback(() => {
    setIsSettingsOpen(false);
    resetNodesAndEdges();
    fitView({ duration: 800 });
  }, [resetNodesAndEdges, fitView]);

  return (
    <ReactFlow
      nodeTypes={nodeTypes}
      edgeTypes={edgeTypes}
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
            <span className="block shadow-sm bg-white text-xl z-10 text-black px-4 py-2 border-gray-200 rounded-md border">
              <strong>Visualiser</strong> | {title}
            </span>
          )}
        </div>
        <div className="flex justify-end py-4">
          <DownloadButton filename={title} addPadding={false} />
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
          </div>
        </div>
      )}
      {includeBackground && <Background color="#bbb" gap={16} />}
      {includeBackground && <Controls />}
      {includeKey && (
        <Panel position="bottom-right">
          <div className=" bg-white font-light px-4 text-[12px] shadow-md py-1 rounded-md">
            {/* <span className="font-bold">Key</span> */}
            <ul className="m-0 p-0">
              <li className="flex space-x-2 items-center text-[10px]">
                <span className="w-2 h-2 bg-orange-500 block" />
                <span className="block">Event</span>
              </li>
              <li className="flex space-x-2 items-center text-[10px]">
                <span className="w-2 h-2 bg-pink-500 block" />
                <span className="block">Service</span>
              </li>
              <li className="flex space-x-2 items-center text-[10px]">
                <span className="w-2 h-2 bg-blue-500 block" />
                <span className="block">Command</span>
              </li>
              <li className="flex space-x-2 items-center text-[10px]">
                <span className="w-2 h-2 bg-green-500 block" />
                <span className="block">Query</span>
              </li>
              <li className="flex space-x-2 items-center text-[10px]">
                <span className="w-2 h-2 bg-gray-500 block" />
                <span className="block">Channel</span>
              </li>
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
          />

          {showFooter && (
            <div className="flex justify-between" id="visualiser-footer">
              {footerLabel && (
                <div className="py-2 w-full text-left ">
                  <span className=" text-sm no-underline py-2 text-gray-300">{footerLabel}</span>
                </div>
              )}

              {href && (
                <div className="py-2 w-full text-right">
                  <a className=" text-sm no-underline py-2 text-gray-800 hover:text-primary" href={href}>
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
