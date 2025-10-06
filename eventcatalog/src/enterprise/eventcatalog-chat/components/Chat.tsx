import Sidebar from './ChatSidebar';
import { ChatProvider } from './hooks/ChatProvider';
import ChatWindowServer from './windows/ChatWindow.server';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ChatPromptCategoryGroup } from '@enterprise/eventcatalog-chat/utils/chat-prompts';
interface Resource {
  id: string;
  type: string;
  name: string;
}

/**
 * Chat component has two modes:
 * - Server: ChatWindow.server.tsx (uses server-side code, bring your own API key)
 *
 * The mode is determined by the config.output property in the eventcatalog.config.js file.
 */

const Chat = ({
  chatConfig,
  resources,
  chatPrompts,
  output,
}: {
  chatConfig: any;
  resources: Resource[];
  chatPrompts: ChatPromptCategoryGroup[];
  output: 'static' | 'server';
}) => {
  const queryClient = new QueryClient();

  if (output !== 'server') {
    return (
      // Message to turn on server side
      <div className="flex justify-center items-center h-full bg-gray-100 p-4 rounded-lg text-center">
        <div className="space-y-4">
          <h1 className="text-3xl font-semibold text-gray-800">Chat is only supported on server side</h1>
          <p className="text-sm text-gray-500">
            Please switch to server side by setting the <code className="font-mono bg-gray-100 p-0.5 rounded">output</code>{' '}
            property to <code className="font-mono bg-gray-100 p-0.5 rounded">server</code> in your{' '}
            <code className="font-mono bg-gray-100 p-0.5 rounded">eventcatalog.config.js</code> file.
          </p>
        </div>
      </div>
    );
  }

  return (
    <ChatProvider>
      <div className="flex overflow-hidden w-full">
        <Sidebar />
        <QueryClientProvider client={queryClient}>
          <ChatWindowServer {...chatConfig} resources={resources} chatPrompts={chatPrompts} />
        </QueryClientProvider>
      </div>
    </ChatProvider>
  );
};

export default Chat;
