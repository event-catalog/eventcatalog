import React from 'react';
import { ExclamationIcon } from '@heroicons/react/solid';
import { Handle, Position } from 'react-flow-renderer';

const EventNode = ({ data: { event, description, tags = [], version, showWarning } }) => {
  return (
    <div className="border-pink-500 border-l-8 bg-white border-2 p-2 px-4 w-96 text-left shadow-md relative">
      <Handle type="target" position={Position.Left} onConnect={(params) => console.log('handle onConnect', params)}></Handle>
      <Handle type="source" position={Position.Right} onConnect={(params) => console.log('handle onConnect', params)}></Handle>
      {showWarning && <ExclamationIcon className="w-8 h-8 text-red-500 absolute -top-4 right-2" />}
      <div className="text-gray-700 font-bold">
        {event} <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium -mt-2 bg-yellow-100 text-yellow-800`}>v{version}</span>
      </div>
      <div className="text-gray-800 py-4 text-sm">{description}</div>
      <div className="flex justify-between my-2">
        <div>
          {tags.map(({ label, color }) => {
            return (
              <span key={label} className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-${color}-100 text-${color}-800`}>
                {label}
              </span>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default EventNode;
