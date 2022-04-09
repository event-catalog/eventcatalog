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
});

interface MermaidEventSource {
  data: Event;
  source: 'event';
}

interface MermaidServiceSource {
  data: Service;
  source: 'service';
}

type MermaidProps = {
  rootNodeColor?: string;
  charts?: string[];
} & (MermaidEventSource | MermaidServiceSource);

function Mermaid({ data, source, rootNodeColor, charts }: MermaidProps) {
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
      ? buildMermaidFlowChartForEvent(data, rootNodeColor)
      : buildMermaidFlowChartForService(data, rootNodeColor);

  return <div className="mermaid">{mermaidChart}</div>;
}

export default Mermaid;
