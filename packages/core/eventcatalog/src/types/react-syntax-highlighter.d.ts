declare module 'react-syntax-highlighter' {
  import type { ComponentType } from 'react';

  export interface SyntaxHighlighterProps {
    [key: string]: any;
  }

  export const Prism: ComponentType<SyntaxHighlighterProps>;
  const SyntaxHighlighter: ComponentType<SyntaxHighlighterProps>;

  export default SyntaxHighlighter;
}

declare module 'react-syntax-highlighter/dist/esm/styles/prism/material-light';

declare module 'react-syntax-highlighter/dist/cjs/create-element.js' {
  import type { CSSProperties } from 'react';

  export function createStyleObject(
    classNames: string[],
    elementStyle?: CSSProperties,
    stylesheet?: { [selector: string]: CSSProperties }
  ): CSSProperties;
}
