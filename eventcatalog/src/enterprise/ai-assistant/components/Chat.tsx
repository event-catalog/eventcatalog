import Sidebar from './ChatSidebar';
import { ChatProvider } from './hooks/ChatProvider';
import ChatWindow from './ChatWindow';

const Chat = () => {
  return (
    <ChatProvider>
      <div className="flex overflow-hidden w-full">
        <Sidebar />
        <ChatWindow />
      </div>
    </ChatProvider>
  );
};

export default Chat;
