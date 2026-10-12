/**
 * The menu at the top left, as drawing tools have it (Excalidraw's): a single menu button, opening what you can do
 * with the diagram as a whole (with shortcuts; tools for the canvas, such as notes and levels, are in the bar at the
 * top), exporting it to EventCatalog (highlighted), EventCatalog's links, the theme and usage analytics.
 * Tailwind with EventCatalog's theme variables, on Radix's dropdown menu.
 */
import { useState, type ReactNode } from 'react';
import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import {
  BookOpen,
  Download,
  Plug,
  Users,
  FolderOpen,
  ExternalLink,
  ImageDown,
  CircleHelp,
  Maximize2,
  Menu,
  Minimize2,
  Monitor,
  Moon,
  Search,
  Command as CommandIcon,
  Sun,
  Globe,
} from 'lucide-react';
import { analyticsAllowed, setAnalyticsAllowed, track } from './analytics';

export type Theme = 'light' | 'dark' | 'system';

type AppMenuProps = {
  /** How to connect an AI agent to pair with here (in the browser: in a chat, one already is) */
  onConnectAgent?: () => void;
  /** Working on this canvas together, live (in the browser): starting a room, or the one they're in */
  onLiveCollaboration?: () => void;
  onOpenFile: () => void;
  onSaveFile: () => void;
  onExportImage: () => void;
  onExport: () => void;
  onOpenInBrowser?: () => void;
  onFind: () => void;
  onCommandPalette: () => void;
  onHelp: () => void;
  fullscreen?: { active: boolean; toggle: () => void };
  theme: Theme;
  onTheme: (theme: Theme) => void;
  openLink: (url: string) => unknown;
  /** Where the menu opens (inside the view, so it's styled and sandboxed with it) */
  container: HTMLElement | null;
};

const isMac = typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.platform);
const MOD = isMac ? 'Cmd' : 'Ctrl';

const LINKS = {
  website: 'https://www.eventcatalog.dev/?utm_source=mcp-visualiser',
  docs: 'https://www.eventcatalog.dev/docs?utm_source=mcp-visualiser',
  github: 'https://github.com/event-catalog/eventcatalog',
  discord: 'https://eventcatalog.dev/discord',
  x: 'https://x.com/event_catalog',
};

// Brand marks (lucide has none)
const GitHubIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    <path d="M9 19c-4.3 1.4-4.3-2.5-6-3m12 5v-3.5c0-1 .1-1.4-.5-2 2.8-.3 5.5-1.4 5.5-6a4.6 4.6 0 0 0-1.3-3.2 4.2 4.2 0 0 0-.1-3.2s-1.1-.3-3.5 1.3a12.3 12.3 0 0 0-6.2 0C6.5 2.8 5.4 3.1 5.4 3.1a4.2 4.2 0 0 0-.1 3.2A4.6 4.6 0 0 0 4 9.5c0 4.6 2.7 5.7 5.5 6-.6.6-.6 1.2-.5 2V21" />
  </svg>
);
const DiscordIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    <path d="M8 12a1 1 0 1 0 2 0a1 1 0 0 0-2 0M14 12a1 1 0 1 0 2 0a1 1 0 0 0-2 0" />
    <path d="M15.5 17c0 1 1.5 3 2 3c1.5 0 2.833-1.667 3.5-3c.667-1.667.5-5.833-1.5-11.5c-1.457-1.015-3-1.34-4.5-1.5l-.972 1.923a11.913 11.913 0 0 0-4.053 0L9 4c-1.5.16-3.043.485-4.5 1.5c-2 5.667-2.167 9.833-1.5 11.5c.667 1.333 2 3 3.5 3c.5 0 2-2 2-3" />
    <path d="M7 16.5c3.5 1 6.5 1 10 0" />
  </svg>
);

const XIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    <path d="M4 4l11.733 16h4.267l-11.733 -16z" />
    <path d="M4 20l6.768 -6.768m2.46 -2.46l6.772 -6.772" />
  </svg>
);

