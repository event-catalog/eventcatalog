import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import ReactFlow, { Background, ConnectionLineType, Controls, Panel, ReactFlowProvider, type Edge, type Node } from 'reactflow';
import 'reactflow/dist/style.css';
import ServiceNode from './Nodes/Service';
import EventNode from './Nodes/Event';
import CommandNode from './Nodes/Command';
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
}

const getDocUrlForCollection = (collectionItem: CollectionEntry<CollectionTypes>) => {
  return buildUrl(`/docs/${collectionItem.collection}/${collectionItem.data.id}/${collectionItem.data.version}`);
};
const getVisualiserUrlForCollection = (collectionItem: CollectionEntry<CollectionTypes>) => {
  return buildUrl(`/visualiser/${collectionItem.collection}/${collectionItem.data.id}/${collectionItem.data.version}`);
};

// const NodeGraphBuilder = ({ title, subtitle, includeBackground = true, includeControls = true }: Props) => {
const NodeGraphBuilder = ({ nodes, edges, title, includeBackground = true, linkTo = 'docs' }: Props) => {
  // const { fitView, viewportInitialized } = useReactFlow();

  // const nodeTypes = useMemo(() => ({ service: ServiceNode, event: EventNode, command: CommandNode }), []);
  const nodeTypes = useMemo(() => ({ services: ServiceNode, events: EventNode, commands: CommandNode }), []);
  const nodeOrigin = [0.5, 0.5];

  const handleNodeClick = (_: any, node: Node) => {
    if (node.type === 'events' || node.type === 'commands') {
      // return (window.location.href = linkTo === 'docs' ? getDocUrlForCollection(node.data.message) : getVisualiserUrlForCollection(node.data.message));
      navigate(linkTo === 'docs' ? getDocUrlForCollection(node.data.message) : getVisualiserUrlForCollection(node.data.message));
    }
    if (node.type === 'services') {
      navigate(linkTo === 'docs' ? getDocUrlForCollection(node.data.service) : getVisualiserUrlForCollection(node.data.service));
      // return (window.location.href = linkTo === 'docs' ? getDocUrlForCollection(node.data.service) : getVisualiserUrlForCollection(node.data.service));
    }
  };

  return (
    // @ts-ignore
    <ReactFlow
      nodeTypes={nodeTypes}
      nodes={nodes}
      edges={edges}
      fitView
      nodesDraggable
      connectionLineType={ConnectionLineType.SmoothStep}
      // @ts-ignore
      nodeOrigin={nodeOrigin}
      onNodeClick={handleNodeClick}
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
      <Panel position="bottom-right">
        <div className=" bg-white font-light px-4 text-[14px] shadow-md py-1 rounded-md">
          <span className="font-bold">Key</span>
          <ul>
            <li className="flex space-x-2 items-center text-[12px]">
              <span className="w-2 h-2 bg-orange-500 block" />
              <span className="block">Event</span>
            </li>
            <li className="flex space-x-2 items-center text-[12px]">
              <span className="w-2 h-2 bg-pink-500 block" />
              <span className="block">Service</span>
            </li>
            <li className="flex space-x-2 items-center text-[12px]">
              <span className="w-2 h-2 bg-blue-500 block" />
              <span className="block">Command</span>
            </li>
          </ul>
        </div>
      </Panel>
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
}

const NodeGraph = ({ id, nodes, edges, title, href, linkTo = 'docs', hrefLabel = 'Open in visualiser' }: NodeGraphProps) => {
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
          <NodeGraphBuilder edges={edges} nodes={nodes} title={title} linkTo={linkTo} />

          {href && (
            <div className="py-2 w-full text-right">
              <a className=" text-sm no-underline py-2 text-gray-800 hover:text-purple-500" href={href}>
                {hrefLabel} &rarr;
              </a>
            </div>
          )}
        </ReactFlowProvider>,
        elem
      )}
    </div>
  );
};

export default NodeGraph;
