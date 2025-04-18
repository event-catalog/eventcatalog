import React, { useMemo } from 'react';
import { HelpCircle } from 'lucide-react';
import * as icons from 'lucide-react'; // Import all icons
import type { ChatPromptCategoryGroup, ChatPrompt } from '@enterprise/eventcatalog-chat/utils/chat-prompts';

// Removed the static iconMap

const getCategoryIcon = (iconName?: string): React.ReactNode => {
  // Default icon component
  const DefaultIcon = icons.HelpCircle;
  const IconComponent = iconName ? (icons as any)[iconName] : DefaultIcon;

  // Render the found icon or the default one
  return IconComponent ? (
    <IconComponent size={16} className="mr-1 md:mr-2" />
  ) : (
    <DefaultIcon size={16} className="mr-1 md:mr-2" /> // Fallback just in case
  );
};

interface WelcomePromptAreaProps {
  chatPrompts: ChatPromptCategoryGroup[];
  activeCategory: string;
  setActiveCategory: (category: string) => void;
  onPromptClick: (prompt: ChatPrompt) => void;
  isProcessing: boolean; // Combined thinking/streaming state
}

const WelcomePromptArea: React.FC<WelcomePromptAreaProps> = ({
  chatPrompts,
  activeCategory,
  setActiveCategory,
  onPromptClick,
  isProcessing,
}) => {
  // Find the currently active category's questions from chatPrompts
  const activeQuestions: ChatPrompt[] = useMemo(() => {
    // Find the category group by label
    const activeGroup = chatPrompts.find((group) => group.label === activeCategory);
    // Return the items (questions) from that group, or an empty array if not found
    return activeGroup?.items || [];
  }, [activeCategory, chatPrompts]);

  return (
    <div className="h-full flex flex-col justify-center items-center px-4 pb-4 pt-0">
      {' '}
      {/* Use h-full and flex centering */}
      <div className="max-w-2xl w-full text-left">
        <h2 className="text-2xl font-semibold mb-6 text-gray-800">How can I help you?</h2>
        {/* Category Tabs - Use chatPrompts */}
        <div className="flex flex-wrap justify-left gap-2 mb-6 border-b border-gray-200 pb-4">
          {chatPrompts.map((categoryGroup) => (
            <button
              key={categoryGroup.label} // Use label as key, assuming it's unique
              onClick={() => setActiveCategory(categoryGroup.label)}
              disabled={isProcessing}
              className={`flex items-center px-3 py-2 rounded-md text-sm font-medium transition-colors duration-150 focus:outline-none focus:ring-2 focus:ring-purple-400 focus:ring-offset-2 focus:ring-offset-white disabled:opacity-50 ${
                activeCategory === categoryGroup.label
                  ? 'bg-purple-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {/* Use the icon mapping function */}
              {getCategoryIcon(categoryGroup.icon)}
              {categoryGroup.label}
            </button>
          ))}
        </div>
        {/* Questions List - Use activeQuestions derived from chatPrompts */}
        <div className="space-y-2 text-left">
          {activeQuestions.map((item, index) => (
            <button
              key={item.id || index} // Use item.id if available, otherwise index
              onClick={() => onPromptClick(item)} // Use the passed handler
              className="block w-full text-left px-3 py-2 text-gray-700 hover:bg-gray-100 rounded-md text-sm transition-colors duration-150 focus:outline-none focus:ring-1 focus:ring-purple-400 disabled:opacity-50"
              disabled={isProcessing} // Disable while processing
            >
              {/* Display the question title */}
              {item.data.title}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

export default WelcomePromptArea;
