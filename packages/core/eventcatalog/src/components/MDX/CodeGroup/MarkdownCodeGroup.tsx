import { Children, isValidElement, type ReactNode } from 'react';
import CodeGroup from './CodeGroup';

export function MarkdownCodeGroup({
  children,
  dropdown,
  className,
}: {
  children?: ReactNode;
  dropdown?: boolean;
  className?: string;
}) {
  const items = Children.toArray(children).flatMap((child) => {
    if (
      !isValidElement<{ 'data-code-panel'?: string; 'data-code-lang'?: string }>(child) ||
      child.props['data-code-panel'] === undefined
    )
      return [];
    return [{ label: child.props['data-code-panel'], language: child.props['data-code-lang'], content: child }];
  });
  return <CodeGroup items={items} dropdown={dropdown} className={className} />;
}
