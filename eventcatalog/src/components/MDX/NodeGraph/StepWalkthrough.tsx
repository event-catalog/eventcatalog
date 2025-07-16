import React, { useState, useEffect, useCallback } from 'react';
import { ChevronLeftIcon, ChevronRightIcon } from '@heroicons/react/24/outline';
import type { Node, Edge } from '@xyflow/react';

interface NodeData {
  step?: {
    title?: string;
    summary?: string;
  };
  service?: {
    data?: {
      name?: string;
      summary?: string;
    };
  };
  message?: {
    data?: {
      name?: string;
      summary?: string;
    };
  };
  flow?: {
    data?: {
      name?: string;
    };
  };
  custom?: {
    title?: string;
    label?: string;
    summary?: string;
  };
  actor?: {
    label?: string;
  };
  externalSystem?: {
    label?: string;
  };
}

interface CustomNode {
  id: string;
  data: NodeData;
}

interface StepWalkthroughProps {
  nodes: CustomNode[];
  edges: Edge[];
  isFlowVisualization: boolean;
  onStepChange: (nodeId: string | null, highlightPaths?: string[], shouldZoomOut?: boolean) => void;
  mode?: 'full' | 'simple';
}

interface PathOption {
  targetId: string;
  label?: string;
  targetNode: CustomNode;
}

