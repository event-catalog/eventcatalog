import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import ReactFlow, {
  Background,
  ConnectionLineType,
  Controls,
  Panel,
  ReactFlowProvider,
  useNodesState,
  type Edge,
  type Node,
} from 'reactflow';
import 'reactflow/dist/style.css';
import ServiceNode from './Nodes/Service';
import EventNode from './Nodes/Event';
import UserNode from './Nodes/User';
import StepNode from './Nodes/Step';
import CommandNode from './Nodes/Command';
import ExternalSystemNode from './Nodes/ExternalSystem';
import type { CollectionEntry } from 'astro:content';
import { navigate } from 'astro:transitions/client';
import type { CollectionTypes } from '@types';
import DownloadButton from './DownloadButton';
import { buildUrl } from '@utils/url-builder-client';

interface Props {
  nodes: any;
  edges: any;
  title?: string;
  subtitle?: string;
  includeBackground?: boolean;
  includeControls?: boolean;
  linkTo: 'docs' | 'visualiser';
  includeKey?: boolean;
  urlHasTrailingSlash?: boolean;
}

const getDocUrlForCollection = (collectionItem: CollectionEntry<CollectionTypes>, trailingSlash?: boolean) => {
  return buildUrl(`/docs/${collectionItem.collection}/${collectionItem.data.id}/${collectionItem.data.version}`, trailingSlash);
};
const getVisualiserUrlForCollection = (collectionItem: CollectionEntry<CollectionTypes>, trailingSlash?: boolean) => {
  return buildUrl(
    `/visualiser/${collectionItem.collection}/${collectionItem.data.id}/${collectionItem.data.version}`,
    trailingSlash
  );
};

// const NodeGraphBuilder = ({ title, subtitle, includeBackground = true, includeControls = true }: Props) => {
const NodeGraphBuilder = ({
  nodes: initialNodes,
  edges,
  title,
  includeBackground = true,
  linkTo = 'docs',
  includeKey = true,
  urlHasTrailingSlash,
}: Props) => {
  const nodeTypes = useMemo(
    () => ({
      services: ServiceNode,
      events: EventNode,
      commands: CommandNode,
      step: StepNode,
      user: UserNode,
      actor: UserNode,
      externalSystem: ExternalSystemNode,
    }),
    []
  );
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const nodeOrigin = [0.5, 0.5];

  const handleNodeClick = (_: any, node: Node) => {
    if (node.type === 'events' || node.type === 'commands') {
      navigate(
        linkTo === 'docs'
          ? getDocUrlForCollection(node.data.message, urlHasTrailingSlash)
          : getVisualiserUrlForCollection(node.data.message, urlHasTrailingSlash)
      );
    }
    if (node.type === 'services') {
      navigate(
        linkTo === 'docs'
          ? getDocUrlForCollection(node.data.service, urlHasTrailingSlash)
          : getVisualiserUrlForCollection(node.data.service, urlHasTrailingSlash)
      );
    }
  };

  return (
    // @ts-ignore
    <ReactFlow
      nodeTypes={nodeTypes}
      nodes={nodes}
      edges={edges}
      fitView
      onNodesChange={onNodesChange}
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
      {includeKey && (
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
  urlHasTrailingSlash?: boolean;
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
  urlHasTrailingSlash,
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
            urlHasTrailingSlash={urlHasTrailingSlash}
          />

          <div className="flex justify-between">
            {footerLabel && (
              <div className="py-2 w-full text-left ">
                <span className=" text-sm no-underline py-2 text-gray-300">{footerLabel}</span>
              </div>
            )}

            {href && (
              <div className="py-2 w-full text-right">
                <a className=" text-sm no-underline py-2 text-gray-800 hover:text-purple-500" href={href}>
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
