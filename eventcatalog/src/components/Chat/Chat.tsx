import Sidebar from './Sidebar';
import { ChatProvider } from './ChatProvider';
import ChatWindow from './ChatWindow';

const Chat = () => {
    return (
        <ChatProvider>
            <div className="flex overflow-hidden w-full">
                <div className=" h-screen bg-gray-50 flex-shrink-0 border-r border-gray-200 overflow-y-auto">
                    <Sidebar />
                </div>
                <ChatWindow />
            </div>
        </ChatProvider>
    );
};

export default Chat; 