import React from 'react'

import ReactFlow, { Controls } from 'react-flow-renderer'
import nodeTypes from './Nodes'
import { Event } from '@/types/index'

const onLoad = (reactFlowInstance) => reactFlowInstance.fitView()

const buildElementsFromEvent = (event: Event) => {

  const nodeHeight = 200;
  const nodeWidth = 500;
  const nodePadding = 50;

  const { consumers, producers, name: eventName, version } = event

  const maxNodes = producers.length > consumers.length ? producers : consumers;

  const elements = [
    {
      id: eventName,
      type: 'eventNode',
      className: 'dark-node',
      data: {
        event: eventName,
        version: version,
      },
      position: { x: nodeWidth + nodePadding, y: (maxNodes.length * nodeHeight / 2) },
    },
  ]

  const producerNodes = producers.reduce((nodes, producerName, index) => {

    nodes.push({
      id: producerName,
      sourcePosition: 'right',
      type: 'producerNode',
      targetPosition: 'left',
      data: {
        serviceName: producerName,
        tags: [{ label: 'NodeJS', color: 'green' }],
      },
      position: { x: 0, y: index * nodeHeight + nodePadding },
    })

    nodes.push({
      id: `${producerName}-${eventName}`,
      source: producerName,
      type: 'smoothstep',
      target: eventName,
      animated: true,
    })

    return nodes;
    
  }, [])

  const consumerNodes = consumers.reduce((nodes, consumerName, index) => {

    nodes.push({
      id: consumerName,
      type: 'subscribeNode',
      targetPosition: 'left',
      data: {
        serviceName: consumerName,
        tags: [{ label: 'NodeJS', color: 'green' }],
      },
      position: { x: (nodeWidth * 2) + nodePadding, y: index * nodeHeight + nodePadding },
    })

    nodes.push({
      id: `${consumerName}-${eventName}`,
      source: eventName,
      type: 'smoothstep',
      target: consumerName,
      animated: true,
    })

    return nodes;
    
  }, [])

  return elements.concat(producerNodes).concat(consumerNodes)
}

interface EventFlowProps {
  event: Event
}

const EventFlow = ({ event }: EventFlowProps) => {
  // const [elements, setElements] = useState(initialElements)
  const elements = buildElementsFromEvent(event)

  return (
    <div className="h-96 w-full bg-gray-900">
      <ReactFlow
        elements={elements}
        onLoad={onLoad}
        selectNodesOnDrag={false}
        nodeTypes={nodeTypes}
      >
        <Controls />
      </ReactFlow>
    </div>
  )
}

export default EventFlow
