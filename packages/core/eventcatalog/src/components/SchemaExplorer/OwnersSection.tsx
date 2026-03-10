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
    <div className="flex-shrink-0 border-b border-[rgb(var(--ec-page-border))]">
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between px-5 py-2.5 text-left hover:bg-[rgb(var(--ec-content-hover)/0.5)] transition-colors"
      >
        <div className="flex items-center gap-2.5">
          <span className="text-xs font-medium text-[rgb(var(--ec-page-text-muted))] uppercase tracking-wider">Owners</span>
          {!isExpanded && (
            <div className="flex items-center -space-x-1">
              {owners.slice(0, 3).map((owner: Owner, idx: number) => {
                const OwnerIcon = owner.type === 'users' ? UserIcon : UserGroupIcon;
                return (
                  <div
                    key={`${owner.id}-${idx}`}
                    className="flex items-center justify-center w-5 h-5 rounded-full bg-[rgb(var(--ec-content-hover))] border-2 border-[rgb(var(--ec-card-bg,var(--ec-page-bg)))] text-[rgb(var(--ec-page-text-muted))]"
                  >
                    <OwnerIcon className="h-2.5 w-2.5" />
                  </div>
                );
              })}
              {owners.length > 3 && (
                <div className="flex items-center justify-center w-5 h-5 rounded-full bg-[rgb(var(--ec-content-hover))] border-2 border-[rgb(var(--ec-card-bg,var(--ec-page-bg)))] text-[10px] font-medium text-[rgb(var(--ec-page-text-muted))]">
                  +{owners.length - 3}
                </div>
              )}
            </div>
          )}
        </div>
        <ChevronDownIcon
          className={`h-3.5 w-3.5 text-[rgb(var(--ec-page-text-muted))] transition-transform ${isExpanded ? 'rotate-180' : ''}`}
        />
      </button>

      {isExpanded && (
        <div className="px-5 pb-3">
          <div className="flex flex-wrap gap-2">
            {owners.map((owner: Owner, idx: number) => {
              const OwnerIcon = owner.type === 'users' ? UserIcon : UserGroupIcon;
              return (
                <a
                  key={`${owner.id}-${idx}`}
                  href={owner.href}
                  className="inline-flex items-center gap-1.5 pl-1.5 pr-2.5 py-1 text-xs font-medium text-[rgb(var(--ec-page-text))] bg-[rgb(var(--ec-content-hover))] rounded-full hover:ring-1 hover:ring-[rgb(var(--ec-accent)/0.3)] transition-all"
                  title={owner.name}
                >
                  <div className="flex items-center justify-center w-5 h-5 bg-[rgb(var(--ec-accent))] rounded-full">
                    <OwnerIcon className="h-3 w-3 text-white" />
                  </div>
                  <span>{owner.name}</span>
                </a>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
