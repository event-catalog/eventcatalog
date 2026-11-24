import { memo } from "react";

const METHOD_COLORS: Record<string, { bg: string; text: string }> = {
  GET: { bg: "rgba(48,164,108,0.15)", text: "#30a46c" },
  POST: { bg: "rgba(0,144,255,0.15)", text: "#0090ff" },
  PUT: { bg: "rgba(255,197,61,0.15)", text: "#ffc53d" },
  PATCH: { bg: "rgba(255,197,61,0.15)", text: "#ffc53d" },
  DELETE: { bg: "rgba(229,72,77,0.15)", text: "#e5484d" },
  OPTIONS: { bg: "rgba(110,86,207,0.15)", text: "#6e56cf" },
  HEAD: { bg: "rgba(141,141,141,0.15)", text: "#8d8d8d" },
  QUERY: { bg: "rgba(0,162,199,0.15)", text: "#00a2c7" },
};

const STATUS_COLORS: Record<string, { bg: string; text: string }> = {
  "2": { bg: "rgba(48,164,108,0.15)", text: "#30a46c" },
  "3": { bg: "rgba(0,144,255,0.15)", text: "#0090ff" },
  "4": { bg: "rgba(255,197,61,0.15)", text: "#ffc53d" },
  "5": { bg: "rgba(229,72,77,0.15)", text: "#e5484d" },
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
  const colors = METHOD_COLORS[upper] || { bg: "#8d8d8d", text: "#ffffff" };
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
