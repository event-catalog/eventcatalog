import React from 'react';
import { ExclamationIcon } from '@heroicons/react/solid';
import { Handle, Position } from 'react-flow-renderer';

const EventNode = ({ data: { serviceName, description, tags = [], version, showWarning } }) => {
  return (
    <div className=" bg-white border-2 p-2 px-4 w-96 text-left shadow-md relative">
      <Handle type="target" position={Position.Left} onConnect={(params) => console.log('handle onConnect', params)}></Handle>
      <Handle type="source" position={Position.Right} onConnect={(params) => console.log('handle onConnect', params)}></Handle>
      <div className="uppercase text-gray-500 text-xs mb-4">Producer</div>
      <div className="text-gray-700 font-bold">
        {serviceName}
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
