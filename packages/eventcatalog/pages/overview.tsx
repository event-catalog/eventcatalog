import React from 'react'
import ReactDOMServer from 'react-dom/server'

import dynamic from 'next/dynamic'

import { getAllEvents, getAllServicesNamesFromEvents } from '@/lib/events'

const ForceGraph3D = dynamic(
  () => import('react-force-graph-3d').then((module) => module.default),
  { ssr: false }
)

const NodeElement = ({ node: { id, type } }) => {
  return <div className={`text-sm text-center p-1 rounded-md `}>{id}</div>
}

const graph = ({ events, services }) => {
  const eventNodes = events.map(({ name: event }) => ({ id: event, group: 1, type: 'event' }))
  const serviceNodes = services.map((service) => ({ id: service, group: 2, type: 'service' }))

  // Create all links
  const links = events.reduce((nodes, event) => {
    const { consumers = [], producers = [], name } = event
    const consumerNodes = consumers.map((consumer) => ({ source: name, target: consumer }))
    const producerNodes = producers.map((producer) => ({ source: producer, target: name}))
    return nodes.concat(consumerNodes).concat(producerNodes)
  }, [])

  const data = { nodes: eventNodes.concat(serviceNodes), links }

  if (typeof window === 'undefined') {
    return null
  }

  const extraRenderers = [new window.THREE.CSS2DRenderer()]
  return (
    <div className="min-h-screen ">
      <ForceGraph3D
        extraRenderers={extraRenderers}
        graphData={data}
        nodeAutoColorBy="group"
        nodeRelSize={9}
        nodeThreeObject={(node) => {
          const nodeEl = document.createElement('div')
          nodeEl.innerHTML = ReactDOMServer.renderToString(<NodeElement node={node} />)
          node.height = '100px'
          nodeEl.style.color = node.color
          // nodeEl.className = 'node-label'
          return new THREE.CSS2DObject(nodeEl)
        }}
        nodeThreeObjectExtend={true}
        enableNodeDrag={false}
        nodeOpacity={0.2}
        linkDirectionalParticles={2}
        linkDirectionalParticleWidth={2}
        
        linkDirectionalParticleColor={(node) => {
          return 'rgba(236, 72, 153, 1)'
        }}
      />
    </div>
  )
}

export default graph

export const getServerSideProps = () => {
  const events = getAllEvents()
  const services = getAllServicesNamesFromEvents(events)

  return {
    props: {
      events,
      services: [...new Set(services)],
    },
  }
}
