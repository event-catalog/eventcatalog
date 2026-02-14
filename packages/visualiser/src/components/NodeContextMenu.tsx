import { memo } from "react";
import * as ContextMenu from "@radix-ui/react-context-menu";
import type { ContextMenuItem } from "../types";

interface NodeContextMenuProps {
  items: ContextMenuItem[];
  children: React.ReactNode;
}

export default memo(function NodeContextMenu({
  items,
  children,
}: NodeContextMenuProps) {
  if (!items || items.length === 0) return <>{children}</>;

  return (
    <ContextMenu.Root>
      <ContextMenu.Trigger>{children}</ContextMenu.Trigger>
      <ContextMenu.Portal>
        <ContextMenu.Content
          className="min-w-[220px] bg-white rounded-md p-1 shadow-md border border-gray-200 z-50"
          onClick={(e) => e.stopPropagation()}
        >
          {items.map((item, index) => (
            <div key={index}>
              {item.separator && index > 0 && (
                <ContextMenu.Separator className="h-[1px] bg-gray-200 m-1" />
              )}
              <ContextMenu.Item
                asChild
                className="text-sm px-2 py-1.5 outline-none cursor-pointer hover:bg-orange-100 rounded-sm flex items-center"
              >
                <a
                  href={item.href}
                  {...(item.download ? { download: item.download } : {})}
                  {...(item.external
                    ? { target: "_blank", rel: "noopener noreferrer" }
                    : {})}
                >
                  {item.label}
                </a>
              </ContextMenu.Item>
            </div>
          ))}
        </ContextMenu.Content>
      </ContextMenu.Portal>
    </ContextMenu.Root>
  );
});
