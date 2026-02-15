import { memo } from "react";
import { UserIcon, UsersIcon } from "lucide-react";
import { OWNER_ICON_SIZE_STYLE } from "./shared-styles";

/** Shared style for hidden React Flow handles (avoids inline object allocation). */
export const HIDDEN_HANDLE_STYLE = { opacity: 0 } as const;

/**
 * Normalise owners which may arrive as string[] or {id:string}[] from Astro.
 */
export function normalizeOwners(raw: any[] | undefined): string[] {
  if (!raw || raw.length === 0) return [];
  return raw
    .filter(Boolean)
    .map((o: any) => (typeof o === "string" ? o : (o?.id ?? "")));
}

/**
 * Compact owner indicator for the bottom of a node card.
 * Shows a small icon + primary owner name + overflow pill.
 *
 * @param accentColor - Tailwind color class for the pill, e.g. "bg-pink-400"
 * @param borderColor - CSS color string for the top border
 * @param iconClass   - Tailwind text color for the icon, e.g. "text-pink-300"
 */
export const OwnerIndicator = memo(function OwnerIndicator({
  owners,
  accentColor = "bg-pink-400",
  borderColor = "rgba(236,72,153,0.08)",
  iconClass = "text-pink-300",
}: {
  owners: string[];
  accentColor?: string;
  borderColor?: string;
  iconClass?: string;
}) {
  if (owners.length === 0) return null;

  const primary = owners[0];
  const remaining = owners.length - 1;
  const isLikelyTeam = primary.includes(" ") || primary.includes("-");

  return (
    <div
      className="flex items-center gap-1 mt-1.5 pt-1.5"
      style={{ borderTop: `1px solid ${borderColor}` }}
      title={owners.join(", ")}
    >
      {/* Icon */}
      {isLikelyTeam ? (
        <UsersIcon
          className={`${iconClass} shrink-0`}
          style={OWNER_ICON_SIZE_STYLE}
          strokeWidth={2.5}
        />
      ) : (
        <UserIcon
          className={`${iconClass} shrink-0`}
          style={OWNER_ICON_SIZE_STYLE}
          strokeWidth={2.5}
        />
      )}

      {/* Primary owner name */}
      <span className="text-[8px] text-[rgb(var(--ec-page-text-muted))] truncate leading-none">
        {primary}
      </span>

      {/* Overflow count */}
      {remaining > 0 && (
        <span
          className={`shrink-0 inline-flex items-center justify-center text-[7px] font-bold text-white ${accentColor} rounded-full px-1 py-[1px] leading-none`}
          title={owners.slice(1).join(", ")}
        >
          +{remaining}
        </span>
      )}
    </div>
  );
});
