import React from 'react';
import { getMessageColorByCollection, getMessageCollectionName } from '../index';

interface MessageListProps {
  messages: any[];
  decodedCurrentPath: string;
}

const MessageList: React.FC<MessageListProps> = ({ messages, decodedCurrentPath }) => (
  <ul className="space-y-0 border-l border-gray-200/80 ml-[9px] pl-4">
    {messages.map((message: any) => (
      <li key={message.id} data-active={decodedCurrentPath === message.href}>
        <a
          href={message.href}
          className={`flex items-center justify-between px-2 py-1.5 text-xs text-gray-600 hover:bg-purple-100 rounded-md ${
            decodedCurrentPath.includes(message.href) ? 'bg-purple-100 ' : 'hover:bg-purple-100'
          }`}
        >
          <span className="truncate">{message.data.name}</span>
          <span
            className={`ml-2 text-[10px] font-medium px-2 uppercase py-0.5 rounded ${getMessageColorByCollection(message.collection)}`}
          >
            {getMessageCollectionName(message.collection)}
          </span>
        </a>
      </li>
    ))}
  </ul>
);

export default MessageList;
