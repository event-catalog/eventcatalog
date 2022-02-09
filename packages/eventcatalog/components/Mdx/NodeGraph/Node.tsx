import React from 'react';
import { ServerIcon } from '@heroicons/react/outline/';
import { MailIcon } from '@heroicons/react/solid/';

function Node({ type, label }: any) {
  const Icon = type === 'event' ? MailIcon : ServerIcon;
  return (
    <div>
      <Icon className="h-3 w-3 text-gray-700 inline-block mr-1 -mt-0.5" />
      <span className="text-gray-700">{label}</span>
    </div>
  );
}

export default Node;
