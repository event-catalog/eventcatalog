import { createElement, type CSSProperties, type ReactNode } from 'react';
import { createStyleObject } from 'react-syntax-highlighter/dist/cjs/create-element.js';

type Stylesheet = { [selector: string]: CSSProperties };
type HighlightedNode = {
  type: 'element' | 'text';
  value?: string | number;
  tagName?: any;
  properties?: { className?: string[]; style?: CSSProperties; [key: string]: unknown };
  children?: HighlightedNode[];
};

const selectorsByStylesheet = new WeakMap<Stylesheet, Set<string>>();

/** The class names a theme styles, worked out once per theme */
const stylesheetSelectors = (stylesheet: Stylesheet) => {
  let selectors = selectorsByStylesheet.get(stylesheet);
  if (!selectors) {
    selectors = new Set(Object.keys(stylesheet).flatMap((selector) => selector.split('.')));
    selectorsByStylesheet.set(stylesheet, selectors);
  }
  return selectors;
};

const renderNode = (node: HighlightedNode, stylesheet: Stylesheet, useInlineStyles: boolean, key: string): ReactNode => {
  if (node.type === 'text') return node.value;
  if (!node.tagName) return undefined;

  const properties = node.properties ?? {};
  const classNames = properties.className;
  let props;
  if (!useInlineStyles) {
    props = { ...properties, className: classNames?.join(' ') };
  } else {
    // Theme classes become inline styles; any other class names stay
    const selectors = stylesheetSelectors(stylesheet);
    const className =
      classNames && (classNames.includes('token') ? ['token'] : []).concat(classNames.filter((name) => !selectors.has(name)));
    props = {
      ...properties,
      className: className?.join(' ') || undefined,
      style: createStyleObject(classNames ?? [], { ...properties.style }, stylesheet),
    };
  }

  const children = (node.children ?? []).map((child, i) => renderNode(child, stylesheet, useInlineStyles, `code-segment-1-${i}`));
  return createElement(node.tagName, { key, ...props }, children);
};

/**
 * Renders react-syntax-highlighter's rows as its default renderer does (same elements, styles and keys), but
 * works out the theme's class names once per theme rather than for every token: the default renderer did
 * that for every token, which made highlighting a schema on the server take tens of milliseconds a page.
 * Set `wrapLines`: with a custom renderer, react-syntax-highlighter turns it on when it isn't set.
 */
export const renderHighlightedRows = ({
  rows,
  stylesheet,
  useInlineStyles,
}: {
  rows: HighlightedNode[];
  stylesheet: Stylesheet;
  useInlineStyles: boolean;
}): ReactNode[] => rows.map((node, i) => renderNode(node, stylesheet, useInlineStyles, `code-segment-${i}`));
