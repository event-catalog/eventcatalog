import type { ReactNode } from "react";
import * as Tooltip from "@radix-ui/react-tooltip";
import { usePortalContainer } from "../context/PortalContainerContext";

/** Tooltips for a group of controls (e.g. a toolbar): shown after a moment, then straight away while moving along */
export const TipProvider = ({ children }: { children: ReactNode }) => (
  <Tooltip.Provider delayDuration={300}>{children}</Tooltip.Provider>
);

/**
 * A tooltip above a control: what it does, and optionally why it can't be used (`hint`). The control stays
 * focusable when unavailable (`aria-disabled`, not `disabled`), so it can still say why. Used in a TipProvider.
 */
export const Tip = ({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  /** The control: one element that takes a ref */
  children: ReactNode;
}) => {
  const portalContainer = usePortalContainer();
  return (
    <Tooltip.Root>
      <Tooltip.Trigger asChild>{children}</Tooltip.Trigger>
      <Tooltip.Portal container={portalContainer}>
        <Tooltip.Content
          side="top"
          sideOffset={8}
          className="z-50 max-w-[240px] rounded-md bg-[rgb(var(--ec-page-text))] px-2 py-1 text-xs text-[rgb(var(--ec-page-bg))] shadow-md"
        >
          {label}
          {hint && <div className="mt-0.5 opacity-70">{hint}</div>}
        </Tooltip.Content>
      </Tooltip.Portal>
    </Tooltip.Root>
  );
};
