import React from 'react';
import { getMessageColorByCollection, getMessageCollectionName } from '../index';
interface MessageListProps {
  messages: any[];
  decodedCurrentPath: string;
}

const getMessageColorByLabelOrCollection = (collection: string, badge?: string) => {
  if (!badge) {
    return getMessageColorByCollection(collection);
  }

  // Will try and match the label against HTTP verbs
  const httpVerbs = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'HEAD', 'OPTIONS', 'TRACE', 'CONNECT'];
  if (badge && httpVerbs.includes(badge.toUpperCase())) {
    if (badge.toUpperCase() === 'GET') return 'bg-blue-50 text-blue-600';
    if (badge.toUpperCase() === 'POST') return 'bg-green-50 text-green-600';
    if (badge.toUpperCase() === 'PUT') return 'bg-yellow-50 text-yellow-600';
    if (badge.toUpperCase() === 'DELETE') return 'bg-red-50 text-red-600';
    if (badge.toUpperCase() === 'PATCH') return 'bg-purple-50 text-purple-600';
    if (badge.toUpperCase() === 'HEAD') return 'bg-gray-50 text-gray-600';
    if (badge.toUpperCase() === 'OPTIONS') return 'bg-orange-50 text-orange-600';
  }

  return getMessageColorByCollection(collection);
};

const MessageList: React.FC<MessageListProps> = ({ messages, decodedCurrentPath }) => (
  <ul className="space-y-0.5 border-l border-gray-200/80 ml-[9px] pl-4">
    {messages.map((message: any) => (
      <li key={message.id} data-active={decodedCurrentPath === message.href}>
        <a
          href={message.href}
          className={`flex items-center justify-between px-2 py-1.5 text-xs text-gray-600 hover:bg-purple-100 rounded-md ${
            decodedCurrentPath.includes(message.href) ? 'bg-purple-100 ' : 'hover:bg-purple-100'
          }`}
        >
          <span className="truncate">{message.data?.sidebar?.label || message.data.name}</span>
          <span
            className={`ml-2 text-[10px]  flex items-center gap-1 font-medium px-2 uppercase py-0.5 rounded ${getMessageColorByLabelOrCollection(message.collection, message.data?.sidebar?.badge)}`}
          >
            {message.data?.sidebar?.badge || getMessageCollectionName(message.collection)}
          </span>
        </a>
      </li>
    ))}
  </ul>
);

export default MessageList;
