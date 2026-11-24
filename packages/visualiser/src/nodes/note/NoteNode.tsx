import { Node, NodeProps, Handle, Position } from "@xyflow/react";
import React, { memo, useState, useEffect, useRef, useCallback } from "react";
import { FULL_SIZE_STYLE } from "../shared-styles";

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

export interface NoteNodeProps extends NodeProps<NoteNode> {
  onTextChange?: (id: string, text: string) => void;
  onColorChange?: (id: string, color: string) => void;
  showResizer?: boolean;
  readOnly?: boolean;
}

const AVAILABLE_COLORS = {
  yellow: {
    bg: "bg-gradient-to-br from-[#fbe577] to-[#e9c162]",
    border: "border-[#e2a336]",
    text: "text-[#4f3422]",
    placeholder: "placeholder-yellow-600",
    selectedRing: "ring-[#ffc53d]",
    tooltipBorderColor: "#e2a336",
  },
  blue: {
    bg: "bg-[#c2e5ff]",
    border: "border-[#5eb1ef]",
    text: "text-[#113264]",
    placeholder: "placeholder-blue-600",
    selectedRing: "ring-[#0090ff]",
    tooltipBorderColor: "#5eb1ef",
  },
  green: {
    bg: "bg-[#c4e8d1]",
    border: "border-[#5bb98b]",
    text: "text-[#193b2d]",
    placeholder: "placeholder-green-600",
    selectedRing: "ring-[#30a46c]",
    tooltipBorderColor: "#5bb98b",
  },
  pink: {
    bg: "bg-[#f6cee7]",
    border: "border-[#dd93c2]",
    text: "text-[#651249]",
    placeholder: "placeholder-pink-600",
    selectedRing: "ring-[#d6409f]",
    tooltipBorderColor: "#dd93c2",
  },
  purple: {
    bg: "bg-[#ead5f9]",
    border: "border-[#be93e4]",
    text: "text-[#402060]",
    placeholder: "placeholder-purple-600",
    selectedRing: "ring-[#8e4ec6]",
    tooltipBorderColor: "#be93e4",
  },
  gray: {
    bg: "bg-[#e0e0e0]",
    border: "border-[#bbbbbb]",
    text: "text-[#202020]",
    placeholder: "placeholder-gray-600",
    selectedRing: "ring-[#8d8d8d]",
    tooltipBorderColor: "#bbbbbb",
  },
} as const;

type ColorName = keyof typeof AVAILABLE_COLORS;

const POSITION_RELATIVE_STYLE = { position: "relative" } as const;
const TEXTAREA_STYLE = { height: "100%", minHeight: 0 } as const;

export default memo(function NoteNodeComponent({
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
  const [isTextOverflowing, setIsTextOverflowing] = useState(false);
  const textAreaRef = useRef<HTMLTextAreaElement>(null);
  const displayRef = useRef<HTMLDivElement>(null);

  const currentColorName = (data.color as ColorName) || "yellow";
  const colorClasses =
    AVAILABLE_COLORS[currentColorName] || AVAILABLE_COLORS.yellow;

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
          '<code class="bg-[#e0e0e0] px-1 rounded text-[9px] font-mono">$1</code>',
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

  useEffect(() => {
    const element = displayRef.current;
    if (!element || isEditing) return;

    const updateOverflow = () => {
      setIsTextOverflowing(element.scrollHeight > element.clientHeight);
    };

    updateOverflow();

    if (typeof ResizeObserver === "undefined") {
      window.addEventListener("resize", updateOverflow);
      return () => window.removeEventListener("resize", updateOverflow);
    }

    const observer = new ResizeObserver(updateOverflow);
    observer.observe(element);
    return () => observer.disconnect();
  }, [currentText, isEditing]);

  const handleDoubleClick = useCallback(() => {
    if (!readOnly) {
      setIsEditing(true);
    }
  }, [readOnly]);

  const handleTextChange = useCallback(
    (event: React.ChangeEvent<HTMLTextAreaElement>) => {
      setCurrentText(event.target.value);
    },
    [],
  );

  const handleBlur = useCallback(() => {
    setIsEditing(false);
    // Only update if the text has actually changed from what's in data
    // or if data.text was initially undefined/empty and now has content.
    if (currentText !== data.text && onTextChange) {
      onTextChange(id, currentText);
    }
  }, [currentText, data.text, id, onTextChange]);

  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
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
    },
    [handleBlur, data.text],
  );

  const handleColorChange = useCallback(
    (newColor: ColorName) => {
      if (onColorChange) {
        onColorChange(id, newColor);
      }
    },
    [id, onColorChange],
  );

  return (
    <div className="relative group" style={FULL_SIZE_STYLE}>
      <Handle
        type="target"
        position={Position.Left}
        className="!left-[-1px] !w-2 !h-2 !bg-[#bbbbbb] !border !border-[#8d8d8d] !rounded-full !z-10"
      />
      <Handle
        type="source"
        position={Position.Right}
        className="!right-[-1px] !w-2 !h-2 !bg-[#bbbbbb] !border !border-[#8d8d8d] !rounded-full !z-10"
      />
      {selected && !isEditing && !readOnly && (
        <div className="absolute -top-10 left-1/2 transform -translate-x-1/2 flex space-x-1 p-1 bg-[rgb(var(--ec-card-bg))] rounded-md shadow-lg border border-[rgb(var(--ec-page-border))] z-20">
          {Object.keys(AVAILABLE_COLORS).map((colorKey) => (
            <button
              key={colorKey}
              onClick={() => handleColorChange(colorKey as ColorName)}
              className={classNames(
                "w-6 h-6 rounded-full border-2",
                AVAILABLE_COLORS[colorKey as ColorName].bg,
                AVAILABLE_COLORS[colorKey as ColorName].border,
                currentColorName === colorKey
                  ? "ring-2 ring-offset-1 " +
                      AVAILABLE_COLORS[colorKey as ColorName].selectedRing
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
            ? `border-[#0588f0] ring-2 ${colorClasses.selectedRing} shadow-xl`
            : "shadow-md hover:shadow-lg",
          currentColorName === "yellow"
            ? "shadow-[#e9c162]/50 shadow-lg transform rotate-0.5"
            : "",
        )}
        style={POSITION_RELATIVE_STYLE}
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
            style={TEXTAREA_STYLE}
            placeholder="Enter text..."
          />
        ) : (
          <>
            <div
              ref={displayRef}
              className="whitespace-pre-wrap break-words w-full h-full overflow-y-auto custom-scrollbar text-[10px]"
              dangerouslySetInnerHTML={{
                __html: formatText(currentText),
              }}
            />
            {isTextOverflowing && (
              <div
                className="pointer-events-none absolute left-1/2 bottom-full z-[9999] mb-4 hidden w-max max-w-[320px] -translate-x-1/2 rounded-md border bg-[#202020] px-2.5 py-1.5 text-[11px] font-medium leading-snug text-white shadow-lg group-hover:block"
                style={{ borderColor: colorClasses.tooltipBorderColor }}
              >
                <span className="block whitespace-pre-wrap break-words">
                  {currentText}
                </span>
                <span
                  className="absolute left-1/2 top-full h-2 w-2 -translate-x-1/2 -translate-y-1/2 rotate-45 border-b border-r bg-[#202020]"
                  style={{
                    borderBottomColor: colorClasses.tooltipBorderColor,
                    borderRightColor: colorClasses.tooltipBorderColor,
                  }}
                />
              </div>
            )}
          </>
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
});
