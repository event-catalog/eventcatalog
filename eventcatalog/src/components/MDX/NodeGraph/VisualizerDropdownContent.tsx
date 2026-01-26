import React, { type RefObject } from 'react';
import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import { Code, Share2, Search, Grid3x3, Maximize2, Map, Sparkles, Zap, EyeOff, ExternalLink } from 'lucide-react';
import { DocumentArrowDownIcon, PresentationChartLineIcon } from '@heroicons/react/24/outline';
import type { VisualiserSearchRef } from './VisualiserSearch';

interface VisualizerDropdownContentProps {
  isMermaidView: boolean;
  setIsMermaidView: (value: boolean) => void;
  animateMessages: boolean;
  toggleAnimateMessages: () => void;
  hideChannels: boolean;
  toggleChannelsVisibility: () => void;
  hasChannels: boolean;
  showMinimap: boolean;
  setShowMinimap: (value: boolean) => void;
  handleFitView: () => void;
  searchRef: RefObject<VisualiserSearchRef | null>;
  isChatEnabled: boolean;
  openChat: () => void;
  handleCopyArchitectureCode: () => void;
  handleExportVisual: () => void;
  setIsShareModalOpen: (value: boolean) => void;
  toggleFullScreen: () => void;
  openStudioModal: () => void;
}

