import React, { useEffect } from 'react';
import mermaid from 'mermaid';
import { Service, Event, Domain } from '@eventcatalog/types';
import { buildMermaidFlowChartForEvent, buildMermaidFlowChartForService, buildMermaidFlowChartForDomain } from '@/lib/graphs';

mermaid.initialize({
  startOnLoad: true,
  theme: 'forest',
  securityLevel: 'loose',
  flowchart: {
    useMaxWidth: false,
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
});

interface MermaidProps {
  data: Event | Service | Domain;
  source: 'event' | 'service' | 'domain';
  rootNodeColor?: string;
  charts?: string[];
}

function Mermaid({ data, source = 'event', rootNodeColor, charts }: MermaidProps) {
  useEffect(() => {
    mermaid.contentLoaded();
  }, []);

  if (charts) {
    return (
      <>
        {charts.map((content, index) => (
          <div key={`chart-${index}`} className="mermaid">
            {content}
          </div>
        ))}
      </>
    );
  }

  const mermaidChart = function(){
    switch (source) {
      case 'event':
        return buildMermaidFlowChartForEvent(data as Event, rootNodeColor)
      case 'service':
        return buildMermaidFlowChartForService(data as Service, rootNodeColor);
      case 'domain':
        return buildMermaidFlowChartForDomain(data as Domain, rootNodeColor);
    }
  } 

  return <div className="mermaid">{mermaidChart()}</div>;
}

export default Mermaid;
