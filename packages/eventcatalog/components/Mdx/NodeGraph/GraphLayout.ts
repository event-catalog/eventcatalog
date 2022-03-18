import { isNode, Elements, Position } from 'react-flow-renderer';
import dagre from 'dagre';
import { DataSource } from './NodeGraph';

const nodeDefaultWidth = 150;
const nodeDefaultHeight = 36;
const offset = 48;
const verticalOffset = offset / 1.5;

const getMaxWidthElementFromPreviousColumn = (elements, column) => {
  const elementsInColumn = elements.filter((element) => element?.data?.renderInColumn === column);

  if (elementsInColumn.length === 0) return {};
  if (elementsInColumn.length === 1) return elementsInColumn[0];

  const maxWidthElement = elementsInColumn.reduce((currentElement, element) => {
    const currentElementWidth = currentElement?.data?.maxWidth || currentElement?.data?.width || nodeDefaultWidth;
    const elementWidth = element?.data?.maxWidth || element?.data.width || nodeDefaultWidth;
    return elementWidth > currentElementWidth ? element : currentElement;
  }, elementsInColumn[0]);

  return maxWidthElement;
};

const getXPositionFromElement = (elem) => {
  const elementWidth = elem?.data?.maxWidth || elem.width || nodeDefaultWidth;
  const currentXPositionOfElement = elem.position.x;
  return currentXPositionOfElement + elementWidth;
};

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

  const allNodes = elements.filter((element) => element.data);
  const allEdges = elements.filter((element) => !element.data);

  const sortedNodesByColumn = allNodes.sort((nodeA, nodeB) =>
    // eslint-disable-next-line no-nested-ternary
    nodeA.data.renderInColumn > nodeB.data.renderInColumn ? 1 : nodeB.data.renderInColumn > nodeA.data.renderInColumn ? -1 : 0
  );
  const allData = [...sortedNodesByColumn, ...allEdges];

  return allData.map((element) => {
    if (isNode(element)) {
      const node = dagreGraph.node(element.id);
      element.targetPosition = isHorizontal ? Position.Left : Position.Top;
      element.sourcePosition = isHorizontal ? Position.Right : Position.Bottom;

      const paddingBetweenNodes = element.data.renderInColumn > 1 ? 75 : 0;
      const currentColumnToRenderIn = element?.data?.renderInColumn;
      const maxWidthElementFromPreviousColumn = getMaxWidthElementFromPreviousColumn(elements, currentColumnToRenderIn - 1);

      const nodeX =
        Object.keys(maxWidthElementFromPreviousColumn).length > 0
          ? getXPositionFromElement(maxWidthElementFromPreviousColumn)
          : 0;

      element.position = {
        x: nodeX + paddingBetweenNodes,
        y: node.y - node.height / 2,
      };

      // This is due to an issue with ReactFlow giving errors when we set the width in the styles.
      if (element.style.width) {
        if (element.style.width <= nodeDefaultWidth) {
          element.style.width = undefined;
        }
      }
    }

    return element;
  });
}

// Helper - ReactFlow canvas height calculator
export const calcCanvasHeight = ({ source, data }: DataSource): number => {
  const minHeight = 300;
  const nodeSpacing = nodeDefaultHeight + verticalOffset;
  let nodesHeight = 0;

  if (source === 'event') {
    nodesHeight = Math.max(data.producerNames.length, data.consumerNames.length) * nodeSpacing;
  }

  if (source === 'service') {
    nodesHeight = Math.max(data.publishes.length, data.subscribes.length) * nodeSpacing;
  }

  return Math.max(minHeight, nodesHeight);
};
