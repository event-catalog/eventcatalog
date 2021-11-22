import React, { useEffect } from 'react';
import mermaid from 'mermaid'

mermaid.initialize({
  startOnLoad: true,
  theme: 'forest',
  securityLevel: 'loose',
  themeCSS: `
  .node {
      filter: drop-shadow( 3px 3px 2px rgba(0, 0, 0, .2))
  }
  .node rect {
      fill: white
  }
    `,
  fontFamily: 'Fira Code',
})



const index = (props) => {
    useEffect(() => {
        mermaid.contentLoaded();
    }, [])
    return (
        <div>
            <div className="mermaid">{props.chart}</div>
        </div>
    );
};

export default index;