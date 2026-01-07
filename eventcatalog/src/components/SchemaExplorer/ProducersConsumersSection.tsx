import { ChevronUpIcon, ChevronDownIcon } from '@heroicons/react/24/outline';
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
        className="w-full flex items-center justify-between px-4 py-1.5 text-left hover:bg-[rgb(var(--ec-content-hover))] transition-colors"
      >
        <div className="flex items-center gap-2">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-4 w-4 text-[rgb(var(--ec-page-text-muted))]"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
          <span className="text-xs font-semibold text-[rgb(var(--ec-page-text))]">Producers & Consumers</span>
          <span className="inline-flex items-center rounded-full bg-[rgb(var(--ec-content-hover))] px-2 py-0.5 text-xs font-medium text-[rgb(var(--ec-page-text-muted))]">
            {totalCount} services
          </span>
        </div>
        {isExpanded ? <ChevronUpIcon className="h-4 w-4 text-[rgb(var(--ec-page-text-muted))]" /> : <ChevronDownIcon className="h-4 w-4 text-[rgb(var(--ec-page-text-muted))]" />}
      </button>

      {isExpanded && (
        <div className="px-4 pb-2 bg-[rgb(var(--ec-content-hover))]">
          {producers.length > 0 && (
            <div className="mb-3">
              <h4 className="text-xs font-semibold text-[rgb(var(--ec-page-text))] mb-2">Producers ({producers.length})</h4>
              <div className="flex flex-wrap gap-2">
                {producers.map((producer: Producer, idx: number) => (
                  <a
                    key={`${producer.id}-${idx}`}
                    href={buildUrl(`/docs/services/${producer.id}/${producer.version}`)}
                    className="inline-flex items-center gap-1.5 pl-1 pr-3 py-1 text-xs font-medium text-[rgb(var(--ec-page-text))] bg-[rgb(var(--ec-card-bg,var(--ec-page-bg)))] border border-[rgb(var(--ec-page-border))] rounded-full hover:border-pink-400 dark:hover:border-pink-500 hover:shadow-sm transition-all"
                    title={`View ${producer.id}`}
                  >
                    <div className="flex items-center justify-center w-5 h-5 bg-gradient-to-b from-pink-500 to-pink-600 rounded-full">
                      <ServerIcon className="h-3 w-3 text-white" />
                    </div>
                    <span className="font-medium">{producer.id}</span>
                    <span className="text-[rgb(var(--ec-page-text-muted))] text-[11px]">v{producer.version}</span>
                  </a>
                ))}
              </div>
            </div>
          )}
          {consumers.length > 0 && (
            <div>
              <h4 className="text-xs font-semibold text-[rgb(var(--ec-page-text))] mb-2">Consumers ({consumers.length})</h4>
              <div className="flex flex-wrap gap-2">
                {consumers.map((consumer: Consumer, idx: number) => (
                  <a
                    key={`${consumer.id}-${idx}`}
                    href={buildUrl(`/docs/services/${consumer.id}/${consumer.version}`)}
                    className="inline-flex items-center gap-1.5 pl-1 pr-3 py-1 text-xs font-medium text-[rgb(var(--ec-page-text))] bg-[rgb(var(--ec-card-bg,var(--ec-page-bg)))] border border-[rgb(var(--ec-page-border))] rounded-full hover:border-pink-400 dark:hover:border-pink-500 hover:shadow-sm transition-all"
                    title={`View ${consumer.id}`}
                  >
                    <div className="flex items-center justify-center w-5 h-5 bg-gradient-to-b from-pink-500 to-pink-600 rounded-full">
                      <ServerIcon className="h-3 w-3 text-white" />
                    </div>
                    <span className="font-medium">{consumer.id}</span>
                    <span className="text-[rgb(var(--ec-page-text-muted))] text-[11px]">v{consumer.version}</span>
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
