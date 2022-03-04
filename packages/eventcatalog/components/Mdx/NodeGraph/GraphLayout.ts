import { isNode, Elements, Position } from 'react-flow-renderer';
import dagre from 'dagre';

const nodeDefaultWidth = 150;
const nodeDefaultHeight = 36;
const offset = 48;
const verticalOffset = offset / 1.5;

export default function createGraphLayout(elements: Elements, isHorizontal: boolean): Elements {
  const dagreGraph = new dagre.graphlib.Graph();

  dagreGraph.setDefaultEdgeLabel(() => ({}));
  dagreGraph.setGraph({ rankdir: 'LR', ranksep: offset * 2, nodesep: verticalOffset });

  elements.forEach((element) => {
    if (isNode(element)) {
      // eslint-disable-next-line no-underscore-dangle
      const nodeWidth = element.__rf?.width ? element.__rf?.width : element.data?.width;
      dagreGraph.setNode(element.id, {
        width: nodeWidth || nodeDefaultWidth,
        // eslint-disable-next-line no-underscore-dangle
        height: element.__rf?.height || nodeDefaultHeight,
      });
    } else {
      dagreGraph.setEdge(element.source, element.target);
    }
  });

  // Calculate the layout, to get the node positions with their widths and heights
  dagre.layout(dagreGraph);

  return elements.map((element) => {
    if (isNode(element)) {
      const node = dagreGraph.node(element.id);
      element.targetPosition = isHorizontal ? Position.Left : Position.Top;
      element.sourcePosition = isHorizontal ? Position.Right : Position.Bottom;
      element.position = {
        x: offset / 2 + node.x - (element?.data?.maxWidth || node.width) / 2,
        y: node.y - node.height / 2,
      };

      // This is due to an issue with ReactFlow giving errors when we set the width in the styles.
      if (element.style.width) {
        element.style.width = undefined;
      }
    }
    return element;
  });
}

// Helper - ReactFlow canvas height calculator
export const calcCanvasHeight = (data, type): number => {
  const minHeight = 300;
  const nodeSpacing = nodeDefaultHeight + verticalOffset;
  let nodesHeight = 0;

  if (type === 'event') {
    nodesHeight = Math.max(data.producerNames.length, data.consumerNames.length) * nodeSpacing;
  }

  if (type === 'service') {
    nodesHeight = Math.max(data.publishes.length, data.subscribes.length) * nodeSpacing;
  }

  return Math.max(minHeight, nodesHeight);
};
