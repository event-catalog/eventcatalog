import React, { useMemo, useCallback, useEffect, useState, useRef } from 'react';
import {
  ReactFlow,
  Background,
  Controls,
  useReactFlow,
  useNodesState,
  useEdgesState,
  type Node,
  type Edge,
  type NodeTypes,
  type EdgeTypes,
} from '@xyflow/react';
import { getConnectedNodes, getNodeDisplayInfo } from './utils';
import FocusModeNodeActions from './FocusModeNodeActions';
import FocusModePlaceholder from './FocusModePlaceholder';

interface FocusModeContentProps {
  centerNodeId: string;
  nodes: Node[];
  edges: Edge[];
  nodeTypes: NodeTypes;
  edgeTypes: EdgeTypes;
  onSwitchCenter: (newCenterNodeId: string, direction: 'left' | 'right') => void;
}

const HORIZONTAL_SPACING = 450;
const VERTICAL_SPACING = 200;
const SLIDE_DURATION = 300;

const FocusModeContent: React.FC<FocusModeContentProps> = ({
  centerNodeId,
  nodes: allNodes,
  edges: allEdges,
  nodeTypes,
  edgeTypes,
  onSwitchCenter,
}) => {
  const { fitView } = useReactFlow();
  const [isAnimating, setIsAnimating] = useState(false);
  const [needsFitView, setNeedsFitView] = useState(false);
  const [hoveredEdgeId, setHoveredEdgeId] = useState<string | null>(null);
  const reactFlowInitialized = useRef(false);
  const animationTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (animationTimeoutRef.current) {
        clearTimeout(animationTimeoutRef.current);
      }
    };
  }, []);

  // Calculate focused nodes and edges with positions
  const calculateFocusedGraph = useCallback(
    (centerId: string) => {
      const centerNode = allNodes.find((n) => n.id === centerId);
      if (!centerNode) {
        return { nodes: [], edges: [] };
      }

      const { leftNodes, rightNodes } = getConnectedNodes(centerId, allNodes, allEdges);
      const centerNodeInfo = getNodeDisplayInfo(centerNode);
      const positionedNodes: Node[] = [];

      // Center node at origin
      positionedNodes.push({
        ...centerNode,
        position: { x: 0, y: 0 },
        style: { ...centerNode.style, opacity: 1 },
        data: { ...centerNode.data, isFocusCenter: true },
      });

      // Left nodes (incoming)
      leftNodes.forEach((node, index) => {
        const yOffset = (index - (leftNodes.length - 1) / 2) * VERTICAL_SPACING;
        positionedNodes.push({
          ...node,
          position: { x: -HORIZONTAL_SPACING, y: yOffset },
          style: { ...node.style, opacity: 1 },
        });
      });

      // Right nodes (outgoing)
      rightNodes.forEach((node, index) => {
        const yOffset = (index - (rightNodes.length - 1) / 2) * VERTICAL_SPACING;
        positionedNodes.push({
          ...node,
          position: { x: HORIZONTAL_SPACING, y: yOffset },
          style: { ...node.style, opacity: 1 },
        });
      });

      // Add placeholder nodes if no connections exist
      if (leftNodes.length === 0) {
        positionedNodes.push({
          id: '__placeholder-left__',
          type: 'placeholder',
          position: { x: -HORIZONTAL_SPACING, y: 0 },
          data: { label: `No inputs found for "${centerNodeInfo.name}" in this diagram`, side: 'left' },
          draggable: false,
          selectable: false,
        } as Node);
      }

      if (rightNodes.length === 0) {
        positionedNodes.push({
          id: '__placeholder-right__',
          type: 'placeholder',
          position: { x: HORIZONTAL_SPACING, y: 0 },
          data: { label: `No outputs found for "${centerNodeInfo.name}" in this diagram`, side: 'right' },
          draggable: false,
          selectable: false,
        } as Node);
      }

      // Filter edges - only show edges connected to center node
      const focusedNodeIds = new Set(positionedNodes.map((n) => n.id));
      const filteredEdges = allEdges
        .filter((edge) => {
          // Only include edges where center node is either source or target
          const connectsToCenter = edge.source === centerId || edge.target === centerId;
          // And the other end is in our focused nodes
          const otherEndInFocus = focusedNodeIds.has(edge.source) && focusedNodeIds.has(edge.target);
          return connectsToCenter && otherEndInFocus;
        })
        .map((edge) => ({
          ...edge,
          style: { ...edge.style, opacity: 1 },
          labelStyle: { ...edge.labelStyle, opacity: 1 },
          data: { ...edge.data, opacity: 1, animated: false },
          animated: false,
        }));

      return { nodes: positionedNodes, edges: filteredEdges };
    },
    [allNodes, allEdges]
  );

  // Initial graph
  const initialGraph = useMemo(() => calculateFocusedGraph(centerNodeId), [centerNodeId, calculateFocusedGraph]);

  const [displayNodes, setDisplayNodes] = useNodesState(initialGraph.nodes);
  const [displayEdges, setDisplayEdges] = useEdgesState(initialGraph.edges);

  // Update when centerNodeId changes externally
  useEffect(() => {
    const { nodes, edges } = calculateFocusedGraph(centerNodeId);
    setDisplayNodes(nodes);
    setDisplayEdges(edges);
    setNeedsFitView(true);
  }, [centerNodeId, calculateFocusedGraph, setDisplayNodes, setDisplayEdges]);

  // FitView when needed - triggered after nodes are updated
  useEffect(() => {
    if (needsFitView && reactFlowInitialized.current) {
      // Wait for nodes to be fully rendered, then fit view with animation
      const timer = setTimeout(() => {
        fitView({ padding: 0.2, duration: 400 });
        setNeedsFitView(false);
      }, 150);
      return () => clearTimeout(timer);
    }
  }, [needsFitView, displayNodes, fitView]);

  // Handle ReactFlow initialization
  const handleInit = useCallback(() => {
    reactFlowInitialized.current = true;
    // Wait for nodes to be fully rendered, then fit view with animation
    setTimeout(() => {
      fitView({ padding: 0.2, duration: 400 });
    }, 150);
  }, [fitView]);

  // Handle switching to a new center node with animation
  const handleSwitchNode = useCallback(
    (nodeId: string, direction: 'left' | 'right') => {
      if (nodeId === centerNodeId || isAnimating) return;

      setIsAnimating(true);

      // Animate: clicked node slides to center, current center hides
      setDisplayNodes((currentNodes) =>
        currentNodes.map((node) => {
          if (node.id === nodeId) {
            // Clicked node slides to center
            return {
              ...node,
              position: { x: 0, y: 0 },
              style: { ...node.style, transition: `all ${SLIDE_DURATION}ms ease-out` },
            };
          }
          if (node.id === centerNodeId) {
            // Current center node hides
            return {
              ...node,
              style: { ...node.style, opacity: 0, transition: `opacity ${SLIDE_DURATION}ms ease-out` },
            };
          }
          return node;
        })
      );

      // After slide completes, switch to new center
      animationTimeoutRef.current = setTimeout(() => {
        onSwitchCenter(nodeId, direction);
        setIsAnimating(false);
      }, SLIDE_DURATION);
    },
    [centerNodeId, isAnimating, setDisplayNodes, onSwitchCenter]
  );

  // Handle node click with animation
  const handleNodeClick = useCallback(
    (_: React.MouseEvent, clickedNode: Node) => {
      if (clickedNode.id === centerNodeId || isAnimating) return;
      const direction = (clickedNode.position?.x ?? 0) < 0 ? 'left' : 'right';
      handleSwitchNode(clickedNode.id, direction);
    },
    [centerNodeId, isAnimating, handleSwitchNode]
  );

  // Handle edge hover for animation
  const handleEdgeMouseEnter = useCallback((_: React.MouseEvent, edge: Edge) => {
    setHoveredEdgeId(edge.id);
  }, []);

  const handleEdgeMouseLeave = useCallback(() => {
    setHoveredEdgeId(null);
  }, []);

  // Apply hover animation to edges - use ReactFlow's built-in animated property
  const edgesWithHover = useMemo(() => {
    return displayEdges.map((edge) => {
      if (edge.id === hoveredEdgeId) {
        return {
          ...edge,
          animated: true,
        };
      }
      return edge;
    });
  }, [displayEdges, hoveredEdgeId]);

  // Merge nodeTypes with placeholder
  const mergedNodeTypes = useMemo(
    () => ({
      ...nodeTypes,
      placeholder: FocusModePlaceholder,
    }),
    [nodeTypes]
  );

  if (displayNodes.length === 0) {
    return <div className="flex items-center justify-center h-full text-[rgb(var(--ec-page-text-muted))]">Node not found</div>;
  }

  return (
    <div className="h-full w-full focus-mode-container">
      <ReactFlow
        nodes={displayNodes}
        edges={edgesWithHover}
        nodeTypes={mergedNodeTypes}
        edgeTypes={edgeTypes}
        onNodeClick={handleNodeClick}
        onEdgeMouseEnter={handleEdgeMouseEnter}
        onEdgeMouseLeave={handleEdgeMouseLeave}
        onInit={handleInit}
        proOptions={{ hideAttribution: true }}
        nodesDraggable={true}
        nodesConnectable={false}
        elementsSelectable={true}
        panOnDrag={true}
        zoomOnScroll={true}
        minZoom={0.3}
        maxZoom={2}
      >
        <Background color="rgb(var(--ec-page-border))" gap={20} />
        <Controls showInteractive={false} />
        {displayNodes.map((node, index) => (
          <FocusModeNodeActions
            key={`actions-${node.id}-${index}`}
            node={node}
            isCenter={node.id === centerNodeId}
            onSwitch={handleSwitchNode}
          />
        ))}
      </ReactFlow>
    </div>
  );
};

export default FocusModeContent;
