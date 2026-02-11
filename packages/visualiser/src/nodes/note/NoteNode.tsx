import { Node, Handle, Position } from "@xyflow/react";
import React, { useState, useEffect, useRef } from "react";

function classNames(...classes: any) {
  return classes.filter(Boolean).join(" ");
}

// Define the data structure for our NoteNode
export type NoteNodeData = {
  id: string;
  text: string;
  color?: string;
  readOnly?: boolean;
};

// Define the NoteNode type for React Flow
export type NoteNode = Node<NoteNodeData, "note">;

interface NoteNodeProps extends NoteNode {
  onTextChange?: (id: string, text: string) => void;
  onColorChange?: (id: string, color: string) => void;
  showResizer?: boolean;
  readOnly?: boolean;
}

export default function NoteNodeComponent({
  id,
  data,
  selected,
  onTextChange,
  onColorChange,
  readOnly = false,
}: NoteNodeProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [currentText, setCurrentText] = useState(
    data.text || "Double-click to edit...",
  );
  const textAreaRef = useRef<HTMLTextAreaElement>(null);

  // Define a list of selectable colors
  const availableColors = {
    yellow: {
      bg: "bg-gradient-to-br from-yellow-200 to-yellow-300",
      border: "border-yellow-400",
      text: "text-yellow-900",
      placeholder: "placeholder-yellow-600",
      selectedRing: "ring-yellow-500",
    },
    blue: {
      bg: "bg-blue-200",
      border: "border-blue-400",
      text: "text-blue-900",
      placeholder: "placeholder-blue-600",
      selectedRing: "ring-blue-500",
    },
    green: {
      bg: "bg-green-200",
      border: "border-green-400",
      text: "text-green-900",
      placeholder: "placeholder-green-600",
      selectedRing: "ring-green-500",
    },
    pink: {
      bg: "bg-pink-200",
      border: "border-pink-400",
      text: "text-pink-900",
      placeholder: "placeholder-pink-600",
      selectedRing: "ring-pink-500",
    },
    purple: {
      bg: "bg-purple-200",
      border: "border-purple-400",
      text: "text-purple-900",
      placeholder: "placeholder-purple-600",
      selectedRing: "ring-purple-500",
    },
    gray: {
      bg: "bg-gray-200",
      border: "border-gray-400",
      text: "text-gray-900",
      placeholder: "placeholder-gray-600",
      selectedRing: "ring-gray-500",
    },
  };

  type ColorName = keyof typeof availableColors;

  const currentColorName = (data.color as ColorName) || "yellow";
  const colorClasses =
    availableColors[currentColorName] || availableColors.yellow;

  // Simple markdown-like text formatting
  const formatText = (text: string) => {
    return (
      text
        // Headers
        .replace(
          /^### (.*$)/gim,
          '<h3 class="text-xs font-medium mb-1">$1</h3>',
        )
        .replace(
          /^## (.*$)/gim,
          '<h2 class="text-xs font-semibold mb-1">$1</h2>',
        )
        .replace(/^# (.*$)/gim, '<h1 class="text-sm font-bold mb-1">$1</h1>')
        // Bold
        .replace(/\*\*(.*?)\*\*/gim, '<strong class="font-bold">$1</strong>')
        // Italic
        .replace(/\*(.*?)\*/gim, '<em class="italic">$1</em>')
        // Inline code
        .replace(
          /`(.*?)`/gim,
          '<code class="bg-gray-200 px-1 rounded text-[9px] font-mono">$1</code>',
        )
        // Simple lists
        .replace(/^• (.*$)/gim, '<li class="text-[10px] ml-3">• $1</li>')
        .replace(/^- (.*$)/gim, '<li class="text-[10px] ml-3">• $1</li>')
        // Line breaks
        .replace(/\n/g, "<br>")
    );
  };

  useEffect(() => {
    // Update internal state if data.text changes from props (e.g. undo/redo, initial load)
    setCurrentText(data.text || "Double-click to edit...");
  }, [data.text]);

  useEffect(() => {
    if (isEditing && textAreaRef.current) {
      textAreaRef.current.focus();
      // Select all text when starting to edit for quicker replacement
      textAreaRef.current.select();
    }
  }, [isEditing]);

  const handleDoubleClick = () => {
    if (!readOnly) {
      setIsEditing(true);
    }
  };

  const handleTextChange = (event: React.ChangeEvent<HTMLTextAreaElement>) => {
    setCurrentText(event.target.value);
  };

  const handleBlur = () => {
    setIsEditing(false);
    // Only update if the text has actually changed from what's in data
    // or if data.text was initially undefined/empty and now has content.
    if (currentText !== data.text && onTextChange) {
      onTextChange(id, currentText);
    }
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault(); // Prevent newline on Enter
      handleBlur(); // Save and exit edit mode
    }
    // Allow Shift+Enter for newlines by default textarea behavior
    if (event.key === "Escape") {
      setIsEditing(false);
      // Revert to original text from data on Escape
      setCurrentText(data.text || "Double-click to edit...");
    }
  };

  const handleColorChange = (newColor: ColorName) => {
    if (onColorChange) {
      onColorChange(id, newColor);
    }
  };

  return (
    <div className="relative group" style={{ width: "100%", height: "100%" }}>
      <Handle
        type="target"
        position={Position.Left}
        className="!left-[-1px] !w-2 !h-2 !bg-gray-400 !border !border-gray-500 !rounded-full !z-10"
      />
      <Handle
        type="source"
        position={Position.Right}
        className="!right-[-1px] !w-2 !h-2 !bg-gray-400 !border !border-gray-500 !rounded-full !z-10"
      />
      {selected && !isEditing && !readOnly && (
        <div className="absolute -top-10 left-1/2 transform -translate-x-1/2 flex space-x-1 p-1 bg-white rounded-md shadow-lg border border-gray-300 z-20">
          {Object.keys(availableColors).map((colorKey) => (
            <button
              key={colorKey}
              onClick={() => handleColorChange(colorKey as ColorName)}
              className={classNames(
                "w-6 h-6 rounded-full border-2",
                availableColors[colorKey as ColorName].bg,
                availableColors[colorKey as ColorName].border,
                currentColorName === colorKey
                  ? "ring-2 ring-offset-1 " +
                      availableColors[colorKey as ColorName].selectedRing
                  : "",
              )}
              title={colorKey.charAt(0).toUpperCase() + colorKey.slice(1)}
            />
          ))}
        </div>
      )}
      <div
        onDoubleClick={handleDoubleClick}
        className={classNames(
          "w-full h-full rounded-lg border p-3 flex flex-col min-w-[150px] min-h-[150px] relative",
          colorClasses.bg,
          colorClasses.border,
          colorClasses.text,
          "prose prose-sm max-w-full",
          selected
            ? `border-blue-600 ring-2 ${colorClasses.selectedRing} shadow-xl`
            : "shadow-md hover:shadow-lg",
          currentColorName === "yellow"
            ? "shadow-yellow-300/50 shadow-lg transform rotate-0.5"
            : "",
        )}
        style={{ position: "relative" }}
      >
        {isEditing ? (
          <textarea
            ref={textAreaRef}
            value={currentText}
            onChange={handleTextChange}
            onBlur={handleBlur}
            onKeyDown={handleKeyDown}
            className={classNames(
              "w-full flex-1 bg-transparent border-none outline-none resize-none text-[10px] p-0 m-0",
              colorClasses.text,
              colorClasses.placeholder,
            )}
            style={{ height: "100%", minHeight: 0 }}
            placeholder="Enter text..."
          />
        ) : (
          <div
            className="whitespace-pre-wrap break-words w-full h-full overflow-y-auto custom-scrollbar text-[10px]"
            dangerouslySetInnerHTML={{
              __html: formatText(currentText),
            }}
          />
        )}

        {/* PostIt folded corner effect */}
        {currentColorName === "yellow" && (
          <div className="absolute top-0 right-0 w-4 h-4">
            <div className="absolute top-0 right-0 w-0 h-0 border-l-[16px] border-b-[16px] border-l-transparent border-b-yellow-400/30 rounded-br-lg"></div>
          </div>
        )}
      </div>
    </div>
  );
}
