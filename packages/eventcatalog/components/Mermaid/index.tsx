import React, { useEffect } from 'react'
import mermaid from 'mermaid'
import { buildMermaidFlowChart, buildMermaidFlowChartForService } from '@/lib/graphs'

mermaid.initialize({
  startOnLoad: true,
  theme: 'forest',
  securityLevel: 'loose',
  flowchart: {
    useMaxWidth: false,
    width: '1000px',
  },
  themeCSS: `
  .node {
      filter: drop-shadow( 3px 3px 2px rgba(0, 0, 0, .2))
  }
  .mermaid svg {
      width: 10000px
  }
  .node rect {
      fill: white
  }
    `,
  fontFamily: 'Fira Code',
  width: '100%',
})

const Mermaid = ({ data, source = "event", rootNodeColor }) => {

  const mermaidChart = source === 'event' ? buildMermaidFlowChart(data, rootNodeColor) : buildMermaidFlowChartForService(data, rootNodeColor);

  useEffect(() => {
    mermaid.contentLoaded()
  }, [])
  return <div className="mermaid">{mermaidChart}</div>
}

export default Mermaid
