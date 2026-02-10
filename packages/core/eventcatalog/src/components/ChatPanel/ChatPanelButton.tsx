import { useState, useEffect } from 'react';
import { BookOpen } from 'lucide-react';
import ChatPanel from './ChatPanel';

const ChatPanelButton = () => {
  const [isOpen, setIsOpen] = useState(false);

  // Listen for custom event to open chat panel from other components
  useEffect(() => {
    const handleOpenChat = () => {
      setIsOpen(true);
    };

    window.addEventListener('eventcatalog:open-chat', handleOpenChat);
    return () => window.removeEventListener('eventcatalog:open-chat', handleOpenChat);
  }, []);

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="flex items-center gap-1.5 px-4 py-1.5 rounded-md bg-[rgb(var(--ec-card-bg))] hover:bg-[rgb(var(--ec-content-hover))] ring-1 ring-inset ring-[rgb(var(--ec-page-border))] shadow-sm transition-colors text-sm ml-[-1px]"
        aria-label="Open AI Assistant"
      >
        <BookOpen size={14} className="text-[rgb(var(--ec-accent))]" />
        <span className="font-light text-[rgb(var(--ec-page-text-muted))]">Ask</span>
      </button>

      <ChatPanel isOpen={isOpen} onClose={() => setIsOpen(false)} />
    </>
  );
};

export default ChatPanelButton;
