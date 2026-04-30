import { useState } from 'react';
import { SearchX, Copy, Check, AlertTriangle } from 'lucide-react';
import { BoltIcon, ChatBubbleLeftIcon, MagnifyingGlassIcon } from '@heroicons/react/24/solid';
import { buildUrl } from '@utils/url-builder';

export interface FieldResult {
  path: string;
  type: string;
  description: string;
  required: boolean;
  schemaFormat: string;
  messageId: string;
  messageVersion: string;
  messageType: string;
  messageName?: string;
  messageSummary?: string;
  messageOwners?: string[];
  producers: { id: string; version: string; name?: string; summary?: string; owners?: string[] }[];
  consumers: { id: string; version: string; name?: string; summary?: string; owners?: string[] }[];
  usedInCount?: number;
  conflicts?: { type: string; count: number }[];
}

export interface FieldsTableProps {
  fields: FieldResult[];
  onSelectField: (fieldPath: string) => void;
  isLoading: boolean;
  isScaleEnabled?: boolean;
}

const colorClasses: Record<string, string> = {
  orange: 'text-orange-500',
  blue: 'text-blue-500',
  green: 'text-green-500',
  gray: 'text-gray-500',
};

const getColorAndIconForMessageType = (type: string) => {
  switch (type) {
    case 'event':
      return { color: 'orange', Icon: BoltIcon };
    case 'command':
      return { color: 'blue', Icon: ChatBubbleLeftIcon };
    case 'query':
      return { color: 'green', Icon: MagnifyingGlassIcon };
    default:
      return { color: 'gray', Icon: ChatBubbleLeftIcon };
  }
};

function MessageBadge({ id, name, version, type }: { id: string; name?: string; version: string; type: string }) {
  const { color, Icon } = getColorAndIconForMessageType(type);
  const collection = type === 'query' ? 'queries' : `${type}s`;
  const messageUrl = buildUrl(`/docs/${collection}/${id}/${version}`);
  return (
    <a
      href={messageUrl}
      onClick={(e) => e.stopPropagation()}
      className="group/msg inline-flex items-center gap-1.5 text-[0.8rem] text-[rgb(var(--ec-page-text-muted))] hover:text-[rgb(var(--ec-accent))] transition-colors"
    >
      <Icon className={`h-3.5 w-3.5 ${colorClasses[color] || 'text-gray-500'} flex-shrink-0`} />
      <span className="truncate max-w-[160px] text-[rgb(var(--ec-page-text-muted))] group-hover/msg:text-[rgb(var(--ec-accent))]">
        {name || id}
      </span>
    </a>
  );
}

function FieldPathCell({ path }: { path: string }) {
  const [copied, setCopied] = useState(false);

  return (
    <span className="inline-flex items-center gap-1 font-mono text-[rgb(var(--ec-page-text))]" title={path}>
      {path}
      <button
        className={`opacity-0 group-hover:opacity-100 transition-opacity p-0.5 rounded hover:bg-[rgb(var(--ec-content-hover))]`}
        onClick={(e) => {
          e.stopPropagation();
          navigator.clipboard.writeText(path);
          setCopied(true);
          setTimeout(() => setCopied(false), 1500);
        }}
        title="Copy field path"
      >
        {copied ? <Check className="w-3 h-3 text-green-500" /> : <Copy className="w-3 h-3 text-[rgb(var(--ec-icon-color))]" />}
      </button>
    </span>
  );
}

