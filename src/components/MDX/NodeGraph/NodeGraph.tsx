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
} from 'reactflow';
import 'reactflow/dist/style.css';
import ServiceNode from './Nodes/Service';
import EventNode from './Nodes/Event';
import QueryNode from './Nodes/Query';
import UserNode from './Nodes/User';
import StepNode from './Nodes/Step';
import CommandNode from './Nodes/Command';
import ExternalSystemNode from './Nodes/ExternalSystem';
import type { CollectionEntry } from 'astro:content';
import { navigate } from 'astro:transitions/client';
import type { CollectionTypes } from '@types';
import DownloadButton from './DownloadButton';
import { buildUrl } from '@utils/url-builder';

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

const getDocUrlForCollection = (collectionItem: CollectionEntry<CollectionTypes>) => {
  return buildUrl(`/docs/${collectionItem.collection}/${collectionItem.data.id}/${collectionItem.data.version}`);
};
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
      queries: QueryNode,
      commands: CommandNode,
      step: StepNode,
      user: UserNode,
      actor: UserNode,
      externalSystem: ExternalSystemNode,
    }),
    []
  );
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);
  const { fitView } = useReactFlow();

  const resetNodesAndEdges = useCallback(() => {
    setNodes((nds) =>
      nds.map((node) => {
        node.style = { ...node.style, opacity: 1 };
        return { ...node, animated: false };
      })
    );
    setEdges((eds) =>
      eds.map((edge) => {
        edge.style = { ...edge.style, opacity: 1 };
        return { ...edge, animated: false };
      })
    );
  }, [setNodes, setEdges]);

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
          return { ...edge, style: { ...edge.style, opacity: 1 }, animated: true };
        }
        return { ...edge, style: { ...edge.style, opacity: 0.1 }, animated: false };
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

  const handlePaneClick = useCallback(() => {
    resetNodesAndEdges();
    fitView({ duration: 800 });
  }, [resetNodesAndEdges, fitView]);

  return (
    <ReactFlow
      nodeTypes={nodeTypes}
      nodes={nodes}
      edges={edges}
      fitView
      onNodesChange={onNodesChange}
      onEdgesChange={onEdgesChange}
      connectionLineType={ConnectionLineType.SmoothStep}
      nodeOrigin={[0.1, 0.1]}
      onNodeClick={handleNodeClick}
      onPaneClick={handlePaneClick}
    >
      {title && (
        <Panel position="top-right">
          <span className="block shadow-sm bg-white text-xl z-10 text-black px-4 py-2 border-gray-200 rounded-md border">
            <strong>Visualiser</strong> | {title}
          </span>
        </Panel>
      )}
      <DownloadButton filename={title} addPadding={!!title} />
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

  useEffect(() => {
    // @ts-ignore
    setElem(document.getElementById(`${id}-portal`));
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

          <div className="flex justify-between">
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
        </ReactFlowProvider>,
        elem
      )}
    </div>
  );
};

export default NodeGraph;
