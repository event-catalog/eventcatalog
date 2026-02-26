import { memo } from "react";

const METHOD_COLORS: Record<string, { bg: string; text: string }> = {
  GET: { bg: "rgba(34,197,94,0.15)", text: "#22c55e" },
  POST: { bg: "rgba(59,130,246,0.15)", text: "#3b82f6" },
  PUT: { bg: "rgba(245,158,11,0.15)", text: "#f59e0b" },
  PATCH: { bg: "rgba(245,158,11,0.15)", text: "#f59e0b" },
  DELETE: { bg: "rgba(239,68,68,0.15)", text: "#ef4444" },
  OPTIONS: { bg: "rgba(139,92,246,0.15)", text: "#8b5cf6" },
  HEAD: { bg: "rgba(107,114,128,0.15)", text: "#6b7280" },
};

const STATUS_COLORS: Record<string, { bg: string; text: string }> = {
  "2": { bg: "rgba(34,197,94,0.15)", text: "#22c55e" },
  "3": { bg: "rgba(59,130,246,0.15)", text: "#3b82f6" },
  "4": { bg: "rgba(245,158,11,0.15)", text: "#f59e0b" },
  "5": { bg: "rgba(239,68,68,0.15)", text: "#ef4444" },
};

function getStatusColor(code: number) {
  const prefix = String(code)[0];
  return STATUS_COLORS[prefix] || STATUS_COLORS["2"];
}

export const MethodBadge = memo(function MethodBadge({
  method,
}: {
  method: string;
}) {
  const upper = method.toUpperCase();
  const colors = METHOD_COLORS[upper] || { bg: "#6b7280", text: "#ffffff" };
  return (
    <span
      className="inline-flex items-center text-[8px] font-extrabold uppercase tracking-wide px-1.5 py-0.5 rounded"
      style={{ background: colors.bg, color: colors.text }}
    >
      {upper}
    </span>
  );
});

export const StatusCodes = memo(function StatusCodes({
  codes,
}: {
  codes: number[];
}) {
  return (
    <div className="flex items-center gap-1 flex-wrap mt-1.5">
      {codes.map((code) => {
        const colors = getStatusColor(code);
        return (
          <span
            key={code}
            className="inline-flex items-center text-[8px] font-bold px-1.5 py-0.5 rounded"
            style={{ background: colors.bg, color: colors.text }}
          >
            {code}
          </span>
        );
      })}
    </div>
  );
});

export const ApiPath = memo(function ApiPath({ path }: { path: string }) {
  return (
    <span
      className="text-[12px] font-mono font-medium text-[rgb(var(--ec-page-text))] truncate min-w-0"
      title={path}
    >
      {path}
    </span>
  );
});