export default function StepWalkthrough({
  nodes,
  edges,
  isFlowVisualization,
  onStepChange,
  mode = 'full',
}: StepWalkthroughProps) {
  const [currentNodeId, setCurrentNodeId] = useState<string | null>(null);
  const [pathHistory, setPathHistory] = useState<string[]>([]);
  const [currentStepIndex, setCurrentStepIndex] = useState<number>(-1); // -1 means not started
  const [availablePaths, setAvailablePaths] = useState<PathOption[]>([]);
  const [selectedPathIndex, setSelectedPathIndex] = useState<number>(0);
  const [startNodeId, setStartNodeId] = useState<string | null>(null);

  useEffect(() => {
    if (isFlowVisualization && nodes.length > 0) {
      // Find the starting node (node with no incoming edges)
      const incomingEdgeMap = new Map<string, number>();
      nodes.forEach((node: CustomNode) => incomingEdgeMap.set(node.id, 0));

      edges.forEach((edge: Edge) => {
        if (incomingEdgeMap.has(edge.target)) {
          incomingEdgeMap.set(edge.target, (incomingEdgeMap.get(edge.target) || 0) + 1);
        }
      });

      const startNodes = nodes.filter((node: CustomNode) => incomingEdgeMap.get(node.id) === 0);
      if (startNodes.length > 0 && !startNodeId) {
        const firstStartNode = startNodes[0];
        setStartNodeId(firstStartNode.id);
      }
    }
  }, [nodes, edges, isFlowVisualization, startNodeId]);

  useEffect(() => {
    if (currentNodeId) {
      // Find available paths from current node
      const outgoingEdges = edges.filter((edge: Edge) => edge.source === currentNodeId);
      const paths: PathOption[] = outgoingEdges.map((edge: Edge) => {
        const targetNode = nodes.find((n: CustomNode) => n.id === edge.target);
        return {
          targetId: edge.target,
          label: edge.label as string | undefined,
          targetNode: targetNode!,
        };
      });
      setAvailablePaths(paths);
      setSelectedPathIndex(0);
    } else {
      setAvailablePaths([]);
    }
  }, [currentNodeId, nodes, edges]);

  const handleNextStep = useCallback(() => {
    if (currentStepIndex === -1) {
      // Start the walkthrough
      if (startNodeId) {
        setPathHistory([startNodeId]);
        setCurrentNodeId(startNodeId);
        setCurrentStepIndex(0);
        onStepChange(startNodeId);
      }
    } else if (availablePaths.length > 0) {
      // Move to the selected path
      const selectedPath = availablePaths[selectedPathIndex];
      const newHistory = [...pathHistory, selectedPath.targetId];
      setPathHistory(newHistory);
      setCurrentNodeId(selectedPath.targetId);
      setCurrentStepIndex((prev) => prev + 1);

      // Highlight the selected path
      const allPaths = availablePaths.map((p) => `${currentNodeId}-${p.targetId}`);
      onStepChange(selectedPath.targetId, allPaths);
    }
  }, [currentStepIndex, startNodeId, availablePaths, selectedPathIndex, currentNodeId, onStepChange]);

  const handlePreviousStep = useCallback(() => {
    if (currentStepIndex > 0) {
      // Go back to previous step
      const newIndex = currentStepIndex - 1;
      const prevNodeId = pathHistory[newIndex];
      setCurrentNodeId(prevNodeId);
      setCurrentStepIndex(newIndex);
      onStepChange(prevNodeId);
    } else if (currentStepIndex === 0) {
      // Go back to the start (no selection)
      setCurrentNodeId(null);
      setCurrentStepIndex(-1);
      onStepChange(null);
    }
  }, [currentStepIndex, pathHistory, onStepChange]);

  const handlePathSelection = useCallback((index: number) => {
    setSelectedPathIndex(index);
  }, []);

  const handleFinish = useCallback(() => {
    setCurrentNodeId(null);
    setCurrentStepIndex(-1);
    setPathHistory([]);
    onStepChange(null, [], true); // Pass true to indicate full reset with zoom out
  }, [onStepChange]);

  if (!isFlowVisualization || nodes.length === 0 || mode !== 'full') {
    return null;
  }

  const getCurrentStepInfo = () => {
    if (currentStepIndex === -1) {
      return { title: 'Walk through business flow', description: 'Step through the flow to understand the business process' };
    }

    const currentNode = nodes.find((n: CustomNode) => n.id === currentNodeId);
    if (!currentNode) return { title: 'Unknown step', description: '' };

    let stepNumber = currentStepIndex + 1;
    let title = `Step ${stepNumber}`;
    let description = '';

    // Get node information based on type - check step data first, then type-specific data
    if (currentNode.data.step?.title) {
      title += `: ${currentNode.data.step.title}`;
    } else if (currentNode.data.service?.data?.name) {
      title += `: ${currentNode.data.service.data.name}`;
    } else if (currentNode.data.message?.data?.name) {
      title += `: ${currentNode.data.message.data.name}`;
    } else if (currentNode.data.flow?.data?.name) {
      title += `: ${currentNode.data.flow.data.name}`;
    } else if (currentNode.data.custom?.title) {
      title += `: ${currentNode.data.custom.title}`;
    } else if (currentNode.data.custom?.label) {
      title += `: ${currentNode.data.custom.label}`;
    } else if (currentNode.data.actor?.label) {
      title += `: ${currentNode.data.actor.label}`;
    } else if (currentNode.data.externalSystem?.label) {
      title += `: ${currentNode.data.externalSystem.label}`;
    }

    // Get description - check step data first, then type-specific data
    if (currentNode.data.step?.summary) {
      description = currentNode.data.step.summary;
    } else if (currentNode.data.service?.data?.summary) {
      description = currentNode.data.service.data.summary;
    } else if (currentNode.data.message?.data?.summary) {
      description = currentNode.data.message.data.summary;
    } else if (currentNode.data.custom?.summary) {
      description = currentNode.data.custom.summary;
    }

    return { title, description };
  };

  const { title, description } = getCurrentStepInfo();

  return (
    <div className="ml-8 bg-white rounded-lg shadow-sm p-[8px] z-30 border border-gray-200 w-[350px]">
      <div className="mb-3">
        <h3 className="text-sm font-semibold text-gray-900">{title}</h3>
        {description && <p className="text-xs text-gray-600 mt-1">{description}</p>}
      </div>

      {/* Show path options when there are multiple paths */}
      {currentNodeId && availablePaths.length > 1 && (
        <div className="mb-3">
          <label className="block text-xs font-medium text-gray-700 mb-2">Choose next path:</label>
          <select
            value={selectedPathIndex}
            onChange={(e: React.ChangeEvent<HTMLSelectElement>) => handlePathSelection(parseInt(e.target.value))}
            className="w-full px-3 py-2 text-xs border border-gray-300 rounded-md bg-white focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
          >
            {availablePaths.map((path, index) => {
              // @ts-ignore
              const nodeLabel =
                path.targetNode.data.step?.title ||
                (path.targetNode.data as any).service?.data?.name ||
                (path.targetNode.data as any).message?.data?.name ||
                (path.targetNode.data as any).flow?.data?.name ||
                (path.targetNode.data as any).custom?.title ||
                (path.targetNode.data as any).custom?.label ||
                (path.targetNode.data as any).actor?.label ||
                (path.targetNode.data as any).externalSystem?.label ||
                'Unknown';

              return (
                <option key={path.targetId} value={index}>
                  {path.label ? `${path.label}: ${nodeLabel}` : nodeLabel}
                </option>
              );
            })}
          </select>
        </div>
      )}

      <div className="flex items-center justify-between">
        {currentStepIndex === -1 ? (
          // Initial state - show only Start button on the right
          <>
            <div className="flex-1"></div>
            <button
              onClick={handleNextStep}
              className="flex items-center justify-center px-6 py-2 text-xs font-medium bg-purple-600 text-white rounded-md hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 transition-colors"
            >
              Start
            </button>
          </>
        ) : (
          // In walkthrough - show Previous on left, Next on right (only if paths available)
          <>
            <button
              onClick={handlePreviousStep}
              className="flex items-center justify-center px-4 py-2 text-xs font-medium bg-purple-600 text-white rounded-md hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 transition-colors"
            >
              <ChevronLeftIcon className="w-4 h-4 mr-1" />
              Previous
            </button>

            {availablePaths.length > 0 ? (
              <button
                onClick={handleNextStep}
                className="flex items-center justify-center px-4 py-2 text-xs font-medium bg-purple-600 text-white rounded-md hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 transition-colors"
              >
                Next
                <ChevronRightIcon className="w-4 h-4 ml-1" />
              </button>
            ) : (
              <button
                onClick={handleFinish}
                className="flex items-center justify-center px-4 py-2 text-xs font-medium bg-green-600 text-white rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 transition-colors"
              >
                Finish
              </button>
            )}
          </>
        )}
      </div>
    </div>
  );
}
