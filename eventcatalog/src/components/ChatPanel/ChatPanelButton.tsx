import { useState } from 'react';
import { BookOpen } from 'lucide-react';
import ChatPanel from './ChatPanel';

const ChatPanelButton = () => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="flex items-center gap-1.5 px-4 py-1.5 rounded-md bg-white hover:bg-gray-50 ring-1 ring-inset ring-gray-300 shadow-sm transition-colors text-sm ml-[-1px]"
        aria-label="Open AI Assistant"
      >
        <BookOpen size={14} className="text-purple-500" />
        <span className="font-light text-gray-600">Ask</span>
      </button>

      <ChatPanel isOpen={isOpen} onClose={() => setIsOpen(false)} />
    </>
  );
};

export default ChatPanelButton;
