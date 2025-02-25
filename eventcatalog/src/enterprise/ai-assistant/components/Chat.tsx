import Sidebar from './ChatSidebar';
import { ChatProvider } from './hooks/ChatProvider';
import ChatWindow from './ChatWindow';

const Chat = ({ catalogPath }: { catalogPath: string }) => {
  return (
    <ChatProvider>
      <div className="flex overflow-hidden w-full">
        <Sidebar />
        <ChatWindow catalogPath={catalogPath} />
      </div>
    </ChatProvider>
  );
};

export default Chat;
