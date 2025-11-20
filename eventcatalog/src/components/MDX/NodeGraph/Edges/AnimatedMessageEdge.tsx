import { useMemo } from 'react';
import { BaseEdge, getBezierPath } from '@xyflow/react';

const AnimatedMessageEdge = ({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  data,
  label = '',
  markerEnd,
  markerStart,
}: any) => {
  const [edgePath, labelX, labelY] = getBezierPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
  });

  const messageColor = useMemo(
    () => (collection: string) => {
      switch (collection) {
        case 'events':
          return 'orange';
        case 'commands':
          return 'blue';
        case 'queries':
          return 'green';
        default:
          return 'gray';
      }
    },
    []
  );

  const collection = data?.message?.collection;
  const opacity = data?.opacity ?? 1;
  const customColor = data?.customColor || messageColor(collection ?? 'default');
  const warning = data?.warning;

  // For each customColor (string or array of strings), we need to create the animated nodes
  const customColors = Array.isArray(customColor) ? customColor : [customColor];

  const randomDelay = useMemo(() => Math.random() * 1, []);

  const animatedNodes = customColors.map((color, index) => {
    // Stagger the animations so multiple colored nodes are visible
    const delay = randomDelay + index * 0.3;
    return (
      <g className={`z-30 ${opacity === 1 ? 'opacity-100' : 'opacity-10'}`} key={`${id}-${color}-${index}`}>
        <circle key={`${id}-${color}-${index}`} cx="0" cy="0" r="7" fill={color}>
          <animateMotion dur="2s" repeatCount="indefinite" path={edgePath} rotate="auto" begin={`${delay}s`}>
            <mpath href={`#${id}`} />
          </animateMotion>
        </circle>
      </g>
    );
  });

  // Label can be spit using \n to create multiple lines
  const lines = String(label ?? '').split('\n');

  return (
    // @ts-ignore
    <>
      <BaseEdge
        id={id}
        path={edgePath}
        markerEnd={markerEnd}
        markerStart={markerStart}
        style={warning ? { stroke: 'red', strokeWidth: 1 } : {}}
      />
      {/* Circle Icon */}
      {animatedNodes}
      {/* <g className={`z-30 ${opacity === 1 ? 'opacity-100' : 'opacity-10'}`}>
      </g> */}
      <g>
        {/* Text element */}
        <text x={labelX} y={labelY} textAnchor="middle" dominantBaseline="middle" fontSize="10px" pointerEvents="none">
          {lines.map((line, i) => (
            <tspan key={i} x={labelX} dy={i === 0 ? 0 : '1.2em'} style={{ fontStyle: i === 0 ? 'normal' : 'italic' }}>
              {line}
            </tspan>
          ))}
        </text>
      </g>
    </>
  );
};

export default AnimatedMessageEdge;
