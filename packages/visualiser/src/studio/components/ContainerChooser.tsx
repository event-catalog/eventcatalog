import { useEffect, useState, type ReactElement } from "react";
import { X } from "lucide-react";

/**
 * Asked when a domain or system is put on the canvas: is it a card (connected to what it contains), or a container
 * that what it contains sits inside? Styled like the visualiser's group-by picker (boxes or lanes). One from a catalog
 * can bring what it contains in the catalog inside it (`contents`).
 */

export type ContainerChoice =
  | { as: "card" }
  | { as: "container"; withContents?: boolean };

const plural = (count: number, noun: string) =>
  `${count} ${noun}${count === 1 ? "" : "s"}`;

// Small pictures of the two ways a domain or system can be on the canvas
export const CardPreview = () => (
  <svg viewBox="0 0 64 36" className="h-9 w-16" aria-hidden>
    <rect
      x="18"
      y="8"
      width="28"
      height="20"
      rx="4"
      fill="currentColor"
      fillOpacity="0.1"
      stroke="currentColor"
      strokeOpacity="0.5"
      strokeWidth="1.5"
    />
    <rect
      x="23"
      y="13"
      width="14"
      height="3"
      rx="1.5"
      fill="currentColor"
      fillOpacity="0.6"
    />
    <rect
      x="23"
      y="19"
      width="18"
      height="2"
      rx="1"
      fill="currentColor"
      fillOpacity="0.35"
    />
    <path
      d="M46 18h12"
      stroke="currentColor"
      strokeOpacity="0.5"
      strokeWidth="1.5"
      strokeDasharray="2 2"
    />
    <rect
      x="57"
      y="14"
      width="6"
      height="8"
      rx="1.5"
      fill="currentColor"
      fillOpacity="0.4"
    />
  </svg>
);

const ContainerPreview = () => (
  <svg viewBox="0 0 64 36" className="h-9 w-16" aria-hidden>
    <rect
      x="4"
      y="2"
      width="56"
      height="32"
      rx="4"
      fill="currentColor"
      fillOpacity="0.08"
      stroke="currentColor"
      strokeOpacity="0.5"
      strokeWidth="1.5"
    />
    <path
      d="M4 10h56"
      stroke="currentColor"
      strokeOpacity="0.35"
      strokeWidth="1"
    />
    <rect
      x="8"
      y="4.5"
      width="14"
      height="3"
      rx="1.5"
      fill="currentColor"
      fillOpacity="0.6"
    />
    <rect
      x="10"
      y="15"
      width="18"
      height="12"
      rx="2"
      fill="currentColor"
      fillOpacity="0.5"
    />
    <rect
      x="36"
      y="15"
      width="18"
      height="12"
      rx="2"
      fill="currentColor"
      fillOpacity="0.5"
    />
  </svg>
);

const OPTIONS: {
  as: ContainerChoice["as"];
  label: string;
  hint: string;
  Preview: () => ReactElement;
}[] = [
  {
    as: "card",
    label: "Card",
    hint: "Connected to what it contains",
    Preview: CardPreview,
  },
  {
    as: "container",
    label: "Container",
    hint: "What it contains sits inside it",
    Preview: ContainerPreview,
  },
];

export default function ContainerChooser({
  kind,
  name,
  contents,
  position,
  onChoose,
  onCancel,
}: {
  kind: "domain" | "system";
  /** Its name, when it has one already (e.g. from a catalog) */
  name?: string;
  /** What it contains in the catalog that isn't on the canvas yet (offered to bring inside it, as a container) */
  contents?: { systems: number; services: number };
  /** Where to show it (screen coordinates) */
  position: { x: number; y: number };
  onChoose: (choice: ContainerChoice) => void;
  onCancel: () => void;
}) {
  const [withContents, setWithContents] = useState(true);
  const contentsLabel = contents
    ? [
        contents.systems > 0 && plural(contents.systems, "system"),
        contents.services > 0 && plural(contents.services, "service"),
      ]
        .filter(Boolean)
        .join(" and ")
    : "";

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) =>
      event.key === "Escape" && onCancel();
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onCancel]);

  // Kept on screen, next to where it was dropped
  const left = Math.min(
    Math.max(position.x - 160, 12),
    window.innerWidth - 332,
  );
  const top = Math.min(
    Math.max(position.y - 20, 12),
    window.innerHeight - (contentsLabel ? 260 : 200),
  );

  return (
    <div className="fixed inset-0 z-50" onPointerDown={onCancel}>
      <div
        role="dialog"
        aria-label={name ? `Add ${name} as` : `Add the ${kind} as`}
        onPointerDown={(event) => event.stopPropagation()}
        className="absolute w-80 rounded-lg border p-1.5 shadow-xl bg-[rgb(var(--ec-card-bg))] border-[rgb(var(--ec-page-border))] text-[rgb(var(--ec-page-text))]"
        style={{ left, top }}
      >
        <div className="flex items-start justify-between gap-2 px-2 pb-1.5 pt-1">
          <div className="min-w-0">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-[rgb(var(--ec-page-text-muted))]">
              Add this {kind} as
            </p>
            {name && <p className="truncate text-xs font-semibold">{name}</p>}
          </div>
          <button
            onClick={onCancel}
            aria-label="Cancel"
            className="rounded p-0.5 text-[rgb(var(--ec-icon-color))] hover:bg-[rgb(var(--ec-page-border)/0.5)]"
          >
            <X size={14} />
          </button>
        </div>

        <div className="grid grid-cols-2 gap-1.5 px-0.5 pb-0.5">
          {OPTIONS.map(({ as, label, hint, Preview }) => (
            <button
              key={as}
              autoFocus={as === "container"}
              onClick={() =>
                onChoose(
                  as === "card"
                    ? { as }
                    : { as, withContents: withContents && !!contentsLabel },
                )
              }
              className="flex flex-col items-center gap-1 rounded-md border px-2 pb-1.5 pt-2 text-xs outline-none transition-colors border-[rgb(var(--ec-page-border))] text-[rgb(var(--ec-page-text-muted))] hover:border-[rgb(var(--ec-accent))] hover:bg-[color-mix(in_srgb,rgb(var(--ec-accent))_8%,transparent)] hover:text-[rgb(var(--ec-accent))] focus-visible:border-[rgb(var(--ec-accent))] focus-visible:text-[rgb(var(--ec-accent))]"
            >
              <Preview />
              <span className="font-semibold">{label}</span>
              <span className="text-center text-[10px] leading-tight text-[rgb(var(--ec-page-text-muted))]">
                {hint}
              </span>
            </button>
          ))}
        </div>

        {contentsLabel && (
          <label className="mt-1 flex items-center gap-2 rounded-md px-2 py-1.5 text-[11px] text-[rgb(var(--ec-page-text-muted))]">
            <input
              type="checkbox"
              checked={withContents}
              onChange={(event) => setWithContents(event.target.checked)}
            />
            As a container, bring its {contentsLabel} inside, with their
            messages and data stores
          </label>
        )}
      </div>
    </div>
  );
}
