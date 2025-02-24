import React from 'react';
import { format } from 'date-fns';
import { useChat } from './ChatProvider';


const Sidebar: React.FC<{}> = () => {
    const { sessions, currentSession, createSession, deleteSession, addMessageToSession, setCurrentSession } = useChat();

    return (
        <div className="w-64 bg-gray-50 border-r border-gray-200">
            {/* New Chat Button */}
            <div className="p-4 border-b border-gray-200">
                <button 
                    onClick={createSession}
                    className="w-full flex items-center justify-between px-3 py-2 text-sm bg-white hover:bg-gray-100 rounded-lg border border-gray-200 text-gray-700"
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

            {/* Chat History */}
            <div className="p-2 space-y-2">
                <div className="text-xs text-gray-500 px-2 py-1">Your chats</div>
                <div className="space-y-1">
                    {sessions.map((session) => (
                        <div
                            key={session.id}
                            className={`group relative flex flex-col ${
                                currentSession?.id === session.id
                                    ? 'bg-gray-100'
                                    : 'hover:bg-gray-50'
                            } rounded-lg`}
                        >
                            <button
                                onClick={(e) => deleteSession(session.id)}
                                className={`absolute right-1 top-1 p-1.5 opacity-0 group-hover:opacity-100 transition-opacity duration-200 text-gray-400 hover:text-gray-600 ${
                                    currentSession?.id === session.id ? 'opacity-100' : ''
                                }`}
                                title="Delete chat"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor">
                                    <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                                </svg>
                            </button>
                            <button
                                onClick={() => setCurrentSession(session)}
                                className="flex-1 text-left px-3 py-2 text-sm"
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
    );
};

export default Sidebar; 