export default function FieldsTable({ fields, onSelectField, isLoading, isScaleEnabled = false }: FieldsTableProps) {
  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center px-6 pb-5">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-[rgb(var(--ec-accent))] border-t-transparent rounded-full animate-spin" />
          <span className="text-sm text-[rgb(var(--ec-page-text-muted))]">Loading fields...</span>
        </div>
      </div>
    );
  }

  if (fields.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center px-6 pb-5">
        <div className="flex flex-col items-center justify-center text-[rgb(var(--ec-page-text-muted))]">
          <SearchX className="w-10 h-10 text-[rgb(var(--ec-icon-color))] mb-3 opacity-50" />
          <p className="text-sm font-medium text-[rgb(var(--ec-page-text-muted))]">No schema fields found</p>
          <p className="text-xs text-[rgb(var(--ec-icon-color))] mt-1 max-w-xs text-center">
            Add <code className="px-1 py-0.5 rounded bg-[rgb(var(--ec-content-hover))] font-mono text-[11px]">schemaPath</code> to
            your events, commands, or queries to get started.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-0 flex-1 overflow-auto px-6 pb-5">
      <div className="overflow-hidden rounded-xl border border-[rgb(var(--ec-page-border)/0.72)] dark:border-white/10 bg-[rgb(var(--ec-dropdown-bg)/0.66)]">
        <table className="min-w-full divide-y divide-[rgb(var(--ec-page-border)/0.62)] dark:divide-white/10">
          <thead className="sticky top-0 z-10 bg-[rgb(var(--ec-content-hover)/0.45)]">
            <tr>
              <th className="px-4 py-2.5 text-left text-[11px] font-medium text-[rgb(var(--ec-page-text-muted))] uppercase tracking-wider">
                Property
              </th>
              <th className="px-4 py-2.5 text-left text-[11px] font-medium text-[rgb(var(--ec-page-text-muted))] uppercase tracking-wider">
                Type
              </th>
              <th className="px-4 py-2.5 text-left text-[11px] font-medium text-[rgb(var(--ec-page-text-muted))] uppercase tracking-wider">
                Message
              </th>
              <th className="px-4 py-2.5 text-left text-[11px] font-medium text-[rgb(var(--ec-page-text-muted))] uppercase tracking-wider">
                Format
              </th>
              <th className="px-4 py-2.5 text-left text-[11px] font-medium text-[rgb(var(--ec-page-text-muted))] uppercase tracking-wider">
                Required
              </th>
              {isScaleEnabled && (
                <th className="px-4 py-2.5 text-left text-[11px] font-medium text-[rgb(var(--ec-page-text-muted))] uppercase tracking-wider">
                  Consistency
                </th>
              )}
              {isScaleEnabled && (
                <th className="px-4 py-2.5 text-left text-[11px] font-medium text-[rgb(var(--ec-page-text-muted))] uppercase tracking-wider">
                  Used In
                </th>
              )}
              <th className="px-4 py-2.5 text-left text-[11px] font-medium text-[rgb(var(--ec-page-text-muted))] uppercase tracking-wider">
                Owners
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[rgb(var(--ec-page-border)/0.5)] dark:divide-white/8">
            {fields.map((field, index) => {
              const rowKey = `${field.path}-${field.messageId}-${field.messageVersion}-${index}`;
              const owners = field.messageOwners || [];

              return (
                <tr
                  key={rowKey}
                  className="group cursor-pointer bg-transparent transition-colors hover:bg-[rgb(var(--ec-content-hover)/0.38)]"
                  onClick={() => onSelectField(field.path)}
                >
                  <td className="px-4 py-3 text-sm text-[rgb(var(--ec-page-text))] max-w-[300px]">
                    <div className="overflow-x-auto">
                      <FieldPathCell path={field.path} />
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm font-mono text-[rgb(var(--ec-page-text-muted))]">{field.type}</td>
                  <td className="px-4 py-3 text-sm text-[rgb(var(--ec-page-text))]">
                    <MessageBadge
                      id={field.messageId}
                      name={field.messageName}
                      version={field.messageVersion}
                      type={field.messageType}
                    />
                  </td>
                  <td className="px-4 py-3 text-sm text-[rgb(var(--ec-page-text-muted))]">{field.schemaFormat}</td>
                  <td className="px-4 py-3 text-sm text-[rgb(var(--ec-page-text-muted))]">
                    {field.required ? (
                      <Check className="h-4 w-4 text-green-500" />
                    ) : (
                      <span className="text-[0.8rem] text-[rgb(var(--ec-page-text-muted))]">-</span>
                    )}
                  </td>
                  {isScaleEnabled && (
                    <td className="px-4 py-3 text-sm text-[rgb(var(--ec-page-text-muted))]">
                      {field.conflicts && field.conflicts.length > 1 ? (
                        <div
                          className="flex items-center gap-1.5"
                          title={field.conflicts.map((c) => `${c.type} (${c.count})`).join(', ')}
                        >
                          <AlertTriangle className="w-3.5 h-3.5 text-amber-500 flex-shrink-0" />
                          <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold bg-amber-500/10 text-amber-600 border border-amber-500/20">
                            {field.conflicts.length} types
                          </span>
                        </div>
                      ) : (
                        <span className="inline-flex items-center" title="All usages of this field match the same type">
                          <Check className="h-4 w-4 text-green-500" />
                        </span>
                      )}
                    </td>
                  )}
                  {isScaleEnabled && (
                    <td className="px-4 py-3 text-sm text-[rgb(var(--ec-page-text-muted))]">
                      <span className="text-[0.8rem] text-[rgb(var(--ec-page-text-muted))]">
                        {field.usedInCount || 1} {(field.usedInCount || 1) === 1 ? 'schema' : 'schemas'}
                      </span>
                    </td>
                  )}
                  <td className="px-4 py-3 text-sm text-[rgb(var(--ec-page-text-muted))]">
                    {owners.length > 0 ? (
                      <div className="flex items-center gap-1 flex-wrap">
                        {owners.slice(0, 2).map((owner) => (
                          <span
                            key={owner}
                            className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-[rgb(var(--ec-accent)/0.1)] text-[rgb(var(--ec-accent))] truncate max-w-[100px]"
                            title={owner}
                          >
                            {owner}
                          </span>
                        ))}
                        {owners.length > 2 && (
                          <span className="text-[10px] text-[rgb(var(--ec-page-text-muted))]">+{owners.length - 2}</span>
                        )}
                      </div>
                    ) : (
                      <span className="text-[0.8rem] text-[rgb(var(--ec-page-text-muted))]">-</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