const VisualizerDropdownContent: React.FC<VisualizerDropdownContentProps> = ({
  isMermaidView,
  setIsMermaidView,
  animateMessages,
  toggleAnimateMessages,
  hideChannels,
  toggleChannelsVisibility,
  hasChannels,
  showMinimap,
  setShowMinimap,
  handleFitView,
  searchRef,
  isChatEnabled,
  openChat,
  handleCopyArchitectureCode,
  handleExportVisual,
  setIsShareModalOpen,
  toggleFullScreen,
  openStudioModal,
}) => {
  return (
    <>
      {/* Canvas Settings Submenu */}
      <DropdownMenu.Sub>
        <DropdownMenu.SubTrigger className="flex items-center px-3 py-2 text-xs text-[rgb(var(--ec-page-text))] hover:bg-[rgb(var(--ec-accent-subtle)/0.3)] cursor-pointer transition-colors gap-2 outline-none">
          <Grid3x3 className="w-3.5 h-3.5 text-[rgb(var(--ec-page-text-muted))] flex-shrink-0" />
          <span className="flex-1 font-normal">Canvas</span>
          <svg className="w-3 h-3 text-[rgb(var(--ec-page-text-muted))]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </DropdownMenu.SubTrigger>
        <DropdownMenu.Portal>
          <DropdownMenu.SubContent
            className="min-w-[200px] bg-[rgb(var(--ec-card-bg))] rounded-lg shadow-xl border border-[rgb(var(--ec-page-border))] py-1.5 z-[60]"
            sideOffset={8}
            alignOffset={-8}
          >
            <DropdownMenu.CheckboxItem
              checked={isMermaidView}
              onCheckedChange={setIsMermaidView}
              className="flex items-center px-3 py-2 text-xs text-[rgb(var(--ec-page-text))] hover:bg-[rgb(var(--ec-accent-subtle)/0.3)] cursor-pointer transition-colors gap-2"
            >
              <Code className="w-3.5 h-3.5 text-[rgb(var(--ec-page-text-muted))] flex-shrink-0" />
              <span className="flex-1 font-normal">Render as mermaid</span>
              <div
                className={`w-7 h-4 rounded-full transition-all duration-200 flex-shrink-0 relative ${isMermaidView ? 'bg-[rgb(var(--ec-accent))]' : 'bg-[rgb(var(--ec-page-border))]'}`}
              >
                <div
                  className={`absolute top-0.5 w-3 h-3 rounded-full bg-white shadow-sm transition-all duration-200 ${isMermaidView ? 'left-3.5' : 'left-0.5'}`}
                />
              </div>
            </DropdownMenu.CheckboxItem>

            <DropdownMenu.Separator className="my-1 h-px bg-[rgb(var(--ec-page-border))]" />

            <DropdownMenu.CheckboxItem
              checked={animateMessages}
              onCheckedChange={toggleAnimateMessages}
              className="flex items-center px-3 py-2 text-xs text-[rgb(var(--ec-page-text))] hover:bg-[rgb(var(--ec-accent-subtle)/0.3)] cursor-pointer transition-colors gap-2"
            >
              <Zap className="w-3.5 h-3.5 text-[rgb(var(--ec-page-text-muted))] flex-shrink-0" />
              <span className="flex-1 font-normal">Simulate Messages</span>
              <div
                className={`w-7 h-4 rounded-full transition-all duration-200 flex-shrink-0 relative ${animateMessages ? 'bg-[rgb(var(--ec-accent))]' : 'bg-[rgb(var(--ec-page-border))]'}`}
              >
                <div
                  className={`absolute top-0.5 w-3 h-3 rounded-full bg-white shadow-sm transition-all duration-200 ${animateMessages ? 'left-3.5' : 'left-0.5'}`}
                />
              </div>
            </DropdownMenu.CheckboxItem>

            {hasChannels && (
              <DropdownMenu.CheckboxItem
                checked={hideChannels}
                onCheckedChange={toggleChannelsVisibility}
                className="flex items-center px-3 py-2 text-xs text-[rgb(var(--ec-page-text))] hover:bg-[rgb(var(--ec-accent-subtle)/0.3)] cursor-pointer transition-colors gap-2"
              >
                <EyeOff className="w-3.5 h-3.5 text-[rgb(var(--ec-page-text-muted))] flex-shrink-0" />
                <span className="flex-1 font-normal">Hide channels</span>
                <div
                  className={`w-7 h-4 rounded-full transition-all duration-200 flex-shrink-0 relative ${hideChannels ? 'bg-[rgb(var(--ec-accent))]' : 'bg-[rgb(var(--ec-page-border))]'}`}
                >
                  <div
                    className={`absolute top-0.5 w-3 h-3 rounded-full bg-white shadow-sm transition-all duration-200 ${hideChannels ? 'left-3.5' : 'left-0.5'}`}
                  />
                </div>
              </DropdownMenu.CheckboxItem>
            )}

            <DropdownMenu.CheckboxItem
              checked={showMinimap}
              onCheckedChange={setShowMinimap}
              className="flex items-center px-3 py-2 text-xs text-[rgb(var(--ec-page-text))] hover:bg-[rgb(var(--ec-accent-subtle)/0.3)] cursor-pointer transition-colors gap-2"
            >
              <Map className="w-3.5 h-3.5 text-[rgb(var(--ec-page-text-muted))] flex-shrink-0" />
              <span className="flex-1 font-normal">Show minimap</span>
              <div
                className={`w-7 h-4 rounded-full transition-all duration-200 flex-shrink-0 relative ${showMinimap ? 'bg-[rgb(var(--ec-accent))]' : 'bg-[rgb(var(--ec-page-border))]'}`}
              >
                <div
                  className={`absolute top-0.5 w-3 h-3 rounded-full bg-white shadow-sm transition-all duration-200 ${showMinimap ? 'left-3.5' : 'left-0.5'}`}
                />
              </div>
            </DropdownMenu.CheckboxItem>

            <DropdownMenu.Separator className="my-1 h-px bg-[rgb(var(--ec-page-border))]" />

            <DropdownMenu.Item
              onClick={handleFitView}
              className="px-3 py-2 text-xs text-[rgb(var(--ec-page-text))] hover:bg-[rgb(var(--ec-accent-subtle)/0.3)] cursor-pointer flex items-center gap-2 transition-colors"
            >
              <Maximize2 className="w-3.5 h-3.5 text-[rgb(var(--ec-page-text-muted))] flex-shrink-0" />
              <span className="flex-1 font-normal">Fit to view</span>
            </DropdownMenu.Item>

            <DropdownMenu.Item
              onClick={() => {
                searchRef.current?.hideSuggestions();
                setTimeout(() => {
                  const searchInput = document.querySelector('input[placeholder="Search nodes..."]') as HTMLInputElement;
                  searchInput?.focus();
                }, 50);
              }}
              className="px-3 py-2 text-xs text-[rgb(var(--ec-page-text))] hover:bg-[rgb(var(--ec-accent-subtle)/0.3)] cursor-pointer flex items-center gap-2 transition-colors"
            >
              <Search className="w-3.5 h-3.5 text-[rgb(var(--ec-page-text-muted))] flex-shrink-0" />
              <span className="flex-1 font-normal">Find on canvas</span>
            </DropdownMenu.Item>
          </DropdownMenu.SubContent>
        </DropdownMenu.Portal>
      </DropdownMenu.Sub>

      {/* Ask AI */}
      {isChatEnabled && (
        <>
          <DropdownMenu.Separator className="my-1 h-px bg-[rgb(var(--ec-page-border))]" />
          <DropdownMenu.Item
            onClick={openChat}
            className="px-3 py-2 text-xs text-[rgb(var(--ec-page-text))] hover:bg-[rgb(var(--ec-accent-subtle)/0.3)] cursor-pointer flex items-center gap-2 transition-colors"
          >
            <Sparkles className="w-3.5 h-3.5 text-[rgb(var(--ec-page-text-muted))] flex-shrink-0" />
            <span className="flex-1 font-normal">Ask a question</span>
          </DropdownMenu.Item>
        </>
      )}

      {/* Export Items */}
      <DropdownMenu.Separator className="my-1 h-px bg-[rgb(var(--ec-page-border))]" />
      <DropdownMenu.Item
        onClick={handleCopyArchitectureCode}
        className="px-3 py-2 text-xs text-[rgb(var(--ec-page-text))] hover:bg-[rgb(var(--ec-accent-subtle)/0.3)] cursor-pointer flex items-center gap-2 transition-colors"
      >
        <Code className="w-3.5 h-3.5 text-[rgb(var(--ec-page-text-muted))] flex-shrink-0" />
        <span className="flex-1 font-normal">Copy as mermaid</span>
      </DropdownMenu.Item>

      <DropdownMenu.Item
        onClick={handleExportVisual}
        className="px-3 py-2 text-xs text-[rgb(var(--ec-page-text))] hover:bg-[rgb(var(--ec-accent-subtle)/0.3)] cursor-pointer flex items-center gap-2 transition-colors"
      >
        <DocumentArrowDownIcon className="w-3.5 h-3.5 text-[rgb(var(--ec-page-text-muted))] flex-shrink-0" />
        <span className="flex-1 font-normal">Export image</span>
      </DropdownMenu.Item>

      {/* Share Link */}
      <DropdownMenu.Item
        onClick={() => setIsShareModalOpen(true)}
        className="px-3 py-2 text-xs text-[rgb(var(--ec-page-text))] hover:bg-[rgb(var(--ec-accent-subtle)/0.3)] cursor-pointer flex items-center gap-2 transition-colors"
      >
        <Share2 className="w-3.5 h-3.5 text-[rgb(var(--ec-page-text-muted))] flex-shrink-0" />
        <span className="flex-1 font-normal">Share Link</span>
      </DropdownMenu.Item>

      {/* Start Presentation */}
      <DropdownMenu.Separator className="my-1 h-px bg-[rgb(var(--ec-page-border))]" />
      <DropdownMenu.Item
        onClick={toggleFullScreen}
        className="px-3 py-2 text-xs text-[rgb(var(--ec-page-text))] hover:bg-[rgb(var(--ec-accent-subtle)/0.3)] cursor-pointer flex items-center gap-2 transition-colors"
      >
        <PresentationChartLineIcon className="w-3.5 h-3.5 text-[rgb(var(--ec-page-text-muted))] flex-shrink-0" />
        <span className="flex-1 font-normal">Start Presentation</span>
      </DropdownMenu.Item>

      {/* Open in EventCatalog Studio */}
      <DropdownMenu.Separator className="my-1 h-px bg-[rgb(var(--ec-page-border))]" />
      <DropdownMenu.Item
        onClick={openStudioModal}
        className="px-3 py-2 text-xs text-[rgb(var(--ec-page-text))] hover:bg-[rgb(var(--ec-accent-subtle)/0.3)] cursor-pointer flex items-center gap-2 transition-colors"
      >
        <ExternalLink className="w-3.5 h-3.5 text-[rgb(var(--ec-page-text-muted))] flex-shrink-0" />
        <span className="flex-1 font-normal">Open in EventCatalog Studio</span>
      </DropdownMenu.Item>
    </>
  );
};

export default VisualizerDropdownContent;
