import { useEffect, useState, useRef, useCallback, useMemo } from 'react';
import { Send } from 'lucide-react';
import { useChat, type Message } from '../hooks/ChatProvider';
import React from 'react';
import MentionInput from '../MentionInput';
import InputModal from '../InputModal';
import type { ChatPromptCategoryGroup, ChatPrompt } from '@enterprise/eventcatalog-chat/utils/chat-prompts';
import WelcomePromptArea from '../WelcomePromptArea';
import ChatMessage from '../ChatMessage'; // Import the new component
import { useChat as useAiChat, type UIMessage } from '@ai-sdk/react';

// Update Message type to include resources
interface Resource {
  id: string;
  type: string;
  url: string;
  title?: string;
  name?: string;
}

interface ChatWindowProps {
  model?: string;
  provider?: string;
  embeddingModel?: string;
  max_tokens?: number;
  similarityResults?: number;
  resources: Resource[];
  chatPrompts: ChatPromptCategoryGroup[];
}

const ChatWindow = ({
  model = 'o4-mini',
  embeddingModel = 'text-embedding-3-large',
  provider = 'openai',
  max_tokens = 4096,
  similarityResults = 50,
  resources: mentionInputResources = [],
  chatPrompts,
}: ChatWindowProps) => {
  // const [messages] = useState<Array<Message>>([]);
  const [inputValue, setInputValue] = useState('');
  const outputRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [activeCategory, setActiveCategory] = useState<string>(chatPrompts?.[0]?.label || '');

  const { messages, sendMessage, stop, status, setMessages: setAiMessages } = useAiChat();
  const isStreaming = status === 'streaming' && messages.length > 0;
  const isThinking = status === 'submitted' || (status === 'streaming' && messages.length === 0);

  // --- New state for input modal ---
  const [promptForInput, setPromptForInput] = useState<ChatPrompt | null>(null);
  const [isInputModalOpen, setIsInputModalOpen] = useState(false);
  // --- End new state ---

  const { currentSession, storeMessagesToSession, updateSession, createSession } = useChat();

  // If the messages change add them to the session
  useEffect(() => {
    if (currentSession) {
      storeMessagesToSession(currentSession.id, messages);
    }
  }, [messages]);

  // Load messages when session changes
  useEffect(() => {
    if (currentSession) {
      setAiMessages(currentSession.messages as unknown as UIMessage[]);
    }
  }, [currentSession]);

  // Add effect to focus input when streaming stops
  useEffect(() => {
    if (!isStreaming && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isStreaming]);

  // New function to handle submitting a question (user input or predefined)
  const submitQuestion = useCallback(
    async (question: string, additionalContext?: string) => {
      if (!question.trim() || isStreaming || isThinking) return;

      const userMessage: Message = { content: question, isUser: true, timestamp: Date.now(), additionalContext };
      const isFirstMessage = messages.length === 0;

      // setMessages((prev) => [...prev, userMessage]);
      // setShowWelcome(false);
      setInputValue('');

      // Scroll to bottom immediately after adding user message and setting thinking state
      requestAnimationFrame(() => scrollToBottom(false));

      if (currentSession && isFirstMessage) {
        updateSession({
          ...currentSession,
          // Use the submitted question (potentially the prompt title) for the session title
          title: question.length > 25 ? `${question.substring(0, 22)}...` : question,
        });
      }

      sendMessage({ text: additionalContext || question });

      // mutation.mutate({ question, additionalContext });
    },
    [
      currentSession,
      updateSession,
      // setMessages,
      setInputValue,
      messages.length,
      isStreaming,
      isThinking,
      messages,
    ]
  );

  // --- New handler for submitting from the modal ---
  const handleSubmitWithInputs = useCallback(
    (prompt: ChatPrompt, inputValues: Record<string, string>) => {
      let finalBody = prompt.body || ''; // Start with the original body
      // Ensure prompt and prompt.data exist before accessing properties
      if (!prompt || !prompt.data) {
        console.error('handleSubmitWithInputs called without a valid prompt.');
        setIsInputModalOpen(false); // Close modal even on error
        setPromptForInput(null);
        return;
      }

      for (const [key, value] of Object.entries(inputValues)) {
        const placeholder = `{{${key}}}`;
        // Replace all occurrences of the placeholder in the body
        finalBody = finalBody.replaceAll(placeholder, `"${value}"`);
      }

      // Submit the processed title and the processed body as additional context
      submitQuestion(prompt.data.title, finalBody);

      setIsInputModalOpen(false); // Close modal
      setPromptForInput(null); // Clear stored prompt
    },
    [submitQuestion]
  );

  // --- Modified handler for clicking a predefined question ---
  const handlePredefinedQuestionClick = useCallback(
    (prompt: ChatPrompt) => {
      // Ensure prompt and prompt.data exist
      if (!prompt || !prompt.data) {
        console.error('handlePredefinedQuestionClick called with invalid prompt:', prompt);
        return;
      }
      // Check if prompt.data and prompt.data.inputs exist and have length > 0
      if (prompt.data?.inputs && prompt.data.inputs.length > 0) {
        setPromptForInput(prompt); // Store the prompt
        setIsInputModalOpen(true); // Open the modal
      } else {
        // No inputs needed, submit directly using title and body
        submitQuestion(prompt.data.title, prompt.body);
      }
    },
    [submitQuestion]
  );

  // Handler for standard input submission
  const handleSubmit = useCallback(
    (e?: React.FormEvent) => {
      e?.preventDefault();
      // sendMessage({ text: inputValue });
      submitQuestion(inputValue); // Use standard input value, no additional context here
    },
    [inputValue, sendMessage]
  );

  // Add new function to handle smooth scrolling
  const scrollToBottom = useCallback((smooth = true) => {
    if (outputRef.current) {
      outputRef.current.scrollTo({
        top: outputRef.current.scrollHeight,
        behavior: smooth ? 'smooth' : 'auto',
      });
    }
  }, []);

  // Add effect to scroll when messages change or thinking state changes
  useEffect(() => {
    // Scroll immediately for new messages or when thinking starts/stops
    requestAnimationFrame(() => scrollToBottom(messages.length > 0 && !isThinking));
  }, [messages, isThinking, scrollToBottom]);

  // Memoize the messages list with the new ChatMessage component
  const messagesList = useMemo(
    () => (
      <div className="space-y-4 max-w-[900px] mx-auto pb-6">
        {messages.map((message, index) => (
          <ChatMessage
            key={message.id}
            message={{
              isUser: message.role === 'user',
              content: message.parts.map((part) => (part.type === 'text' ? part.text : '')).join(''),
              timestamp: Date.now(),
            }}
          />
        ))}
        {isThinking && (
          <div className="flex justify-start mb-4">
            <div className="flex items-center space-x-2 max-w-[80%] rounded-lg p-3 bg-gray-100 text-gray-800 rounded-bl-none">
              <div className="flex space-x-1">
                <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
              </div>
            </div>
          </div>
        )}
      </div>
    ),
    [messages, isThinking]
  );

  // Memoize the input change handler
  const handleInputChange = useCallback((newValue: string) => {
    setInputValue(newValue);
  }, []);

  // Memoize the key press handler for MentionInput
  const handleInputKeyPress = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      // Submit only if Enter is pressed WITHOUT Shift and suggestions are NOT shown
      if (e.key === 'Enter' && !e.shiftKey) {
        // The MentionInput's internal onKeyDown will handle preventDefault
        // if suggestions are shown and Enter is pressed for selection.
        // We check here if it *wasn't* handled for selection, meaning we should submit.
        if (!e.defaultPrevented) {
          handleSubmit();
        }
      }
    },
    [handleSubmit]
  ); // Include handleSubmit in dependencies

  // Effect to update activeCategory if chatPrompts load after initial render
  useEffect(() => {
    if (!activeCategory && chatPrompts && chatPrompts.length > 0) {
      setActiveCategory(chatPrompts[0].label);
    }
  }, [chatPrompts, activeCategory]);

  // Add Effect for clipboard copy functionality
  useEffect(() => {
    const outputElement = outputRef.current;
    if (!outputElement) return;

    const handleClick = async (event: MouseEvent) => {
      const button = (event.target as Element).closest<HTMLButtonElement>('[data-copy-button="true"]');
      if (!button) return;

      const codeToCopy = button.dataset.code;
      if (!codeToCopy) return;

      try {
        await navigator.clipboard.writeText(codeToCopy);
        // Visual feedback: change icon to Check for a short time
        const originalIcon = button.innerHTML;
        button.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-check"><polyline points="20 6 9 17 4 12"></polyline></svg>`;
        button.disabled = true;

        setTimeout(() => {
          button.innerHTML = originalIcon;
          button.disabled = false;
        }, 1500); // Reset after 1.5 seconds
      } catch (err) {
        console.error('Failed to copy code: ', err);
        // Optional: Provide error feedback to the user
        const originalTitle = button.title;
        button.title = 'Failed to copy!';
        setTimeout(() => {
          button.title = originalTitle;
        }, 1500);
      }
    };

    outputElement.addEventListener('click', handleClick);

    // Cleanup listener on component unmount
    return () => {
      outputElement.removeEventListener('click', handleClick);
    };
  }, []); // Empty dependency array ensures this runs only once on mount

  // Handle the query from the url
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const query = urlParams.get('query');
    if (query) {
      setTimeout(() => {
        createSession();
        setInputValue(query);
      }, 250);
    }
  }, []);

  return (
    <div className="flex-1 flex flex-col overflow-hidden h-[calc(100vh-60px)] w-full bg-white">
      {messages.length === 0 && (
        <WelcomePromptArea
          chatPrompts={chatPrompts}
          activeCategory={activeCategory}
          setActiveCategory={setActiveCategory}
          onPromptClick={handlePredefinedQuestionClick}
          isProcessing={isStreaming || isThinking}
        />
      )}

      {messages.length > 0 && (
        <div ref={outputRef} className="flex-1 overflow-y-auto">
          {messages.length > 0 && (
            <div id="output" className="p-4 space-y-4 w-full max-w-[900px] mx-auto h-full pb-16">
              {messagesList}
            </div>
          )}
          ;
        </div>
      )}

      {/* Input Area (remains at the bottom) */}
      <div className="border-t border-gray-200 p-4 bg-white">
        <div className="max-w-[900px] mx-auto relative">
          {/* Replace standard input with MentionInput */}
          <MentionInput
            suggestions={mentionInputResources.map((resource) => ({
              id: resource.id,
              name: resource.name || '',
              type: resource.type,
            }))}
            trigger="@"
            type="text"
            value={inputValue}
            onChange={handleInputChange}
            onKeyDown={handleInputKeyPress}
            placeholder="Type your message or '@' for events..."
            className="w-full px-4 py-3 bg-white text-gray-800 rounded-lg border border-gray-200 focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 disabled:bg-gray-50 disabled:cursor-not-allowed pr-24"
            disabled={isStreaming || isThinking} // Disable input while streaming/thinking
          />
          <div className="absolute right-3 top-1/2 -translate-y-1/2">
            {isStreaming ? (
              <button
                onClick={() => stop()}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 text-sm font-medium"
              >
                Stop
              </button>
            ) : (
              <button
                onClick={handleSubmit}
                disabled={!inputValue.trim() || isThinking} // Disable send if input empty or thinking
                className="px-4 py-2 flex items-center bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:bg-gray-200 disabled:cursor-not-allowed text-sm font-medium"
              >
                {/* Add icon */}
                <Send size={16} strokeWidth={1.5} className="mr-2" />
                Send
              </button>
            )}
          </div>
        </div>
        <div className="max-w-[900px] mx-auto flex justify-between">
          {/* show what model is loaded */}
          <p className="text-[10px] text-gray-400 mt-2">
            Provider: {provider.charAt(0).toUpperCase() + provider.slice(1)} | Model: {model}
            {/* Embedding Model: {embeddingModel} */}
          </p>
          <p className="text-xs text-gray-500 mt-2">EventCatalog Chat can make mistakes. Check important info.</p>
        </div>
      </div>

      {/* --- Render Input Modal --- */}
      <InputModal
        isOpen={isInputModalOpen}
        onClose={() => setIsInputModalOpen(false)} // Allow closing the modal
        prompt={promptForInput}
        onSubmit={handleSubmitWithInputs}
        resources={mentionInputResources} // Pass resources here
      />
    </div>
  );
};

export default ChatWindow;
