/**
 * A team: who owns what. Drawn like the visualiser's cards (a coloured border, its kind on a tab over the top edge,
 * its name and summary), in the team colour. Connected to a domain, system or service, it's that resource's owner.
 */
import { memo } from "react";
import { Handle, Position, type NodeProps } from "@xyflow/react";
import { Users } from "lucide-react";

type TeamData = {
  mode?: string;
  team?: { name?: string; summary?: string; version?: string };
};

export const TeamNode = memo(function TeamNode({ data, selected }: NodeProps) {
  const { mode = "full", team = {} } = data as TeamData;
  const name = team.name || "Team";
  return (
    <div
      className={`relative min-w-44 max-w-60 rounded-xl border-2 border-emerald-500 ${selected ? "ring-2 ring-emerald-400/60 ring-offset-2" : ""}`}
      style={{
        background: "rgb(var(--ec-card-bg))",
        boxShadow: "0 2px 12px rgba(16, 185, 129, 0.15)",
      }}
    >
      <Handle type="target" position={Position.Left} />
      <Handle type="source" position={Position.Right} />
      <div className="absolute -top-2.5 left-2.5 z-10 flex items-center">
        <span className="inline-flex items-center gap-1 rounded bg-emerald-500 px-1.5 py-0.5 text-[7px] font-bold uppercase tracking-widest text-white shadow-sm">
          <Users className="h-2.5 w-2.5" strokeWidth={2.5} />
          Team
        </span>
      </div>
      <div className="flex items-start gap-2 px-3 pb-2.5 pt-3.5">
        <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-600">
          <Users className="h-3.5 w-3.5" />
        </span>
        <div className="min-w-0">
          <div
            className="truncate text-[13px] font-semibold leading-snug text-[rgb(var(--ec-page-text))]"
            title={name}
          >
            {name}
          </div>
          {mode === "full" && team.summary && (
            <div
              className="mt-1 line-clamp-2 text-[9px] leading-relaxed text-[rgb(var(--ec-page-text-muted))]"
              title={team.summary}
            >
              {team.summary}
            </div>
          )}
        </div>
      </div>
    </div>
  );
});

export default TeamNode;
