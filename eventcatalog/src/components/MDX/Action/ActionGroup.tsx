import type { ReactNode } from 'react';

export interface ActionGroupProps {
  children: ReactNode;
}

export default function ActionGroup({ children }: ActionGroupProps) {
  return <div className="flex flex-wrap gap-2 my-4 not-prose">{children}</div>;
}
