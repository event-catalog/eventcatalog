import CustomDocsNav from './';
import type { SidebarSection } from './types';

interface CustomDocsNavWrapperProps {
  sidebarItems: SidebarSection[];
  currentPath: string;
}

export default function CustomDocsNavWrapper(props: CustomDocsNavWrapperProps) {
  return <CustomDocsNav {...props} />;
}