export function AppMenu(props: AppMenuProps) {
  const { onConnectAgent, onLiveCollaboration, onOpenFile, onSaveFile, onExportImage, onExport, onOpenInBrowser, onFind, onCommandPalette, onHelp, fullscreen, theme, onTheme, openLink, container } = props;

  const [sharingUsage, setSharingUsage] = useState(analyticsAllowed);
  const toggleUsage = () => {
    setAnalyticsAllowed(!sharingUsage);
    setSharingUsage(!sharingUsage);
  };
  const visit = (link: keyof typeof LINKS) => () => {
    track('eventcatalog_link_clicked', { link, from: 'menu' });
    openLink(LINKS[link]);
  };

  const item = (label: ReactNode, icon: ReactNode, onSelect: () => void, shortcut?: string, highlighted = false) => (
    <DropdownMenu.Item
      onSelect={onSelect}
      className={`flex h-[34px] cursor-pointer items-center gap-3 rounded-[7px] px-2 text-sm outline-none data-highlighted:bg-[rgb(var(--ec-content-hover))]! ${
        highlighted ? 'font-semibold text-[rgb(var(--ec-accent))]' : 'text-[rgb(var(--ec-page-text))]'
      }`}
    >
      <span className="flex flex-none [&_svg]:h-[17px] [&_svg]:w-[17px] [&_svg]:stroke-[1.75]">{icon}</span>
      <span className="min-w-0 flex-1 truncate">{label}</span>
      {shortcut && <span className="flex-none text-xs font-normal text-[rgb(var(--ec-page-text-muted))]">{shortcut}</span>}
    </DropdownMenu.Item>
  );

  return (
    <DropdownMenu.Root modal={false}>
      <DropdownMenu.Trigger asChild>
        <button
          type="button"
          aria-label="Menu"
          title="Menu"
          className="inline-flex h-[38px] w-[38px] items-center justify-center rounded-[9px] border border-[rgb(var(--ec-page-border))] bg-[rgb(var(--ec-card-bg))] text-[rgb(var(--ec-page-text))] shadow-sm transition-colors hover:bg-[rgb(var(--ec-content-hover))]! data-[state=open]:bg-[rgb(var(--ec-content-hover))]!"
        >
          <Menu aria-hidden className="h-[18px] w-[18px]" />
        </button>
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal container={container}>
        <DropdownMenu.Content
          side="bottom"
          align="start"
          sideOffset={8}
          collisionPadding={12}
          className="z-[60] w-[272px] rounded-xl border border-[rgb(var(--ec-page-border))] bg-[rgb(var(--ec-card-bg))] p-2 font-[Inter,ui-sans-serif,system-ui,sans-serif] text-[rgb(var(--ec-page-text))] shadow-[0_12px_32px_rgb(0_0_0/0.12),0_2px_6px_rgb(0_0_0/0.05)]"
        >
          {item('Open…', <FolderOpen />, onOpenFile, `${MOD}+O`)}
          {item('Save to file…', <Download />, onSaveFile, `${MOD}+S`)}
          {item('Export image…', <ImageDown />, onExportImage, `${MOD}+Shift+E`)}
          {onLiveCollaboration && item('Live collaboration…', <Users />, onLiveCollaboration)}
          {onOpenInBrowser && item('Open in browser', <ExternalLink />, onOpenInBrowser)}
          {item('Command palette', <CommandIcon />, onCommandPalette, `${MOD}+K`)}
          {item('Find on canvas', <Search />, onFind, `${MOD}+F`)}
          {onConnectAgent && item('Connect your AI agent…', <Plug />, onConnectAgent)}
          {item('Help', <CircleHelp />, onHelp, '?')}
          {fullscreen && item(fullscreen.active ? 'Exit full screen' : 'Full screen', fullscreen.active ? <Minimize2 /> : <Maximize2 />, fullscreen.toggle)}
          {item('Export to EventCatalog', <BookOpen />, onExport, undefined, true)}

          <DropdownMenu.Separator className="mx-1 my-2 h-px bg-[rgb(var(--ec-page-border))]" />
          {item('EventCatalog', <Globe />, visit('website'))}
          {item('Documentation', <BookOpen />, visit('docs'))}
          {item('GitHub', <GitHubIcon />, visit('github'))}
          {item('Discord chat', <DiscordIcon />, visit('discord'))}
          {item('Follow us', <XIcon />, visit('x'))}

          <DropdownMenu.Separator className="mx-1 my-2 h-px bg-[rgb(var(--ec-page-border))]" />
          <div className="flex items-center justify-between px-2 py-0.5 text-sm">
            <span>Theme</span>
            <div role="radiogroup" aria-label="Theme" className="inline-flex gap-0.5 rounded-[9px] border border-[rgb(var(--ec-page-border))] p-[3px]">
              {(
                [
                  ['light', <Sun key="light" />, 'Light'],
                  ['dark', <Moon key="dark" />, 'Dark'],
                  ['system', <Monitor key="system" />, 'System'],
                ] as const
              ).map(([value, icon, label]) => (
                <button
                  key={value}
                  type="button"
                  role="radio"
                  aria-checked={theme === value}
                  title={label}
                  onClick={() => onTheme(value)}
                  className="inline-flex h-7 w-[34px] items-center justify-center rounded-md text-[rgb(var(--ec-page-text-muted))] hover:text-[rgb(var(--ec-page-text))]! aria-checked:bg-[rgb(var(--ec-primary-bg))]! aria-checked:text-[rgb(var(--ec-primary-text))]! [&_svg]:h-[15px] [&_svg]:w-[15px]"
                >
                  {icon}
                </button>
              ))}
            </div>
          </div>
          {/* Anonymous usage (what's used, never what's on the canvas): on unless the browser asks not to be tracked */}
          <div className="flex items-center justify-between px-2 pb-0.5 pt-2 text-sm">
            <span title="Anonymous: which features are used, never what's on your canvas">Usage analytics</span>
            <button
              type="button"
              role="switch"
              aria-checked={sharingUsage}
              aria-label="Share anonymous usage analytics"
              title="Anonymous: which features are used, never what's on your canvas"
              onClick={toggleUsage}
              className="relative inline-flex h-5 w-9 flex-none items-center rounded-full bg-[rgb(var(--ec-page-border))] transition-colors aria-checked:bg-[rgb(var(--ec-primary-bg))]!"
            >
              <span
                aria-hidden
                className={`inline-block h-4 w-4 rounded-full bg-white shadow transition-transform ${sharingUsage ? 'translate-x-[18px]' : 'translate-x-0.5'}`}
              />
            </button>
          </div>
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}
