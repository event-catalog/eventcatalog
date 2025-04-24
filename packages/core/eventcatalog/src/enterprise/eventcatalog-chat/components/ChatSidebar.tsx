import React, { useEffect } from 'react';
import { format } from 'date-fns';
import { useChat } from './hooks/ChatProvider';
import * as Dialog from '@radix-ui/react-dialog';

const Sidebar: React.FC<{}> = () => {
  const { sessions = [], currentSession, createSession, deleteSession, setCurrentSession, isStreaming } = useChat();
  const [showHelp, setShowHelp] = React.useState(false);

  useEffect(() => {
    // Check if this is the first visit after component mounts
    const hasVisited = localStorage.getItem('eventCatalogAIVisited');
    if (!hasVisited || hasVisited === 'false') {
      localStorage.setItem('eventCatalogAIVisited', 'true');
      setShowHelp(true);
    }
  }, []);

  useEffect(() => {
    if (sessions.length === 0) {
      createSession();
    }
  }, [sessions]);

  return (
    <div className="h-[calc(100vh-64px)] bg-gray-50 flex-shrink-0 border-r border-gray-200">
      <div className="w-64 bg-gray-50 border-r border-gray-200 flex flex-col h-full">
        {/* New Chat Button */}
        <div className="p-4 border-b border-gray-200">
          <div className="flex items-center justify-between gap-2">
            <button
              onClick={createSession}
              disabled={isStreaming}
              className={`flex-1 flex items-center justify-between px-3 py-2 text-sm bg-white hover:bg-gray-100 rounded-lg border border-gray-200 text-gray-700 ${isStreaming ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              <span>New chat</span>
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                <path
                  fillRule="evenodd"
                  d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z"
                  clipRule="evenodd"
                />
              </svg>
            </button>
          </div>
        </div>

        {/* Chat History */}
        <div className="flex-1 overflow-y-auto">
          <div className="p-2 space-y-2">
            <div className="text-xs text-gray-500 px-2 py-1">Your chats</div>
            <div className="space-y-1">
              {sessions.map((session) => (
                <div
                  key={session.id}
                  className={`group relative flex flex-col ${
                    currentSession?.id === session.id ? 'bg-gray-100' : 'hover:bg-gray-50'
                  } rounded-lg`}
                >
                  <button
                    onClick={(e) => deleteSession(session.id)}
                    disabled={isStreaming}
                    className={`absolute right-1 top-1 p-1.5 opacity-0 group-hover:opacity-100 transition-opacity duration-200 text-gray-400 hover:text-gray-600 ${currentSession?.id === session.id ? 'opacity-100' : ''} ${isStreaming ? 'opacity-50 cursor-not-allowed' : ''}`}
                    title="Delete chat"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor">
                      <path
                        fillRule="evenodd"
                        d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z"
                        clipRule="evenodd"
                      />
                    </svg>
                  </button>
                  <button
                    onClick={() => setCurrentSession(session)}
                    disabled={isStreaming}
                    className={`flex-1 text-left px-3 py-2 text-sm ${isStreaming ? 'opacity-50 cursor-not-allowed' : ''}`}
                  >
                    <div className="font-medium text-gray-700 pr-7">{session.title}</div>
                    <div className="flex justify-between items-center mt-1 text-xs text-gray-400">
                      <span>{session.messages.length} messages</span>
                      <span>{format(session.lastUpdated, 'dd/MM/yyyy, HH:mm:ss')}</span>
                    </div>
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Beta Message */}
        <div className="p-4 text-xs text-gray-500 border-t border-gray-200">
          <div>
            Have issues or ideas? Let us know on{' '}
            <a
              href="https://discord.com/channels/918092420338569216/1342473496957288581"
              className="text-blue-600 hover:text-blue-800 underline"
              target="_blank"
              rel="noopener noreferrer"
            >
              Discord
            </a>
            <div className="inline-block">
              <Dialog.Root open={showHelp} onOpenChange={setShowHelp}>
                <Dialog.Trigger asChild>
                  <button title="Help" className="p-1.5 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" viewBox="0 0 20 20" fill="currentColor">
                      <path
                        fillRule="evenodd"
                        d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-3a1 1 0 00-.867.5 1 1 0 11-1.731-1A3 3 0 0113 8a3.001 3.001 0 01-2 2.83V11a1 1 0 11-2 0v-1a1 1 0 011-1 1 1 0 100-2zm0 8a1 1 0 100-2 1 1 0 000 2z"
                        clipRule="evenodd"
                      />
                    </svg>
                  </button>
                </Dialog.Trigger>
                <Dialog.Portal>
                  <Dialog.Overlay className="fixed inset-0 bg-black/50 z-40" />
                  <Dialog.Content className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-white rounded-lg z-50 p-6 w-[600px] max-h-[85vh] overflow-y-auto">
                    <Dialog.Title className="text-lg font-semibold text-gray-900 mb-4">
                      Welcome to the EventCatalog AI Assistant
                    </Dialog.Title>
                    <div className="text-sm text-gray-600 space-y-4">
                      <p>
                        This is your private AI assistant for EventCatalog. All conversations are stored locally and your data
                        remains completely private.
                      </p>
                      <p>Key features:</p>
                      <ul className="list-disc pl-4 space-y-2">
                        <li>Local-first: All conversations are stored on your device only</li>
                        <li>Privacy-focused: Your data is never shared with external servers</li>
                        <li>Persistent chat history: Access your previous conversations anytime</li>
                        <li>Multiple sessions: Organize different topics in separate chats</li>
                      </ul>

                      <div className="mt-6">
                        <p className="font-medium mb-2">Example prompts you can try:</p>
                        <ul className="list-disc pl-4 space-y-2 bg-gray-50 p-4 rounded-lg">
                          <li>"I want to create a new feature, what events do we have related to Payments?"</li>
                          <li>"What domains do we have and who owns them?"</li>
                          <li>"What are the events for the X domain?"</li>
                          <li>"Create me a code snippet for this event"</li>
                        </ul>
                      </div>

                      <p className="mt-4">For additional support or feature requests, please join our Discord community.</p>
                    </div>
                    <Dialog.Close asChild>
                      <button className="absolute top-4 right-4 text-gray-400 hover:text-gray-600" aria-label="Close">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                          <path
                            fillRule="evenodd"
                            d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                            clipRule="evenodd"
                          />
                        </svg>
                      </button>
                    </Dialog.Close>
                  </Dialog.Content>
                </Dialog.Portal>
              </Dialog.Root>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Sidebar;
