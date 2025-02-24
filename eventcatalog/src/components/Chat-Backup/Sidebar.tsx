import React from 'react';

const Sidebar = () => {
    return (
        <div className="w-64 bg-gray-50 border-r border-gray-200">
            {/* New Chat Button */}
            <div className="p-4 border-b border-gray-200">
                <button className="w-full flex items-center justify-between px-3 py-2 text-sm bg-white hover:bg-gray-100 rounded-lg border border-gray-200 text-gray-700">
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
                    <a href="#" className="block px-3 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg">Sample Chat 1</a>
                    <a href="#" className="block px-3 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg">Sample Chat 2</a>
                    <a href="#" className="block px-3 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg">Sample Chat 3</a>
                </div>
            </div>
        </div>
    );
};

export default Sidebar;