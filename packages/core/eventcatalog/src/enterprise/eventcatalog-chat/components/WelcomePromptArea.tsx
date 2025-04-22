import React, { useState, useMemo } from 'react';
import * as icons from 'lucide-react'; // Import all icons
import type { ChatPromptCategoryGroup, ChatPrompt } from '@enterprise/eventcatalog-chat/utils/chat-prompts';
import { defaultPrompts } from './default-prompts';

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

// Helper function to group default prompts by category label
const groupDefaultPrompts = (prompts: ChatPrompt[]): ChatPromptCategoryGroup[] => {
  const groups: { [key: string]: { label: string; icon?: string; items: ChatPrompt[] } } = {};

  prompts.forEach((prompt) => {
    const categoryLabel = prompt.data.category.label;
    const categoryIcon = prompt.data.category.icon; // Get icon from prompt data

    if (!groups[categoryLabel]) {
      groups[categoryLabel] = { label: categoryLabel, icon: categoryIcon, items: [] };
    }
    groups[categoryLabel].items.push(prompt);
  });

  // Convert the groups object into an array matching ChatPromptCategoryGroup structure
  return Object.values(groups);
};

const WelcomePromptArea: React.FC<WelcomePromptAreaProps> = ({
  chatPrompts,
  activeCategory: activeCustomCategory, // Rename to avoid conflict
  setActiveCategory: setActiveCustomCategory, // Rename to avoid conflict
  onPromptClick,
  isProcessing,
}) => {
  // Group default prompts and derive initial state only once
  const defaultPromptGroups = useMemo(() => groupDefaultPrompts(defaultPrompts), []);
  const [activeDefaultCategory, setActiveDefaultCategory] = useState<string>(() => defaultPromptGroups[0]?.label || '');

  // Find the currently active category's questions from chatPrompts
  const activeCustomQuestions: ChatPrompt[] = useMemo(() => {
    if (!chatPrompts || chatPrompts.length === 0) return [];
    const activeGroup = chatPrompts.find((group) => group.label === activeCustomCategory);
    return activeGroup?.items || (chatPrompts[0]?.items ?? []);
  }, [activeCustomCategory, chatPrompts]);

  // Find the currently active category's default questions
  const activeDefaultQuestions: ChatPrompt[] = useMemo(() => {
    if (!defaultPromptGroups || defaultPromptGroups.length === 0) return [];
    const activeGroup = defaultPromptGroups.find((group) => group.label === activeDefaultCategory);
    return activeGroup?.items || [];
  }, [activeDefaultCategory, defaultPromptGroups]);

  return (
    <div className="h-full flex flex-col justify-center items-center px-4 pb-4 pt-0">
      <div className="max-w-2xl w-full text-left">
        <h2 className="text-2xl font-semibold mb-6 text-gray-800">How can I help you?</h2>

        {/* Conditional Rendering: Custom Prompts OR Default Prompts */}
        {chatPrompts && chatPrompts.length > 0 ? (
          /* --- CUSTOM PROMPTS UI --- */
          <>
            {/* Category Tabs - Use chatPrompts */}
            <div className="flex flex-wrap justify-left gap-2 mb-6 border-b border-gray-200 pb-4">
              {chatPrompts.map((categoryGroup) => (
                <button
                  key={categoryGroup.label}
                  onClick={() => setActiveCustomCategory(categoryGroup.label)}
                  disabled={isProcessing}
                  className={`flex items-center px-3 py-2 rounded-md text-sm font-medium transition-colors duration-150 focus:outline-none focus:ring-2 focus:ring-purple-400 focus:ring-offset-2 focus:ring-offset-white disabled:opacity-50 ${
                    activeCustomCategory === categoryGroup.label
                      ? 'bg-purple-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {getCategoryIcon(categoryGroup.icon)}
                  {categoryGroup.label}
                </button>
              ))}
            </div>
            {/* Questions List - Use activeCustomQuestions */}
            <div className="space-y-2 text-left">
              {activeCustomQuestions.map((item) => (
                <button
                  key={item.id}
                  onClick={() => onPromptClick(item)}
                  className="block w-full text-left px-3 py-2 text-gray-700 hover:bg-gray-100 rounded-md text-sm transition-colors duration-150 focus:outline-none focus:ring-1 focus:ring-purple-400 disabled:opacity-50"
                  disabled={isProcessing}
                >
                  {item.data.title}
                </button>
              ))}
            </div>
          </>
        ) : (
          /* --- DEFAULT PROMPTS UI (Grouped) --- */
          <>
            {/* Default Category Tabs - Use defaultPromptGroups */}
            <div className="flex flex-wrap justify-left gap-2 mb-6 border-b border-gray-200 pb-4">
              {defaultPromptGroups.map((categoryGroup) => (
                <button
                  key={categoryGroup.label} // Use label as key
                  onClick={() => setActiveDefaultCategory(categoryGroup.label)}
                  disabled={isProcessing}
                  className={`flex items-center px-3 py-2 rounded-md text-sm font-medium transition-colors duration-150 focus:outline-none focus:ring-2 focus:ring-purple-400 focus:ring-offset-2 focus:ring-offset-white disabled:opacity-50 ${
                    activeDefaultCategory === categoryGroup.label
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
            {/* Default Questions List - Use activeDefaultQuestions */}
            <div className="space-y-2 text-left">
              {activeDefaultQuestions.map((item) => (
                <button
                  key={item.id}
                  onClick={() => onPromptClick(item)}
                  className="block w-full text-left px-3 py-2 text-gray-700 hover:bg-gray-100 rounded-md text-sm transition-colors duration-150 focus:outline-none focus:ring-1 focus:ring-purple-400 disabled:opacity-50"
                  disabled={isProcessing}
                >
                  {item.data.title}
                </button>
              ))}
            </div>

            {/* Enhanced Bring Your Own Prompts section */}
            <div className="bg-purple-50 border border-purple-200 rounded-lg p-4 mt-6 text-gray-700 text-sm">
              <p className="flex items-center">
                <icons.Wand2 size={18} className="text-purple-600 mr-2 flex-shrink-0" /> {/* Added Icon */}
                <span>
                  Want to tailor these suggestions?{' '}
                  <a
                    href="https://www.eventcatalog.dev/docs/development/guides/eventcatlaog-chat/what-is-eventcatalog-chat"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-purple-700 hover:underline font-semibold"
                  >
                    {' '}
                    {/* Added target and rel */}
                    Bring your own prompts!
                  </a>{' '}
                  Easily configure this list with relevant questions for your teams and organization.
                </span>
              </p>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default WelcomePromptArea;
