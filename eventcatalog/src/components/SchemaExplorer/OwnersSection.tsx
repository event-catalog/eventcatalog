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
        className="w-full flex items-center justify-between px-4 py-1.5 text-left hover:bg-[rgb(var(--ec-content-hover))] transition-colors"
      >
        <div className="flex items-center gap-2">
          <UserIcon className="h-4 w-4 text-[rgb(var(--ec-page-text-muted))]" />
          <span className="text-xs font-semibold text-[rgb(var(--ec-page-text))]">Owners</span>
          <span className="inline-flex items-center rounded-full bg-[rgb(var(--ec-content-hover))] px-2 py-0.5 text-xs font-medium text-[rgb(var(--ec-page-text-muted))]">
            {owners.length}
          </span>
        </div>
        {isExpanded ? <ChevronUpIcon className="h-4 w-4 text-[rgb(var(--ec-page-text-muted))]" /> : <ChevronDownIcon className="h-4 w-4 text-[rgb(var(--ec-page-text-muted))]" />}
      </button>

      {isExpanded && (
        <div className="px-4 pb-2 bg-[rgb(var(--ec-content-hover))]">
          <div className="flex flex-wrap gap-2">
            {owners.map((owner: Owner, idx: number) => {
              const Icon = owner.type === 'users' ? UserIcon : UserGroupIcon;
              return (
                <a
                  key={`${owner.id}-${idx}`}
                  href={owner.href}
                  className="inline-flex items-center gap-1.5 pl-1 pr-3 py-1 text-xs font-medium text-[rgb(var(--ec-page-text))] bg-[rgb(var(--ec-card-bg,var(--ec-page-bg)))] border border-[rgb(var(--ec-page-border))] rounded-full hover:border-[rgb(var(--ec-accent))] hover:shadow-sm transition-all"
                  title={owner.name}
                >
                  <div className="flex items-center justify-center w-5 h-5 bg-gradient-to-b from-[rgb(var(--ec-accent-gradient-from))] to-[rgb(var(--ec-accent-gradient-to))] rounded-full">
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
