import { ChevronUpIcon, ChevronDownIcon } from '@heroicons/react/24/outline';
import { UserIcon, UserGroupIcon } from '@heroicons/react/20/solid';
import type { SchemaItem, Owner } from './types';

interface OwnersSectionProps {
  message: SchemaItem;
  isExpanded: boolean;
  onToggle: () => void;
}

export default function OwnersSection({ message, isExpanded, onToggle }: OwnersSectionProps) {
  const owners = message.data.owners || [];

  if (owners.length === 0) return null;

  return (
    <div className="flex-shrink-0 border-b border-gray-200">
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between px-4 py-1.5 text-left hover:bg-gray-50 transition-colors"
      >
        <div className="flex items-center gap-2">
          <UserIcon className="h-4 w-4 text-gray-600" />
          <span className="text-xs font-semibold text-gray-900">Owners</span>
          <span className="inline-flex items-center rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-700">
            {owners.length}
          </span>
        </div>
        {isExpanded ? <ChevronUpIcon className="h-4 w-4 text-gray-600" /> : <ChevronDownIcon className="h-4 w-4 text-gray-600" />}
      </button>

      {isExpanded && (
        <div className="px-4 pb-2 bg-gray-50">
          <div className="flex flex-wrap gap-2">
            {owners.map((owner: Owner, idx: number) => {
              const Icon = owner.type === 'users' ? UserIcon : UserGroupIcon;
              return (
                <a
                  key={`${owner.id}-${idx}`}
                  href={owner.href}
                  className="inline-flex items-center gap-1.5 pl-1 pr-3 py-1 text-xs font-medium text-gray-700 bg-white border border-gray-200 rounded-full hover:border-gray-300 hover:shadow-sm transition-all"
                  title={owner.name}
                >
                  <div className="flex items-center justify-center w-5 h-5 bg-gradient-to-b from-purple-500 to-purple-600 rounded-full">
                    <Icon className="h-3 w-3 text-white" />
                  </div>
                  <span className="font-medium">{owner.name}</span>
                </a>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
