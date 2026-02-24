import { memo, useMemo } from 'react';
import { AlertCircle } from 'lucide-react';
import type { GraphNode } from '@eventcatalog/language-server';

const NODE_LABELS: Record<string, [string, string]> = {
  domain: ['domain', 'domains'],
  service: ['service', 'services'],
  event: ['event', 'events'],
  command: ['command', 'commands'],
  query: ['query', 'queries'],
  channel: ['channel', 'channels'],
  container: ['container', 'containers'],
  entity: ['entity', 'entities'],
  flow: ['flow', 'flows'],
  'data-product': ['data product', 'data products'],
  actor: ['actor', 'actors'],
  'external-system': ['external system', 'external systems'],
  step: ['step', 'steps'],
};

const DISPLAY_ORDER = [
  'domain',
  'service',
  'event',
  'command',
  'query',
  'channel',
  'container',
  'entity',
  'flow',
  'data-product',
  'actor',
  'external-system',
  'step',
];

export const StatusBar = memo(function StatusBar({
  nodes,
  errorCount,
  onCommandPalette,
}: {
  nodes: GraphNode[];
  errorCount: number;
  onCommandPalette: () => void;
}) {
  const counts = useMemo(() => {
    const map: Record<string, number> = {};
    for (const node of nodes) {
      map[node.type] = (map[node.type] || 0) + 1;
    }
    return DISPLAY_ORDER
      .filter((type) => map[type])
      .map((type) => {
        const n = map[type];
        const [singular, plural] = NODE_LABELS[type] || [type, type + 's'];
        return `${n} ${n === 1 ? singular : plural}`;
      });
  }, [nodes]);

  return (
    <footer className="status-bar">
      <div className="status-bar-left">
        {errorCount > 0 && (
          <span className="status-bar-errors">
            <AlertCircle size={12} />
            {errorCount} error{errorCount !== 1 ? 's' : ''}
          </span>
        )}
        {counts.length > 0 ? (
          <span className="status-bar-counts">{counts.join(' \u00b7 ')}</span>
        ) : (
          <span className="status-bar-counts status-bar-empty">No resources defined</span>
        )}
      </div>
      <div className="status-bar-right">
        <button className="status-bar-btn" onClick={onCommandPalette} title="Command palette (⌘K)">
          <kbd className="status-bar-kbd">⌘K</kbd>
        </button>
      </div>
    </footer>
  );
});
