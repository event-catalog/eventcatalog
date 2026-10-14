/**
 * Help: the keyboard shortcuts, as drawing tools list them, in two columns where there's room. Each app shows them in
 * its own dialog, leaving out what it doesn't have (by label).
 */

const isMac =
  typeof navigator !== "undefined" &&
  /Mac|iPhone|iPad/.test(navigator.platform);
const MOD = isMac ? "⌘" : "Ctrl";

export const SHORTCUTS: { group: string; items: [string, string[]][] }[] = [
  {
    group: "Tools",
    items: [
      ["Select", ["V"]],
      ["Hand (move around)", ["H"]],
      ["Sticky note", ["N"]],
      ["Text", ["T"]],
      ["Comment", ["C"]],
      ["Hotspot", ["A"]],
      ["Level 1 / 2 / 3", ["1", "2", "3"]],
      ["Back to selecting", ["Esc"]],
    ],
  },
  {
    group: "Canvas",
    items: [
      ["Select everything", [MOD, "A"]],
      ["Select several", ["⇧", "Click"]],
      ["Delete what's selected", ["Delete"]],
      ["Duplicate", [MOD, "D"]],
      ["Copy / paste", [MOD, "C / V"]],
      ["Undo / redo", [MOD, "Z / ⇧Z"]],
      ["Move around", ["Scroll"]],
      ["Zoom", [MOD, "Scroll"]],
      ["Fit view", ["⇧", "1"]],
    ],
  },
  {
    group: "Notes and text",
    items: [
      ["Write on one", ["Double-click"]],
      ["Finish writing", ["Esc"]],
    ],
  },
  {
    group: "Diagram",
    items: [
      ["Command palette", [MOD, "K"]],
      ["Find on canvas", [MOD, "F"]],
      ["Open a diagram file", [MOD, "O"]],
      ["Save to file", [MOD, "S"]],
      ["Export image", [MOD, "⇧", "E"]],
      ["Help", ["?"]],
    ],
  },
];

export function ShortcutsList({ omit = [] }: { omit?: string[] }) {
  return (
    <div className="grid min-h-0 gap-x-8 gap-y-5 overflow-y-auto px-5 py-4 md:grid-cols-2!">
      {SHORTCUTS.map(({ group, items }) => ({
        group,
        items: items.filter(([label]) => !omit.includes(label)),
      })).map(({ group, items }) => (
        <section key={group}>
          <h3 className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-[rgb(var(--ec-page-text-muted))]">
            {group}
          </h3>
          <ul className="divide-y divide-[rgb(var(--ec-page-border))]">
            {items.map(([label, keys]) => (
              <li
                key={label}
                className="flex items-center justify-between gap-3 py-1.5 text-sm"
              >
                <span>{label}</span>
                <span className="flex gap-1">
                  {keys.map((key) => (
                    <kbd
                      key={key}
                      className="min-w-6 rounded-md border border-[rgb(var(--ec-page-border))] bg-[rgb(var(--ec-content-hover))] px-1.5 py-0.5 text-center font-sans text-xs text-[rgb(var(--ec-page-text-muted))]"
                    >
                      {key}
                    </kbd>
                  ))}
                </span>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
