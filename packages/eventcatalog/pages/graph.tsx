import React from 'react'
import ReactDOMServer from 'react-dom/server'

import dynamic from 'next/dynamic'

import { getAllEvents, getAllServicesNamesFromEvents } from '@/lib/events'

import Script from 'next/script'

// import THREE from 'three';
// import CSS2DRenderer from 'three/examples/js/renderers/CSS2DRenderer';

const ForceGraph3D = dynamic(
  () => import('react-force-graph-3d').then((module) => module.default),
  { ssr: false }
)

const ForceGraph2D = dynamic(
  () => import('react-force-graph-2d').then((module) => module.default),
  { ssr: false }
)

const NodeElement = ({ node: { id, type } }) => {

  const eventStyles = 'text-green-500';
  const serviceStyles = 'text-blue-500';

  const styles = type === 'event' ? eventStyles : serviceStyles;

  return <div className={`text-sm text-center p-1 rounded-md `}>
    {id}
    {/* <span className="block text-xs">Something interesting about this service</span> */}
    </div>
}

const graph = ({ events, services }) => {

  const eventNodes = events.map(({ name: event }) => ({ id: event, group: 1, type: 'event' }))
  const serviceNodes = services.map(service => ({ id: service, group: 2, type: 'service' }))

  // Create all links
  const links = events.reduce((nodes, event) => {

    const { consumers = [], producers = [], name } = event;

    // the event
    // nodes.push({ id: name, group: 1, type: 'event' });

    const consumerNodes = consumers.map(consumer => ({ source: name, target: consumer }));
    const producerNodes = producers.map(producer => ({ source: producer, target: name}));

    return nodes.concat(consumerNodes).concat(producerNodes);

  }, []);

  const data = { nodes: eventNodes.concat(serviceNodes), links };

  console.log(data);

  const test = {
    nodes: [
      { id: 'UserCreated', group: 2, type: 'event' },
      { id: 'UserDeleted', group: 2, type: 'event' },
      { id: 'EmailSent', group: 2, type: 'event' },
      { id: 'ItemRemovedFromCart', group: 2, type: 'event' },

      // Services
      { id: 'User Service', group: 3, type: 'service' },
      { id: 'Email Service', group: 3, type: 'service' },
      { id: 'Shopping Cart API', group: 3, type: 'service' },
    ],
    links: [
      { source: 'User Service', target: 'UserCreated', value: 100 },
      { source: 'User Service', target: 'UserDeleted', value: 1 },
      { source: 'Email Service', target: 'EmailSent', value: 1 },
      { source: 'Shopping Cart API', target: 'ItemRemovedFromCart', value: 1 },
      { source: 'UserDeleted', target: 'Email Service', value: 1 },
    ],
  }

  if (typeof window === 'undefined') {
    return null
  }

  const extraRenderers = [new window.THREE.CSS2DRenderer()]
  return (
    <div className="min-h-screen">
      <ForceGraph3D
        extraRenderers={extraRenderers}
        graphData={data}
        nodeAutoColorBy="group"
        nodeRelSize={9}
        linkDirectionalParticles={1}
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
        linkDirectionalParticleWidth={2}
        linkDirectionalParticleResolution={10}
        linkDirectionalParticleColor={(node) => {
          return '#ffffff'
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
