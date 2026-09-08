import { useState, useEffect, useRef, useCallback } from 'react';
import { Sparkles } from 'lucide-react';
import ChatPanel from './ChatPanel';

const ChatPanelButton = ({ configured = false }: { configured?: boolean }) => {
  const [isOpen, setIsOpen] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const closePanel = useCallback(() => {
    setIsOpen(false);
    buttonRef.current?.focus();
  }, []);
  const [shortcut, setShortcut] = useState('⌘I');

  // Listen for custom event to open chat panel from other components
  useEffect(() => {
    const handleOpenChat = () => {
      setIsOpen(true);
    };

    setShortcut(/Mac|iPhone|iPad/.test(navigator.platform) ? '⌘I' : 'Ctrl I');
    const handleShortcut = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && !event.altKey && !event.shiftKey && event.key.toLowerCase() === 'i') {
        event.preventDefault();
        setIsOpen(true);
      }
    };
    window.addEventListener('keydown', handleShortcut);
    window.addEventListener('eventcatalog:open-chat', handleOpenChat);
    return () => {
      window.removeEventListener('keydown', handleShortcut);
      window.removeEventListener('eventcatalog:open-chat', handleOpenChat);
    };
  }, []);

  return (
    <>
      <button
        ref={buttonRef}
        onClick={() => setIsOpen(true)}
        className="flex h-9 shrink-0 items-center justify-center gap-1.5 whitespace-nowrap px-4 rounded-md bg-[rgb(var(--ec-card-bg))] hover:bg-[rgb(var(--ec-content-hover))] ring-1 ring-inset ring-[rgb(var(--ec-page-border))] shadow-xs transition-colors text-sm"
        aria-label="Open AI Assistant"
        aria-keyshortcuts="Meta+i Control+i"
        title={`Open Event Catalog Assistant (${shortcut})`}
      >
        <Sparkles size={16} className="shrink-0 text-gray-500" aria-hidden="true" />
        <span className="font-light text-gray-500">Ask</span>
      </button>

      <ChatPanel configured={configured} isOpen={isOpen} onClose={closePanel} />
    </>
  );
};

export default ChatPanelButton;
