import React, { useEffect } from 'react';
import mermaid from 'mermaid';
import { Service, Event } from '@eventcatalog/types';
import { buildMermaidFlowChartForEvent, buildMermaidFlowChartForService } from '@/lib/graphs';

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
  data: Event | Service;
  source: 'event' | 'service';
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
  const mermaidChart =
    source === 'event'
      ? buildMermaidFlowChartForEvent(data as Event, rootNodeColor)
      : buildMermaidFlowChartForService(data as Service, rootNodeColor);

  return <div className="mermaid">{mermaidChart}</div>;
}

export default Mermaid;
