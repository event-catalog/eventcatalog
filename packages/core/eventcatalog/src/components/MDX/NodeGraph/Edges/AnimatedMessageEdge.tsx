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
}: any) => {
  const [edgePath, labelX, labelY] = getBezierPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
  });

  const collection = data?.message?.collection;
  const opacity = data?.opacity ?? 1;

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

  const randomDelay = useMemo(() => Math.random() * 1, []);

  return (
    // @ts-ignore
    <>
      <BaseEdge id={id} path={edgePath} markerEnd={markerEnd} />
      {/* Circle Icon */}
      <g className={`z-30 ${opacity === 1 ? 'opacity-100' : 'opacity-10'}`}>
        <circle cx="0" cy="0" r="7" fill={messageColor(collection)}>
          <animateMotion dur="2s" repeatCount="indefinite" path={edgePath} rotate="auto" begin={`${randomDelay}s`}>
            <mpath href={`#${id}`} />
          </animateMotion>
        </circle>
      </g>
      <g>
        {/* Background rectangle */}
        <rect
          x={labelX - label.length * 3} // Adjust based on text length
          y={labelY - 15} // Position above the text
          width={label.length * 6} // Width based on text length
          height={20} // Fixed height
          fill="white" // Background color
          opacity={0.8} // Opacity
          rx="4" // Rounded corners
        />

        {/* Text element */}
        <text x={labelX} y={labelY} fill="black" fontSize="10" textAnchor="middle" dy="-2">
          {label}
        </text>
      </g>
      {/* Label */}
      {/* <text x={labelX} y={labelY} fill="black" fontSize="12" textAnchor="middle" dy="-5">
        {label}
      </text> */}
    </>
  );
};

export default AnimatedMessageEdge;
