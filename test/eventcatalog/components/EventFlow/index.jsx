import React, { useState } from 'react';

import ReactFlow, { removeElements, addEdge, MiniMap, Controls } from 'react-flow-renderer';
import nodeTypes from './Nodes';

const onLoad = (reactFlowInstance) => reactFlowInstance.fitView();

const onNodeMouseEnter = (event, node) => console.log('mouse enter:', node);
const onNodeMouseMove = (event, node) => console.log('mouse move:', node);
const onNodeMouseLeave = (event, node) => console.log('mouse leave:', node);
const onNodeContextMenu = (event, node) => {
  event.preventDefault();
  console.log('context menu:', node);
};

const initialElements = [
  {
    id: 'horizontal-1',
    sourcePosition: 'right',
    type: 'eventNode',
    className: 'dark-node',
    data: { label: 'Input', event: 'UserCreated', version: '0.0.1', description: 'Event is created when the user logs into the account.' },
    position: { x: 500, y: 80 },
  },
  {
    id: 'horizontal-2',
    sourcePosition: 'right',
    type: 'producerNode',
    targetPosition: 'left',
    className: 'dark-node',
    data: { label: 'Input', serviceName: 'User API', tags: [{ label: 'NodeJS', color: 'green' }], description: 'Service that can do something interesting' },
    position: { x: 0, y: -100 },
  },
  {
    id: 'horizontal-3',
    sourcePosition: 'right',
    type: 'producerNode',
    targetPosition: 'left',
    className: 'dark-node',
    data: { label: 'Input', serviceName: 'Customer Portal', tags: [{ label: 'NodeJS', color: 'green' }], description: 'Internal customer portal app used by customer support' },
    position: { x: 0, y: 100 },
  },
  {
    id: 'horizontal-4',
    sourcePosition: 'right',
    type: 'subscribeNode',
    targetPosition: 'left',
    className: 'dark-node',
    data: { label: 'Input', serviceName: 'Email Platform', tags: [{ label: 'NodeJS', color: 'green' }], description: 'Company Email platform' },
    position: { x: 1000, y: 0 },
    animated: true,
  },

  {
    id: 'horizontal-e1-2',
    source: 'horizontal-2',
    type: 'smoothstep',
    target: 'horizontal-1',
    animated: true,
  },
  {
    id: 'horizontal-e1-3',
    source: 'horizontal-3',
    type: 'smoothstep',
    target: 'horizontal-1',
    animated: true,
  },
  {
    id: 'horizontal-e1-4',
    source: 'horizontal-1',
    type: 'smoothstep',
    target: 'horizontal-4',
    animated: true,
  },
  {
    id: 'horizontal-e3-5',
    source: 'horizontal-3',
    type: 'smoothstep',
    target: 'horizontal-5',
    animated: true,
  },
  {
    id: 'horizontal-e3-6',
    source: 'horizontal-3',
    type: 'smoothstep',
    target: 'horizontal-6',
    animated: true,
  },
  {
    id: 'horizontal-e5-7',
    source: 'horizontal-5',
    type: 'smoothstep',
    target: 'horizontal-7',
    animated: true,
  },
  {
    id: 'horizontal-e6-8',
    source: 'horizontal-6',
    type: 'smoothstep',
    target: 'horizontal-8',
    animated: true,
  },
];

const EventFlow = () => {
  const [elements, setElements] = useState(initialElements);
  const onElementsRemove = (elementsToRemove) => setElements((els) => removeElements(elementsToRemove, els));
  const onConnect = (params) => setElements((els) => addEdge(params, els));
  const changeClassName = () => {
    setElements((elms) =>
      elms.map((el) => {
        if (el.type === 'input') {
          el.className = el.className ? '' : 'dark-node';
        }

        return { ...el };
      })
    );
  };

  return (
    <div className="h-96 w-full bg-gray-900">
      <ReactFlow
        elements={elements}
        onElementsRemove={onElementsRemove}
        onConnect={onConnect}
        onLoad={onLoad}
        selectNodesOnDrag={false}
        nodeTypes={nodeTypes}
        onNodeMouseEnter={onNodeMouseEnter}
        onNodeMouseMove={onNodeMouseMove}
        onNodeMouseLeave={onNodeMouseLeave}
        onNodeContextMenu={onNodeContextMenu}
      >
     
      <Controls />
      </ReactFlow>
    </div>
  );
};

export default EventFlow;
