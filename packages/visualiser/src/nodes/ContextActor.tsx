import { memo } from "react";
import { Handle, Position } from "@xyflow/react";
import { User } from "lucide-react";
import { HIDDEN_HANDLE_STYLE } from "./OwnerIndicator";
import { TruncatedResourceName } from "./TruncatedResourceName";

interface Data {
  name: string;
}

/**
 * An actor (person/role) on the System Context Diagram.
 *
 * Deliberately styled differently from the boxy resource nodes: a soft, pill-ish
 * card with the actor icon in a circular badge centered at the top and the actor
 * name centered below. This reads as "a person", not "a system", at a glance.
 */
export default memo(function ContextActorNode({ data }: any) {
  const { name } = data as Data;

  return (
    <div
      className="relative flex w-44 flex-col items-center rounded-2xl border-2 border-yellow-500 bg-[var(--ec-actor-node-bg,rgb(var(--ec-card-bg)))] px-3 pb-3 pt-5"
      style={{ boxShadow: "0 2px 12px rgba(234, 179, 8, 0.15)" }}
    >
      <Handle
        type="target"
        position={Position.Left}
        style={HIDDEN_HANDLE_STYLE}
      />
      <Handle
        type="source"
        position={Position.Right}
        style={HIDDEN_HANDLE_STYLE}
      />

      {/* Icon badge — centered, straddling the top border like an avatar */}
      <div className="absolute -top-4 left-1/2 -translate-x-1/2">
        <div className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-yellow-500 bg-[rgb(var(--ec-card-bg))] shadow-sm">
          <User className="h-4 w-4 text-yellow-500" strokeWidth={2} />
        </div>
      </div>

      <TruncatedResourceName
        as="div"
        value={name}
        className="mt-1 max-w-full text-center text-[13px] font-semibold leading-snug text-[rgb(var(--ec-page-text))] truncate"
      >
        {name}
      </TruncatedResourceName>

      <span className="mt-0.5 text-[8px] font-bold uppercase tracking-widest text-yellow-600 dark:text-yellow-400">
        Actor
      </span>
    </div>
  );
});
