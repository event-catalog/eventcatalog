/**
 * Styles for the HTML reference. eventcatalog.dev branding (purple, ink, Geist) laid out like
 * Stripe's API reference: prose and attributes on the left, a sticky dark code column on the right.
 */
/** Colour classes, one per resource kind. */
export const KINDS = ['evt', 'cmd', 'qry', 'dom', 'sys', 'svc', 'agt', 'flw', 'ent', 'chn', 'dat', 'act'] as const;

export const styles = /* css */ `
:root {
  --bg: #FBFAFF; --surface: #FFFFFF; --surface-2: #F6F5FB;
  --ink: #0B0F17; --text: #4B5563; --muted: #6B7280;
  --line: #E5E7EB; --line-strong: #DFE3EC;
  --accent: #6D28D9; --accent-hover: #7C3AED; --accent-soft: #F3EEFF; --accent-line: #DDD0FB;
  --grid: transparent;
  --evt: #C2410C; --evt-bg: #FFF3EA; --evt-line: #FED7AA;
  --dom: #A16207; --dom-bg: #FEFCE8; --dom-line: #FDE68A;
  --sys: #7E22CE; --sys-bg: #FAF5FF; --sys-line: #E9D5FF;
  --svc: #BE185D; --svc-bg: #FDF2F8; --svc-line: #FBCFE8;
  --agt: #0369A1; --agt-bg: #F0F9FF; --agt-line: #BAE6FD;
  --flw: #0F766E; --flw-bg: #F0FDFA; --flw-line: #99F6E4;
  --ent: #7E22CE; --ent-bg: #FAF5FF; --ent-line: #E9D5FF;
  --chn: #4B5563; --chn-bg: #F3F4F6; --chn-line: #D1D5DB;
  --dat: #2563EB; --dat-bg: #EFF6FF; --dat-line: #BFDBFE;
  --act: #A16207; --act-bg: #FEF9C3; --act-line: #FDE047;
  --cmd: #1D4ED8; --cmd-bg: #EEF3FF; --cmd-line: #C7D7FE;
  --qry: #15803D; --qry-bg: #ECFBF1; --qry-line: #BBEBCB;
  --req: #B45309;
  --warn: #B45309; --warn-bg: #FFFBEB; --warn-line: #FDE68A;
  --shadow: 0 1px 2px rgba(15, 23, 42, 0.04), 0 10px 30px -18px rgba(15, 23, 42, 0.18);
  --shadow-pop: 0 30px 80px -30px rgba(15, 23, 42, 0.45), 0 8px 24px -12px rgba(109, 40, 217, 0.25);
  --scrim: rgba(11, 15, 23, 0.32);
  --code-bg: #FFFFFF; --code-head: #F6F5FB; --code-line: #E5E7EB; --code-text: #1F2330; --code-muted: #6B7280;
  --code-tab: #FFFFFF; --code-tab-text: #0B0F17;
  --t-key: #6D28D9; --t-str: #047857; --t-num: #C2410C; --t-kw: #1D4ED8; --t-com: #9CA3AF; --t-prop: #7C3AED;
  --font-sans: "Geist", ui-sans-serif, system-ui, -apple-system, "Segoe UI", sans-serif;
  --font-mono: "Geist Mono", ui-monospace, "SF Mono", Menlo, Consolas, monospace;
  --top-h: 60px; --nav-w: 272px;
}
@media (prefers-color-scheme: dark) {
  :root:not([data-theme="light"]) {
    --bg: #121317; --surface: #17181D; --surface-2: #1B1C22;
    --ink: #F3F3F6; --text: #B4B8C3; --muted: #8A8F9C;
    --line: #25262E; --line-strong: #30313A;
    --accent: #A78BFA; --accent-hover: #C4B5FD; --accent-soft: rgba(167, 139, 250, 0.12); --accent-line: rgba(167, 139, 250, 0.32);
    --grid: rgba(167, 139, 250, 0.05);
    --evt: #FB923C; --evt-bg: rgba(251, 146, 60, 0.12); --evt-line: rgba(251, 146, 60, 0.3);
    --dom: #FACC15; --dom-bg: rgba(250, 204, 21, 0.1); --dom-line: rgba(250, 204, 21, 0.28);
    --sys: #C084FC; --sys-bg: rgba(192, 132, 252, 0.12); --sys-line: rgba(192, 132, 252, 0.3);
    --svc: #F472B6; --svc-bg: rgba(244, 114, 182, 0.12); --svc-line: rgba(244, 114, 182, 0.3);
    --agt: #38BDF8; --agt-bg: rgba(56, 189, 248, 0.12); --agt-line: rgba(56, 189, 248, 0.3);
    --flw: #2DD4BF; --flw-bg: rgba(45, 212, 191, 0.1); --flw-line: rgba(45, 212, 191, 0.28);
    --ent: #C084FC; --ent-bg: rgba(192, 132, 252, 0.12); --ent-line: rgba(192, 132, 252, 0.3);
    --chn: #9CA3AF; --chn-bg: rgba(156, 163, 175, 0.12); --chn-line: rgba(156, 163, 175, 0.3);
    --dat: #60A5FA; --dat-bg: rgba(96, 165, 250, 0.12); --dat-line: rgba(96, 165, 250, 0.3);
    --act: #FDE047; --act-bg: rgba(253, 224, 71, 0.1); --act-line: rgba(253, 224, 71, 0.3);
    --cmd: #60A5FA; --cmd-bg: rgba(96, 165, 250, 0.12); --cmd-line: rgba(96, 165, 250, 0.3);
    --qry: #4ADE80; --qry-bg: rgba(74, 222, 128, 0.1); --qry-line: rgba(74, 222, 128, 0.28);
    --req: #FBBF24; --warn: #FBBF24; --warn-bg: rgba(251, 191, 36, 0.07); --warn-line: rgba(251, 191, 36, 0.28);
    --shadow: 0 1px 2px rgba(0, 0, 0, 0.3), 0 10px 30px -18px rgba(0, 0, 0, 0.6);
    --shadow-pop: 0 30px 80px -30px rgba(0, 0, 0, 0.8), 0 8px 24px -12px rgba(167, 139, 250, 0.2);
    --scrim: rgba(0, 0, 0, 0.55);
    --code-bg: #0D0E12; --code-head: #131419; --code-line: #25262E; --code-text: #E4E5EC; --code-muted: #8B90A0;
    --code-tab: rgba(255, 255, 255, 0.08); --code-tab-text: #FFFFFF;
    --t-key: #C4B5FD; --t-str: #86EFAC; --t-num: #FDBA74; --t-kw: #93C5FD; --t-com: #6B7080; --t-prop: #E9D5FF;
    color-scheme: dark;
  }
}
:root[data-theme="dark"] {
  --bg: #121317; --surface: #17181D; --surface-2: #1B1C22;
  --ink: #F3F3F6; --text: #B4B8C3; --muted: #8A8F9C;
  --line: #25262E; --line-strong: #30313A;
  --accent: #A78BFA; --accent-hover: #C4B5FD; --accent-soft: rgba(167, 139, 250, 0.12); --accent-line: rgba(167, 139, 250, 0.32);
  --grid: rgba(167, 139, 250, 0.05);
  --evt: #FB923C; --evt-bg: rgba(251, 146, 60, 0.12); --evt-line: rgba(251, 146, 60, 0.3);
  --dom: #FACC15; --dom-bg: rgba(250, 204, 21, 0.1); --dom-line: rgba(250, 204, 21, 0.28);
  --sys: #C084FC; --sys-bg: rgba(192, 132, 252, 0.12); --sys-line: rgba(192, 132, 252, 0.3);
  --svc: #F472B6; --svc-bg: rgba(244, 114, 182, 0.12); --svc-line: rgba(244, 114, 182, 0.3);
  --agt: #38BDF8; --agt-bg: rgba(56, 189, 248, 0.12); --agt-line: rgba(56, 189, 248, 0.3);
  --flw: #2DD4BF; --flw-bg: rgba(45, 212, 191, 0.1); --flw-line: rgba(45, 212, 191, 0.28);
  --ent: #C084FC; --ent-bg: rgba(192, 132, 252, 0.12); --ent-line: rgba(192, 132, 252, 0.3);
  --chn: #9CA3AF; --chn-bg: rgba(156, 163, 175, 0.12); --chn-line: rgba(156, 163, 175, 0.3);
  --dat: #60A5FA; --dat-bg: rgba(96, 165, 250, 0.12); --dat-line: rgba(96, 165, 250, 0.3);
  --act: #FDE047; --act-bg: rgba(253, 224, 71, 0.1); --act-line: rgba(253, 224, 71, 0.3);
  --cmd: #60A5FA; --cmd-bg: rgba(96, 165, 250, 0.12); --cmd-line: rgba(96, 165, 250, 0.3);
  --qry: #4ADE80; --qry-bg: rgba(74, 222, 128, 0.1); --qry-line: rgba(74, 222, 128, 0.28);
  --req: #FBBF24; --warn: #FBBF24; --warn-bg: rgba(251, 191, 36, 0.07); --warn-line: rgba(251, 191, 36, 0.28);
  --shadow: 0 1px 2px rgba(0, 0, 0, 0.3), 0 10px 30px -18px rgba(0, 0, 0, 0.6);
  --shadow-pop: 0 30px 80px -30px rgba(0, 0, 0, 0.8), 0 8px 24px -12px rgba(167, 139, 250, 0.2);
  --scrim: rgba(0, 0, 0, 0.55);
  --code-bg: #0D0E12; --code-head: #131419; --code-line: #25262E; --code-text: #E4E5EC; --code-muted: #8B90A0;
  --code-tab: rgba(255, 255, 255, 0.08); --code-tab-text: #FFFFFF;
  --t-key: #C4B5FD; --t-str: #86EFAC; --t-num: #FDBA74; --t-kw: #93C5FD; --t-com: #6B7080; --t-prop: #E9D5FF;
  color-scheme: dark;
}

* { box-sizing: border-box; }
[hidden] { display: none !important; }
body {
  margin: 0; background: var(--bg); color: var(--text);
  font-family: var(--font-sans); font-size: 15px; line-height: 1.6; -webkit-font-smoothing: antialiased;
}
a { color: var(--accent); text-decoration: none; }
a:hover { color: var(--accent-hover); }
:focus-visible { outline: 2px solid var(--accent); outline-offset: 2px; border-radius: 4px; }
code, kbd, pre { font-family: var(--font-mono); }
h1, h2, h3, h4, h5, h6 { color: var(--ink); text-wrap: balance; margin: 0; letter-spacing: -0.015em; }
p { margin: 0; }

/* top bar */
.topbar {
  position: sticky; top: 0; z-index: 30; height: var(--top-h);
  display: flex; align-items: center; gap: 16px;
  padding-inline: max(20px, env(safe-area-inset-left, 0px)) max(20px, env(safe-area-inset-right, 0px));
  background: color-mix(in srgb, var(--bg) 88%, transparent);
  backdrop-filter: blur(12px); -webkit-backdrop-filter: blur(12px);
  border-bottom: 1px solid var(--line);
}
.brand { display: flex; align-items: center; gap: 10px; color: var(--ink); font-weight: 600; white-space: nowrap; min-width: 0; }
.brand:hover { color: var(--ink); }
.brand-logo { flex: none; width: 26px; height: 26px; object-fit: contain; color: var(--ink); }
.brand .name { overflow: hidden; text-overflow: ellipsis; }
.brand-sep { width: 1px; height: 18px; background: var(--line-strong); flex: none; }
.brand-sub { color: var(--muted); font-weight: 500; }
.top-spacer { flex: 1; }
.search-btn {
  display: flex; align-items: center; gap: 10px; width: min(340px, 34vw); height: 36px; padding: 0 8px 0 12px;
  border: 1px solid var(--line-strong); border-radius: 8px; background: var(--surface);
  color: var(--muted); font: inherit; font-size: 14px; cursor: pointer; text-align: left;
}
.search-btn:hover { border-color: var(--accent-line); }
.search-btn span { flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
kbd { font-size: 11px; color: var(--muted); background: var(--surface-2); border: 1px solid var(--line-strong); border-radius: 5px; padding: 1px 6px; line-height: 18px; }
.date-chip { font-family: var(--font-mono); font-size: 12px; color: var(--muted); white-space: nowrap; }
.icon-btn {
  display: inline-flex; width: 36px; height: 36px; border-radius: 8px; border: 1px solid var(--line-strong);
  background: var(--surface); color: var(--ink); cursor: pointer; align-items: center; justify-content: center; flex: none;
}
.icon-btn:hover { border-color: var(--accent-line); color: var(--accent); }
.menu-btn { display: none; }

/* shell and side nav */
.shell { display: grid; grid-template-columns: var(--nav-w) minmax(0, 1fr); }
.sidenav {
  position: sticky; top: var(--top-h); height: calc(100vh - var(--top-h));
  overflow-y: auto; overscroll-behavior: contain; border-right: 1px solid var(--line);
  padding: 18px 14px 40px max(20px, env(safe-area-inset-left, 0px)); font-size: 13.5px;
}
.nav-filter {
  width: 100%; height: 34px; margin-bottom: 18px; padding: 0 10px; border-radius: 8px;
  border: 1px solid var(--line-strong); background: var(--surface); color: var(--ink); font: inherit; font-size: 13px;
}
.nav-filter::placeholder { color: var(--muted); }
.nav-group + .nav-group { margin-top: 20px; }
.nav-label { display: flex; justify-content: space-between; font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.07em; color: var(--ink); padding: 0 10px 6px; }
.sidenav .nav-label a { color: inherit; padding: 0; display: inline; font-weight: inherit; }
.sidenav .nav-label a:hover { background: none; color: var(--accent); }
.nav-label small { color: var(--muted); font-weight: 500; letter-spacing: 0; font-variant-numeric: tabular-nums; }
.nav-sub { font-size: 10.5px; text-transform: uppercase; letter-spacing: 0.07em; color: var(--muted); padding: 10px 10px 4px; font-weight: 500; }
.sidenav a { display: flex; align-items: center; gap: 8px; color: var(--text); padding: 4px 10px; border-radius: 6px; line-height: 1.45; min-width: 0; }
.sidenav a .t { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; flex: 1; }
.sidenav a:hover { color: var(--ink); background: var(--surface-2); }
.sidenav a[aria-current="true"] { color: var(--accent); background: var(--accent-soft); font-weight: 500; }
.tag {
  flex: none; width: 38px; padding: 3px 0; border-radius: 4px; text-align: center;
  font: 600 9.5px/1 var(--font-mono); letter-spacing: 0.04em; text-transform: uppercase; border: 1px solid transparent;
}
.tag.n { color: var(--muted); background: var(--surface); border-color: var(--line-strong); }
.dot { width: 6px; height: 6px; border-radius: 50%; flex: none; background: var(--line-strong); }
.nav-empty { color: var(--muted); padding: 0 10px; }
.nav-foot { margin-top: 28px; padding: 12px 10px 0; border-top: 1px solid var(--line); color: var(--muted); font-size: 12px; }

/* sections */
main { min-width: 0; }
.section {
  display: grid; grid-template-columns: minmax(0, 1fr) minmax(0, 470px); gap: 56px;
  padding: 64px max(48px, env(safe-area-inset-right, 0px)) 64px 56px;
  border-bottom: 1px solid var(--line); scroll-margin-top: var(--top-h); max-width: 1320px;
}
.section.flash { animation: flash 1.2s ease-out; }
@keyframes flash { from { background: var(--accent-soft); } to { background: transparent; } }
@media (prefers-reduced-motion: reduce) { .section.flash { animation: none; } }
.col-l { min-width: 0; max-width: 640px; display: flex; flex-direction: column; gap: 22px; }
.col-r { min-width: 0; }
.sticky { position: sticky; top: calc(var(--top-h) + 24px); display: flex; flex-direction: column; gap: 18px; }
/* Like Stripe's code column: sticky only while it fits the window. A taller column flows with the page so every
   box shows in full (the page script sets .tall). */
.sticky.tall { position: static; }

.group-head {
  padding: 40px max(48px, env(safe-area-inset-right, 0px)) 18px 56px; border-bottom: 1px solid var(--line);
  background: var(--surface-2); scroll-margin-top: var(--top-h);
}
.group-head h2 { font-size: 13px; text-transform: uppercase; letter-spacing: 0.08em; font-weight: 600; color: var(--ink); }
.group-head p { font-size: 14px; color: var(--muted); max-width: 640px; margin-top: 4px; }

.intro { position: relative; overflow: hidden; }
.intro::before {
  content: ""; position: absolute; inset: 0; pointer-events: none;
  background-image: linear-gradient(var(--grid) 1px, transparent 1px), linear-gradient(90deg, var(--grid) 1px, transparent 1px);
  background-size: 44px 44px;
  -webkit-mask-image: linear-gradient(to bottom, #000 0%, #000 35%, transparent 85%);
  mask-image: linear-gradient(to bottom, #000 0%, #000 35%, transparent 85%);
}
.intro > * { position: relative; }

.eyebrow { display: flex; flex-wrap: wrap; align-items: center; gap: 8px; font-size: 12px; font-weight: 500; color: var(--muted); }
.eyebrow a { color: var(--muted); }
.eyebrow a:hover { color: var(--accent); }
.eyebrow .sep { color: var(--line-strong); }
h1 { font-size: 34px; line-height: 1.15; font-weight: 600; }
.section h2 { font-size: 26px; line-height: 1.2; font-weight: 600; overflow-wrap: anywhere; }
.title-row { display: flex; flex-wrap: wrap; align-items: center; gap: 10px 12px; }
.res-id { font-family: var(--font-mono); font-size: 12.5px; color: var(--muted); margin-top: -14px; overflow-wrap: anywhere; }
.lead { font-size: 16.5px; color: var(--text); line-height: 1.65; white-space: pre-line; }
.prose { display: flex; flex-direction: column; gap: 12px; }
.prose strong { color: var(--ink); font-weight: 600; }
.label { font-size: 11.5px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.07em; color: var(--muted); padding-bottom: 10px; border-bottom: 1px solid var(--line); }
.block { display: flex; flex-direction: column; }

/* pills */
.pill {
  display: inline-flex; align-items: center; gap: 6px; height: 22px; padding: 0 8px; border-radius: 6px;
  font-family: var(--font-mono); font-size: 11.5px; font-weight: 600; letter-spacing: 0.02em; border: 1px solid; white-space: nowrap;
}
.pill.ver { color: var(--text); background: var(--surface); border-color: var(--line-strong); font-weight: 500; }
.pill.badge { color: var(--accent); background: var(--accent-soft); border-color: var(--accent-line); font-family: var(--font-sans); font-weight: 500; letter-spacing: 0; }
.pill.warn { color: var(--warn); background: var(--warn-bg); border-color: var(--warn-line); font-family: var(--font-sans); font-weight: 600; letter-spacing: 0; }
.meta-line { display: flex; flex-wrap: wrap; gap: 6px 18px; font-size: 13.5px; color: var(--muted); }
.meta-line b { color: var(--ink); font-weight: 500; }

/* attributes */
.attr { padding: 14px 0; border-bottom: 1px solid var(--line); display: flex; flex-direction: column; gap: 4px; scroll-margin-top: calc(var(--top-h) + 16px); }
.attr:last-child { border-bottom: 0; }
.attr-head { display: flex; flex-wrap: wrap; align-items: baseline; gap: 4px 10px; }
.attr-name { font-family: var(--font-mono); font-size: 13.5px; font-weight: 600; color: var(--ink); overflow-wrap: anywhere; }
.attr-name.sans { font-family: var(--font-sans); font-size: 14.5px; }
.attr-type { font-family: var(--font-mono); font-size: 12px; color: var(--muted); overflow-wrap: anywhere; }
.attr-type i { font-style: normal; color: var(--text); opacity: 0.8; }
.attr-req { font-size: 11px; font-weight: 600; color: var(--req); letter-spacing: 0.02em; }
.attr-dep { font-size: 11px; font-weight: 600; color: var(--muted); text-decoration: line-through; }
.attr-desc { font-size: 14px; color: var(--text); overflow-wrap: anywhere; }
.attr-desc code, .inline-code { font-size: 12.5px; background: var(--surface-2); border: 1px solid var(--line); border-radius: 4px; padding: 0 4px; color: var(--ink); }
.constraints { display: flex; flex-wrap: wrap; gap: 4px 14px; font-size: 12.5px; color: var(--muted); margin-top: 2px; }
.constraints code { font-size: 11.5px; background: var(--surface-2); border: 1px solid var(--line); border-radius: 4px; padding: 0 5px; color: var(--ink); }
.attr-title { font-style: italic; color: var(--muted); }
.schema-desc { padding-top: 12px; }
.variants { margin-top: 8px; border: 1px dashed var(--line-strong); border-radius: 10px; padding: 4px 14px 10px; display: flex; flex-direction: column; }
.variants-label { font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.07em; color: var(--muted); padding: 8px 0 2px; }
.variant { padding: 8px 0; border-bottom: 1px solid var(--line); display: flex; flex-direction: column; gap: 2px; }
.variant:last-child { border-bottom: 0; }
.enum { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 4px; }
.enum code { font-size: 11.5px; background: var(--surface-2); border: 1px solid var(--line); border-radius: 4px; padding: 1px 6px; color: var(--ink); }
.child-toggle {
  align-self: flex-start; margin-top: 6px; display: inline-flex; align-items: center; gap: 6px;
  font: inherit; font-size: 12.5px; font-weight: 500; color: var(--muted);
  background: var(--surface); border: 1px solid var(--line-strong); border-radius: 999px; padding: 3px 12px 3px 8px; cursor: pointer;
}
.child-toggle:hover { color: var(--ink); }
.child-toggle::before {
  content: ""; width: 12px; height: 12px; background: currentColor; transition: transform 0.15s;
  -webkit-mask: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='black' stroke-width='2.4' stroke-linecap='round'%3E%3Cpath d='M12 5v14M5 12h14'/%3E%3C/svg%3E") center / contain no-repeat;
  mask: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='black' stroke-width='2.4' stroke-linecap='round'%3E%3Cpath d='M12 5v14M5 12h14'/%3E%3C/svg%3E") center / contain no-repeat;
}
.child-toggle[aria-expanded="true"]::before { transform: rotate(45deg); }
/* Sections of large catalogs are drawn when they near the screen */
.section.lazy { display: block; }
.children { margin-top: 8px; border: 1px solid var(--line-strong); border-radius: 10px; padding: 0 16px; background: var(--surface); }

/* chips */
.chips { display: flex; flex-wrap: wrap; gap: 8px; padding-top: 12px; }
.chip {
  display: inline-flex; align-items: center; gap: 8px; min-height: 30px; padding: 3px 12px;
  border: 1px solid var(--line-strong); border-radius: 8px; background: var(--surface);
  color: var(--ink); font-size: 13.5px; font-weight: 500; max-width: 100%;
}
a.chip:hover { border-color: var(--accent-line); color: var(--accent); }
.chip small { color: var(--muted); font-weight: 400; font-size: 12px; }
.chip .dot { margin-right: -2px; }
.empty { padding-top: 12px; color: var(--muted); font-size: 14px; }
.two { display: grid; grid-template-columns: 1fr 1fr; gap: 24px; }
.more { color: var(--muted); font-size: 13px; align-self: center; }

/* callouts */
.callouts { display: flex; flex-direction: column; gap: 10px; padding-top: 12px; }
.callout { display: grid; grid-template-columns: 20px minmax(0, 1fr); gap: 10px; border: 1px solid var(--line-strong); background: var(--surface); border-radius: 10px; padding: 12px 14px; font-size: 14px; }
.callout.warning { border-color: var(--warn-line); background: var(--warn-bg); }
.callout.warning svg { color: var(--warn); }
.callout.info svg { color: var(--accent); }
.callout b { color: var(--ink); font-weight: 600; display: block; }
.callout .lvl { font-size: 11px; text-transform: uppercase; letter-spacing: 0.07em; font-weight: 600; margin-right: 6px; }
.callout.warning .lvl { color: var(--warn); }
.callout.info .lvl { color: var(--accent); }
.callout .chips { padding-top: 8px; gap: 6px; }
.callout .chip { min-height: 26px; font-size: 12.5px; padding: 2px 10px; }

/* flow timeline */
.flow { list-style: none; margin: 0; padding: 16px 0 0; }
.flow li { position: relative; display: grid; grid-template-columns: 46px minmax(0, 1fr); column-gap: 14px; padding-bottom: 20px; }
.flow li:last-child { padding-bottom: 0; }
.flow li::before { content: ""; position: absolute; left: 22px; top: 24px; bottom: 2px; width: 1px; background: var(--line-strong); }
.flow li:last-child::before { display: none; }
.flow .tag { width: 46px; margin-top: 2px; align-self: start; position: relative; }
.flow-body { min-width: 0; display: flex; flex-direction: column; gap: 2px; }
.flow-name { color: var(--ink); font-weight: 600; font-size: 14.5px; }
a.flow-name:hover { color: var(--accent); }
.flow-next { display: flex; flex-direction: column; gap: 2px; margin-top: 4px; font-size: 12.5px; color: var(--muted); }
.flow-next span::before { content: "\\2193  "; color: var(--muted); }
.flow-next b { font-weight: 500; color: var(--text); }

.msg-link { font-family: var(--font-mono); font-size: 13px; font-weight: 600; }

/* boxes (Stripe's ENDPOINTS) */
.box { border: 1px solid var(--line-strong); border-radius: 12px; background: var(--surface); box-shadow: var(--shadow); overflow: hidden; }
.box-head { display: flex; justify-content: space-between; align-items: center; gap: 10px; padding: 10px 16px; background: var(--surface-2); border-bottom: 1px solid var(--line); font-size: 11.5px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.07em; color: var(--muted); }
.box-head span:last-child { font-weight: 500; text-transform: none; letter-spacing: 0; font-family: var(--font-mono); font-size: 11.5px; }
.box-body { padding: 10px 16px 12px; display: flex; flex-direction: column; gap: 2px; }
.ep { display: grid; grid-template-columns: 64px minmax(0, 1fr); gap: 10px; align-items: baseline; padding: 3px 0; font-family: var(--font-mono); font-size: 12.5px; color: var(--ink); }
a.ep:hover .ep-path { color: var(--accent); }
.ep-verb { font-weight: 600; text-align: left; font-size: 11.5px; letter-spacing: 0.03em; }
.ep-verb.n { color: var(--muted); }
.ep-path { overflow-wrap: anywhere; }
.ep-path small { color: var(--muted); font-size: 11px; margin-left: 6px; }
.box-sub { font-size: 10.5px; text-transform: uppercase; letter-spacing: 0.07em; color: var(--muted); padding: 8px 0 2px; font-family: var(--font-sans); font-weight: 600; }
.box-empty { color: var(--muted); font-size: 13px; padding: 2px 0; }
.kv { display: grid; grid-template-columns: auto minmax(0, 1fr); gap: 6px 16px; padding: 12px 16px; font-size: 13px; margin: 0; }
.kv dt { color: var(--muted); }
.kv dd { margin: 0; color: var(--ink); font-family: var(--font-mono); font-size: 12.5px; text-align: right; overflow-wrap: anywhere; font-variant-numeric: tabular-nums; }

/* dark code card */
.code { border-radius: 12px; background: var(--code-bg); border: 1px solid var(--code-line); box-shadow: var(--shadow); overflow: hidden; color: var(--code-text); }
.code-head { display: flex; align-items: center; gap: 4px; padding: 6px 8px 6px 14px; background: var(--code-head); border-bottom: 1px solid var(--code-line); }
.code-title { font-size: 11.5px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.07em; color: var(--code-muted); margin-right: auto; padding-right: 8px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.tabs { display: flex; gap: 2px; margin-right: auto; overflow-x: auto; }
.tab { font: inherit; font-size: 12.5px; font-weight: 500; color: var(--code-muted); background: transparent; border: 0; border-radius: 6px; padding: 4px 10px; cursor: pointer; white-space: nowrap; }
.tab:hover { color: var(--code-text); }
.tab[aria-selected="true"] { color: var(--code-tab-text); background: var(--code-tab); box-shadow: 0 0 0 1px var(--code-line); }
.copy { display: inline-flex; align-items: center; gap: 6px; flex: none; font: inherit; font-size: 12px; color: var(--code-muted); background: transparent; border: 1px solid transparent; border-radius: 6px; padding: 4px 8px; cursor: pointer; }
.copy:hover { color: var(--code-text); border-color: var(--code-line); }
.code pre { margin: 0; padding: 14px 16px 16px; overflow: auto; max-height: 460px; font-size: 12.5px; line-height: 1.65; tab-size: 2; }
.code-foot { padding: 8px 14px; border-top: 1px solid var(--code-line); font-size: 12px; color: var(--code-muted); }
.code-foot code { color: var(--code-text); }
.t-key { color: var(--t-key); } .t-str { color: var(--t-str); } .t-num { color: var(--t-num); }
.t-kw { color: var(--t-kw); } .t-com { color: var(--t-com); font-style: italic; } .t-prop { color: var(--t-prop); }

/* documentation rendered from the catalog's markdown */
.md { font-size: 14.5px; color: var(--text); display: flex; flex-direction: column; gap: 12px; padding-top: 14px; overflow-wrap: anywhere; }
.md h3 { font-size: 17px; margin-top: 8px; } .md h4 { font-size: 15px; margin-top: 4px; } .md h5, .md h6 { font-size: 14px; }
.md ul, .md ol { margin: 0; padding-left: 20px; display: flex; flex-direction: column; gap: 4px; }
.md strong { color: var(--ink); font-weight: 600; }
.md code { font-size: 12.5px; background: var(--surface-2); border: 1px solid var(--line); border-radius: 4px; padding: 0 4px; color: var(--ink); }
.md pre.md-code { margin: 0; padding: 12px 14px; border-radius: 10px; background: var(--code-bg); color: var(--code-text); overflow: auto; font-size: 12.5px; line-height: 1.6; }
.md pre.md-code code { background: none; border: 0; padding: 0; color: inherit; }
.md blockquote { margin: 0; padding: 4px 14px; border-left: 3px solid var(--accent-line); color: var(--muted); }
.md hr { border: 0; border-top: 1px solid var(--line); margin: 4px 0; width: 100%; }
.md img { max-width: 100%; border-radius: 8px; }
.mermaid { border: 1px solid var(--line-strong); border-radius: 10px; background: var(--surface); overflow-x: auto; }
.mermaid[data-rendered] { padding: 16px; }
.mermaid > svg { display: block; max-width: 100%; height: auto; margin: 0 auto; }
.mermaid > pre.md-code { border-radius: 9px; }
.md-table { overflow-x: auto; border: 1px solid var(--line-strong); border-radius: 10px; }
.md table { border-collapse: collapse; width: 100%; font-size: 13.5px; }
.md th { text-align: left; font-weight: 600; color: var(--ink); background: var(--surface-2); }
.md th, .md td { padding: 8px 12px; border-bottom: 1px solid var(--line); vertical-align: top; }
.md tr:last-child td { border-bottom: 0; }

/* "Made with EventCatalog" badge */
.made-with {
  position: fixed; z-index: 25;
  right: calc(16px + env(safe-area-inset-right, 0px)); bottom: calc(16px + env(safe-area-inset-bottom, 0px));
  display: inline-flex; align-items: center; gap: 8px; padding: 6px 12px 6px 8px; border-radius: 999px;
  background: var(--surface); border: 1px solid var(--line-strong); box-shadow: var(--shadow);
  color: var(--muted); font-size: 12px; line-height: 1;
}
.made-with b { color: var(--ink); font-weight: 600; }
.made-with:hover { border-color: var(--accent-line); color: var(--muted); }
.made-with:hover b { color: var(--accent); }
.made-with svg { display: block; flex: none; color: var(--ink); }

/* Back to top, stacked above the badge */
.to-top {
  position: fixed; z-index: 25;
  right: calc(16px + env(safe-area-inset-right, 0px)); bottom: calc(60px + env(safe-area-inset-bottom, 0px));
  width: 38px; height: 38px; border-radius: 50%; display: grid; place-items: center; cursor: pointer;
  background: var(--surface); border: 1px solid var(--line-strong); box-shadow: var(--shadow); color: var(--ink);
}
.to-top:hover { border-color: var(--accent-line); color: var(--accent); }

/* specifications: a box of rows with their logos, opened in a modal */
.spec-icon { width: 18px; height: 18px; flex: none; background: center / contain no-repeat; }
.spec-row {
  display: grid; grid-template-columns: 18px minmax(0, 1fr) auto; gap: 10px; align-items: center; width: 100%;
  padding: 8px 0; border: 0; border-bottom: 1px solid var(--line); background: none; color: var(--ink);
  font: inherit; font-size: 13.5px; text-align: left; cursor: pointer;
}
.spec-row:last-of-type { border-bottom: 0; }
.spec-row:hover .spec-name { color: var(--accent); }
.spec-row.missing { cursor: default; opacity: 0.6; }
.spec-name { min-width: 0; font-weight: 500; overflow-wrap: anywhere; }
.spec-name small { display: block; font-family: var(--font-mono); font-size: 11.5px; font-weight: 400; color: var(--muted); }
.spec-type { font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.06em; color: var(--muted); }
.spec-links { display: flex; flex-wrap: wrap; gap: 6px 18px; padding-top: 2px; }
.spec-link {
  display: inline-flex; align-items: center; gap: 7px; padding: 0; border: 0; background: none; cursor: pointer;
  font: inherit; font-size: 14px; color: var(--accent);
}
.spec-link:hover { color: var(--accent-hover); text-decoration: underline; text-underline-offset: 3px; }
.spec-link small { font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.06em; color: var(--muted); }
.spec-link.missing { color: var(--muted); cursor: default; }
.spec-modal {
  position: fixed; inset: 0; z-index: 70; display: flex; align-items: center; justify-content: center;
  padding: calc(env(safe-area-inset-top, 0px) + 24px) max(16px, env(safe-area-inset-right, 0px)) calc(env(safe-area-inset-bottom, 0px) + 24px) max(16px, env(safe-area-inset-left, 0px));
}
.spec-modal-scrim { position: absolute; inset: 0; background: var(--scrim); backdrop-filter: blur(2px); }
.spec-modal-panel { position: relative; width: min(960px, 100%); max-height: 100%; display: flex; flex-direction: column; box-shadow: var(--shadow-pop); }
.spec-modal-panel .code-head { gap: 8px; }
.spec-modal-panel .code-title { text-transform: none; letter-spacing: 0; font-size: 13px; color: var(--code-text); }
.spec-modal-panel pre { max-height: none; flex: 1; min-height: 0; }

/* command palette */
.cmdk { position: fixed; inset: 0; z-index: 60; display: flex; justify-content: center; align-items: flex-start; padding: calc(env(safe-area-inset-top, 0px) + 10vh) 16px 16px; }
.cmdk-scrim { position: absolute; inset: 0; background: var(--scrim); backdrop-filter: blur(2px); }
.cmdk-panel { position: relative; width: min(620px, 100%); max-height: 70vh; display: flex; flex-direction: column; background: var(--surface); border: 1px solid var(--line-strong); border-radius: 14px; box-shadow: var(--shadow-pop); overflow: hidden; }
.cmdk-in { display: flex; align-items: center; gap: 10px; padding: 0 14px; border-bottom: 1px solid var(--line); color: var(--muted); }
.cmdk-in input { flex: 1; min-width: 0; height: 52px; border: 0; outline: 0; background: transparent; color: var(--ink); font: inherit; font-size: 16px; }
.cmdk-results { overflow-y: auto; padding: 6px; }
.cmdk-group { font-size: 11px; text-transform: uppercase; letter-spacing: 0.07em; color: var(--muted); font-weight: 600; padding: 10px 10px 4px; }
.cmdk-item { display: grid; grid-template-columns: 44px minmax(0, 1fr) auto; gap: 10px; align-items: center; padding: 8px 10px; border-radius: 8px; cursor: pointer; color: var(--ink); }
.cmdk-item[aria-selected="true"] { background: var(--accent-soft); }
.cmdk-item .k { font-family: var(--font-mono); font-size: 10.5px; font-weight: 600; text-align: center; border-radius: 5px; padding: 2px 0; border: 1px solid var(--line-strong); color: var(--muted); }
.cmdk-item .tt { min-width: 0; }
.cmdk-item .tt b { display: block; font-weight: 500; font-size: 14px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.cmdk-item .tt span { display: block; font-size: 12.5px; color: var(--muted); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.cmdk-item .dom { font-size: 12px; color: var(--muted); }
.cmdk-none { padding: 28px 16px; text-align: center; color: var(--muted); font-size: 14px; }
.cmdk-foot { display: flex; gap: 16px; padding: 8px 14px; border-top: 1px solid var(--line); font-size: 12px; color: var(--muted); background: var(--surface-2); }

/* Resource colours follow EventCatalog's visualiser: domains yellow, services pink, flows teal and so on */
${KINDS.map(
  (
    k
  ) => `.tag.${k}, .pill.${k}, .cmdk-item .k.${k} { color: var(--${k}); background: var(--${k}-bg); border-color: var(--${k}-line); }
