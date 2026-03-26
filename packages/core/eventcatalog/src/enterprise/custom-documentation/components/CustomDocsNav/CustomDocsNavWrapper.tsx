/**
 * Licensed under the EventCatalog Commercial License.
 * See /packages/core/eventcatalog/src/enterprise/LICENSE
 */

import CustomDocsNav from './';
import type { SidebarSection } from './types';

interface CustomDocsNavWrapperProps {
  sidebarItems: SidebarSection[];
  currentPath: string;
}

export default function CustomDocsNavWrapper(props: CustomDocsNavWrapperProps) {
  return <CustomDocsNav {...props} />;
}
