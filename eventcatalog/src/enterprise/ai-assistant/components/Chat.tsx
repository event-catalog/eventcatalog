import Sidebar from './ChatSidebar';
import { ChatProvider } from './hooks/ChatProvider';
import ChatWindow from './ChatWindow';

const Chat = ({ chatConfig }: { chatConfig: any }) => {
  return (
    <ChatProvider>
      <div className="flex overflow-hidden w-full">
        <Sidebar />
        <ChatWindow {...chatConfig} />
      </div>
    </ChatProvider>
  );
};

export default Chat;