.dot.${k} { background: var(--${k}); }
.ep-verb.${k}, .msg-link.${k} { color: var(--${k}); }`
).join('\n')}

/* responsive */
@media (max-width: 1180px) {
  .section { grid-template-columns: minmax(0, 1fr); gap: 32px; padding: 52px max(40px, env(safe-area-inset-right, 0px)) 52px 40px; }
  .group-head { padding-left: 40px; padding-right: max(40px, env(safe-area-inset-right, 0px)); }
  .col-l, .col-r { max-width: 720px; }
  .sticky { position: static; }
}
@media (max-width: 860px) {
  .shell { grid-template-columns: minmax(0, 1fr); }
  .menu-btn { display: inline-flex; }
  .sidenav {
    position: fixed; z-index: 40; left: 0; top: var(--top-h); width: min(320px, 86vw); height: calc(100% - var(--top-h));
    background: var(--bg); box-shadow: var(--shadow-pop); transform: translateX(-105%); transition: transform 0.2s ease; visibility: hidden;
  }
  .sidenav.open { transform: none; visibility: visible; }
  .nav-scrim { position: fixed; inset: 0; z-index: 35; background: var(--scrim); }
  .brand-sep, .brand-sub, .date-chip { display: none; }
  .search-btn { width: auto; flex: 1; max-width: 300px; }
}
@media (prefers-reduced-motion: reduce) { .sidenav { transition: none; } }
@media (max-width: 600px) {
  .topbar { gap: 10px; padding-inline: max(16px, env(safe-area-inset-left, 0px)) max(16px, env(safe-area-inset-right, 0px)); }
  .search-btn kbd { display: none; }
  .brand .name { display: none; }
  .section { padding: 40px max(16px, env(safe-area-inset-right, 0px)) 40px max(16px, env(safe-area-inset-left, 0px)); }
  .group-head { padding: 32px max(16px, env(safe-area-inset-right, 0px)) 14px max(16px, env(safe-area-inset-left, 0px)); }
  h1 { font-size: 28px; }
  .section h2 { font-size: 22px; }
  .two { grid-template-columns: minmax(0, 1fr); }
  /* The badge shrinks to the logo, and the page leaves room so the floating buttons never cover the last lines */
  .made-with { padding: 9px; }
  .made-with span { display: none; }
  .to-top { bottom: calc(66px + env(safe-area-inset-bottom, 0px)); }
  main { padding-bottom: 72px; }
}
`;
