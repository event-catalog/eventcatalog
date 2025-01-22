import { useEffect, useRef, type PointerEvent, type ReactNode } from 'react';
import { PanelGroup, Panel, PanelResizeHandle, type ImperativePanelHandle } from 'react-resizable-panels';

interface ResizableProps {
  children: ReactNode;
  sideNav?: ReactNode;
  subSideNav?: ReactNode;
  showSubSideNav: boolean;
}

export default function Resizable({ showSubSideNav, ...props }: ResizableProps) {
  const subSideNavRef = useRef<ImperativePanelHandle>(null);

  useEffect(() => {
    function toggleSubSideNav() {
      if (subSideNavRef.current?.isCollapsed()) subSideNavRef.current.expand();
      else subSideNavRef.current?.collapse();
    }

    function handleToggle(e: Event) {
      const isActive = (e.currentTarget as HTMLElement).getAttribute('data-active') === 'true';
      if (isActive) toggleSubSideNav();
    }

    const navItems = document.querySelectorAll('[data-role=nav-item]');
    navItems.forEach((navItem) => navItem.addEventListener('click', handleToggle));

    return () => {
      navItems.forEach((navItem) => navItem.removeEventListener('click', handleToggle));
    };
  }, []);

  return (
    <PanelGroup autoSaveId="EventCatalog:userPreferences:subSideNavWidth" direction="horizontal">
      {props.sideNav}
      {showSubSideNav && (
        <Panel ref={subSideNavRef} collapsible order={1}>
          {props.subSideNav}
        </Panel>
      )}
      <PanelResizeHandle className="relative bg-transparent data-[resize-handle-state=drag]:bg-purple-400/50 data-[resize-handle-state=hover]:bg-gray-200/50">
        <div className="absolute h-full inset-y-0 inset-x-[-2px] bg-inherit" />
      </PanelResizeHandle>
      <Panel order={2}>{props.children}</Panel>
    </PanelGroup>
  );
}
