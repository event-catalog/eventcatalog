import type { CSSProperties, ReactNode } from 'react';
import { getColumnsLayout, columnsClass, gridClass, columnClass, stickyClass } from './layout';

export function MarkdownColumns({
  children,
  cols = 2,
  ratio,
  className = '',
}: {
  children?: ReactNode;
  cols?: number;
  ratio?: string;
  className?: string;
}) {
  const { template } = getColumnsLayout(cols, ratio);
  return (
    <div className={`${columnsClass} ${className}`} style={{ '--ec-columns-template': template } as CSSProperties}>
      <div className={gridClass}>{children}</div>
    </div>
  );
}

export function MarkdownColumn({
  children,
  sticky = false,
  className = '',
}: {
  children?: ReactNode;
  sticky?: boolean;
  className?: string;
}) {
  return (
    <div className={`${columnClass} ${sticky ? stickyClass : ''} ${className}`} data-sticky={String(sticky)}>
      {children}
    </div>
  );
}
