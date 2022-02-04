import { isNode, Elements, Position } from 'react-flow-renderer';
import dagre from 'dagre';

const nodeWidth = 150;
const nodeHeight = 36;
const offset = 48;
const verticalOffset = offset / 1.5;

export default function createGraphLayout(elements: Elements, isHorizontal: boolean): Elements {
  const dagreGraph = new dagre.graphlib.Graph();

  dagreGraph.setDefaultEdgeLabel(() => ({}));
  dagreGraph.setGraph({ rankdir: 'LR', ranksep: offset * 2, nodesep: verticalOffset });

  elements.forEach((element) => {
    if (isNode(element)) {
      dagreGraph.setNode(element.id, {
        // eslint-disable-next-line no-underscore-dangle
        width: element.data?.width || nodeWidth,
        // width: element.__rf?.width || nodeWidth,
        // eslint-disable-next-line no-underscore-dangle
        height: element.__rf?.height || nodeHeight,
      });
    } else {
      dagreGraph.setEdge(element.source, element.target);
    }
  });

  // Calculate the layout, to get the node positions with their widths and heights
  dagre.layout(dagreGraph);

  const elementsLayouted = elements.map((element) => {
    if (isNode(element)) {
      const node = dagreGraph.node(element.id);
      element.targetPosition = isHorizontal ? Position.Left : Position.Top;
      element.sourcePosition = isHorizontal ? Position.Right : Position.Bottom;
      element.position = {
        x: offset / 2 + node.x - (element?.data?.maxWidth || node.width) / 2,
        y: node.y - node.height / 2,
      };
    }
    return element;
  });
  return elementsLayouted;
}

// Helper - ReactFlow canvas height calculator
export const calcCanvasHeight = (data, type): number => {
  const minHeight = 300;
  const nodeSpacing = nodeHeight + verticalOffset;
  let nodesHeight = 0;
  if (type === 'event') {
    nodesHeight = Math.max(data.producers.length, data.consumers.length) * nodeSpacing;
  } else {
    nodesHeight = Math.max(data.publishes.length, data.subscribes.length) * nodeSpacing;
  }
  return Math.max(minHeight, nodesHeight);
};
