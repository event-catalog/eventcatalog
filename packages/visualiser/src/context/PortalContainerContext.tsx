import { createContext, useContext } from "react";

/**
 * Context that provides a reference to the .eventcatalog-visualizer container element.
 * Used by Radix UI portals so they render inside the scoped CSS boundary
 * instead of at document.body.
 */
const PortalContainerContext = createContext<HTMLElement | null>(null);

export const PortalContainerProvider = PortalContainerContext.Provider;

export function usePortalContainer(): HTMLElement | undefined {
  const container = useContext(PortalContainerContext);
  return container ?? undefined;
}
