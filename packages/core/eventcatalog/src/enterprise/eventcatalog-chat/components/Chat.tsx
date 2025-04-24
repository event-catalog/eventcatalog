import Sidebar from './ChatSidebar';
import { ChatProvider } from './hooks/ChatProvider';
import ChatWindowWebLLM from './windows/ChatWindow.client';
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
 * - Client: ChatWindow.client.tsx (uses webllm)
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

  return (
    <ChatProvider>
      <div className="flex overflow-hidden w-full">
        <Sidebar />
        {output === 'server' ? (
          <QueryClientProvider client={queryClient}>
            <ChatWindowServer {...chatConfig} resources={resources} chatPrompts={chatPrompts} />
          </QueryClientProvider>
        ) : (
          <ChatWindowWebLLM {...chatConfig} />
        )}
      </div>
    </ChatProvider>
  );
};

export default Chat;
