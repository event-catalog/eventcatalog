import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Command } from 'cmdk';
import type { GraphNode } from '@eventcatalog/language-server';
import { Globe, Server, Zap, Terminal, Radio, Hash, Search, Maximize } from 'lucide-react';

const TYPE_META: Record<string, { label: string; icon: React.ReactNode; keyword: string }> = {
  domain: { label: 'Domain', icon: <Globe size={14} />, keyword: 'domain' },
  service: { label: 'Service', icon: <Server size={14} />, keyword: 'service' },
  event: { label: 'Event', icon: <Zap size={14} />, keyword: 'event' },
  command: { label: 'Command', icon: <Terminal size={14} />, keyword: 'command' },
  query: { label: 'Query', icon: <Search size={14} />, keyword: 'query' },
  channel: { label: 'Channel', icon: <Radio size={14} />, keyword: 'channel' },
  container: { label: 'Container', icon: <Hash size={14} />, keyword: 'container' },
  entity: { label: 'Entity', icon: <Hash size={14} />, keyword: 'entity' },
  flow: { label: 'Flow', icon: <Zap size={14} />, keyword: 'flow' },
};

interface CommandPaletteProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  nodes: GraphNode[];
  files: Record<string, string>;
  activeFile: string;
  onGoToLine: (line: number) => void;
  onSwitchFile: (filename: string, line: number) => void;
  onSelectResource?: (node: GraphNode) => void;
  onFitScreen?: () => void;
}

function findResourceLine(
  files: Record<string, string>,
  keyword: string,
  label: string,
): { filename: string; line: number } | null {
  for (const [filename, content] of Object.entries(files)) {
    const lines = content.split('\n');
    const pattern = new RegExp(`^\\s*${keyword}\\s+${escapeRegExp(label)}\\s*\\{?\\s*$`);
    for (let i = 0; i < lines.length; i++) {
      if (pattern.test(lines[i])) {
        return { filename, line: i + 1 };
      }
    }
  }
  return null;
}

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export function CommandPalette({
  open,
  onOpenChange,
  nodes,
  files,
  activeFile,
  onGoToLine,
  onSwitchFile,
  onSelectResource,
  onFitScreen,
}: CommandPaletteProps) {
  const [search, setSearch] = useState('');
  const [mode, setMode] = useState<'commands' | 'goto-line'>('commands');
  const inputRef = useRef<HTMLInputElement>(null);

  // Reset state and force focus when opening
  useEffect(() => {
    if (open) {
      setSearch('');
      setMode('commands');
      // Monaco holds focus aggressively — schedule focus steal after render
      requestAnimationFrame(() => {
        inputRef.current?.focus();
      });
    }
  }, [open]);

  const handleSelect = useCallback(
    (node: GraphNode, keyword: string, label: string) => {
      onSelectResource?.(node);
      const loc = findResourceLine(files, keyword, label);
      if (loc) {
        if (loc.filename === activeFile) {
          onGoToLine(loc.line);
        } else {
          onSwitchFile(loc.filename, loc.line);
        }
      }
      onOpenChange(false);
    },
    [files, activeFile, onGoToLine, onSwitchFile, onOpenChange, onSelectResource],
  );

  const handleGoToLine = useCallback(() => {
    const num = parseInt(search, 10);
    if (num > 0) {
      onGoToLine(num);
      onOpenChange(false);
    }
  }, [search, onGoToLine, onOpenChange]);

  // Group nodes by type
  const grouped = useMemo(() => {
    const map = new Map<string, GraphNode[]>();
    for (const node of nodes) {
      if (!TYPE_META[node.type]) continue;
      if (!map.has(node.type)) map.set(node.type, []);
      map.get(node.type)!.push(node);
    }
    return map;
  }, [nodes]);

  if (!open) return null;

  return (
    <div
      className="cmdk-overlay"
      onClick={() => onOpenChange(false)}
      onKeyDown={(e) => {
        // Catch Escape on the overlay level too
        if (e.key === 'Escape') {
          e.stopPropagation();
          onOpenChange(false);
        }
      }}
    >
      <div
        className="cmdk-wrapper"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={(e) => e.stopPropagation()}
      >
        <Command
          label="Command palette"
          shouldFilter={mode === 'commands'}
          loop
        >
          <Command.Input
            ref={inputRef}
            autoFocus
            placeholder={mode === 'goto-line' ? 'Type a line number...' : 'Search resources or type a command...'}
            value={search}
            onValueChange={(v) => {
              setSearch(v);
              if (v.startsWith(':') && mode === 'commands') {
                setMode('goto-line');
                setSearch(v.slice(1));
              }
            }}
            onKeyDown={(e) => {
              if (e.key === 'Escape') {
                e.preventDefault();
                e.stopPropagation();
                onOpenChange(false);
                return;
              }
              if (e.key === 'Enter' && mode === 'goto-line') {
                e.preventDefault();
                handleGoToLine();
              }
              if (e.key === 'Backspace' && search === '' && mode === 'goto-line') {
                setMode('commands');
              }
            }}
          />
          <Command.List>
            {mode === 'goto-line' ? (
              <Command.Group heading="Go to Line">
                {search && parseInt(search, 10) > 0 ? (
                  <Command.Item onSelect={handleGoToLine} value={`line-${search}`}>
                    <Hash size={14} />
                    Go to line {search}
                  </Command.Item>
                ) : (
                  <Command.Item disabled value="goto-line-hint">
                    Type a line number and press Enter
                  </Command.Item>
                )}
              </Command.Group>
            ) : (
              <>
                <Command.Empty>No results found</Command.Empty>
                <Command.Group heading="Navigation">
                  <Command.Item
                    value="Go to Line"
                    keywords={['line', 'number', 'goto', ':']}
                    onSelect={() => {
                      setMode('goto-line');
                      setSearch('');
                    }}
                  >
                    <Hash size={14} />
                    Go to Line...
                  </Command.Item>
                  <Command.Item
                    value="Fit Screen"
                    keywords={['fit', 'screen', 'zoom', 'view', 'fit view']}
                    onSelect={() => {
                      onFitScreen?.();
                      onOpenChange(false);
                    }}
                  >
                    <Maximize size={14} />
                    Fit Screen
                  </Command.Item>
                </Command.Group>
                {Array.from(grouped.entries()).map(([type, items]) => {
                  const meta = TYPE_META[type];
                  if (!meta) return null;
                  return (
                    <Command.Group key={type} heading={`${meta.label}s`}>
                      {items.map((node) => (
                        <Command.Item
                          key={node.id}
                          value={`${meta.label} ${node.label}`}
                          keywords={[meta.keyword, node.label, ...(node.metadata?.summary ? [String(node.metadata.summary)] : [])]}
                          onSelect={() => handleSelect(node, meta.keyword, node.label)}
                        >
                          {meta.icon}
                          <span className="cmdk-item-content">
                            <span className="cmdk-item-label">
                              {node.label}
                              {node.metadata?.version && (
                                <span className="cmdk-item-version">v{String(node.metadata.version)}</span>
                              )}
                            </span>
                            {node.metadata?.summary && (
                              <span className="cmdk-item-summary">{String(node.metadata.summary)}</span>
                            )}
                          </span>
                        </Command.Item>
                      ))}
                    </Command.Group>
                  );
                })}
              </>
            )}
          </Command.List>
        </Command>
      </div>
    </div>
  );
}
