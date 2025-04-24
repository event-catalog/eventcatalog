import React from 'react';
import { ChevronDownIcon } from '@heroicons/react/24/outline';

interface CollapsibleGroupProps {
  isCollapsed: boolean;
  onToggle: () => void;
  title: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}

const CollapsibleGroup: React.FC<CollapsibleGroupProps> = ({ isCollapsed, onToggle, title, children, className = '' }) => (
  <div className={className}>
    <div className="flex items-center">
      <button
        onClick={(e) => {
          e.stopPropagation();
          onToggle();
        }}
        className="p-1 hover:bg-gray-100 rounded-md"
      >
        <div className={`transition-transform duration-150 ${isCollapsed ? '' : 'rotate-180'}`}>
          <ChevronDownIcon className="h-3 w-3 text-gray-500" />
        </div>
      </button>
      {typeof title === 'string' ? (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onToggle();
          }}
          className="flex-grow flex items-center justify-between px-2 py-0.5 text-xs font-bold rounded-md"
        >
          {title}
        </button>
      ) : (
        title
      )}
    </div>
    <div className={`overflow-hidden transition-[height] duration-150 ease-out ${isCollapsed ? 'h-0' : 'h-auto'}`}>
      {children}
    </div>
  </div>
);

export default CollapsibleGroup;
