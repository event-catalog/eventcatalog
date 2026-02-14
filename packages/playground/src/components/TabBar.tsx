import { X, Plus } from 'lucide-react';

interface TabBarProps {
  files: string[];
  activeFile: string;
  onSelectFile: (filename: string) => void;
  onCloseFile: (filename: string) => void;
  onAddFile: () => void;
}

export function TabBar({ files, activeFile, onSelectFile, onCloseFile, onAddFile }: TabBarProps) {
  return (
    <div className="tab-bar">
      {files.map((filename) => (
        <button
          key={filename}
          className={`tab-item ${filename === activeFile ? 'tab-item-active' : ''}`}
          onClick={() => onSelectFile(filename)}
        >
          <span className="tab-name">{filename}</span>
          {files.length > 1 && (
            <span
              className="tab-close"
              onClick={(e) => {
                e.stopPropagation();
                onCloseFile(filename);
              }}
            >
              <X size={12} />
            </span>
          )}
        </button>
      ))}
      <button className="tab-add" onClick={onAddFile} title="Add file">
        <Plus size={14} />
      </button>
    </div>
  );
}
