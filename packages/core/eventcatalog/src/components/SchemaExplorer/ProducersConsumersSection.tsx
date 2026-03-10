import { ChevronDownIcon } from '@heroicons/react/24/outline';
import { ServerIcon } from '@heroicons/react/20/solid';
import { buildUrl } from '@utils/url-builder';
import type { SchemaItem, Producer, Consumer } from './types';

interface ProducersConsumersSectionProps {
  message: SchemaItem;
  isExpanded: boolean;
  onToggle: () => void;
}

export default function ProducersConsumersSection({ message, isExpanded, onToggle }: ProducersConsumersSectionProps) {
  const producers = message.data.producers || [];
  const consumers = message.data.consumers || [];
  const totalCount = producers.length + consumers.length;

  if (totalCount === 0) return null;

  return (
    <div className="flex-shrink-0 border-b border-[rgb(var(--ec-page-border))]">
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between px-5 py-2.5 text-left hover:bg-[rgb(var(--ec-content-hover)/0.5)] transition-colors"
      >
        <div className="flex items-center gap-2.5">
          <span className="text-xs font-medium text-[rgb(var(--ec-page-text-muted))] uppercase tracking-wider">Services</span>
          <span className="text-xs tabular-nums text-[rgb(var(--ec-page-text-muted))]">{totalCount}</span>
        </div>
        <ChevronDownIcon
          className={`h-3.5 w-3.5 text-[rgb(var(--ec-page-text-muted))] transition-transform ${isExpanded ? 'rotate-180' : ''}`}
        />
      </button>

      {isExpanded && (
        <div className="px-5 pb-3 space-y-3">
          {producers.length > 0 && (
            <div>
              <h4 className="text-[11px] font-medium text-[rgb(var(--ec-page-text-muted))] uppercase tracking-wider mb-2">
                Producers
              </h4>
              <div className="flex flex-wrap gap-1.5">
                {producers.map((producer: Producer, idx: number) => (
                  <a
                    key={`${producer.id}-${idx}`}
                    href={buildUrl(`/docs/services/${producer.id}/${producer.version}`)}
                    className="inline-flex items-center gap-1.5 pl-1.5 pr-2.5 py-1 text-xs font-medium text-[rgb(var(--ec-page-text))] bg-[rgb(var(--ec-content-hover))] rounded-full hover:ring-1 hover:ring-pink-400/50 transition-all"
                    title={`View ${producer.id}`}
                  >
                    <div className="flex items-center justify-center w-5 h-5 bg-gradient-to-b from-pink-500 to-pink-600 rounded-full">
                      <ServerIcon className="h-3 w-3 text-white" />
                    </div>
                    <span>{producer.id}</span>
                    <span className="text-[rgb(var(--ec-page-text-muted))] text-[11px] tabular-nums">v{producer.version}</span>
                  </a>
                ))}
              </div>
            </div>
          )}
          {consumers.length > 0 && (
            <div>
              <h4 className="text-[11px] font-medium text-[rgb(var(--ec-page-text-muted))] uppercase tracking-wider mb-2">
                Consumers
              </h4>
              <div className="flex flex-wrap gap-1.5">
                {consumers.map((consumer: Consumer, idx: number) => (
                  <a
                    key={`${consumer.id}-${idx}`}
                    href={buildUrl(`/docs/services/${consumer.id}/${consumer.version}`)}
                    className="inline-flex items-center gap-1.5 pl-1.5 pr-2.5 py-1 text-xs font-medium text-[rgb(var(--ec-page-text))] bg-[rgb(var(--ec-content-hover))] rounded-full hover:ring-1 hover:ring-pink-400/50 transition-all"
                    title={`View ${consumer.id}`}
                  >
                    <div className="flex items-center justify-center w-5 h-5 bg-gradient-to-b from-pink-500 to-pink-600 rounded-full">
                      <ServerIcon className="h-3 w-3 text-white" />
                    </div>
                    <span>{consumer.id}</span>
                    <span className="text-[rgb(var(--ec-page-text-muted))] text-[11px] tabular-nums">v{consumer.version}</span>
                  </a>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
