import { memo, useEffect, type ReactNode } from "react";
import { Code, Image, X } from "lucide-react";

interface ExportModalProps {
  onClose: () => void;
  onExportImage: () => void;
  onExportMermaid: () => void;
}

const ExportOption = ({
  icon,
  title,
  description,
  onClick,
}: {
  icon: ReactNode;
  title: string;
  description: string;
  onClick: () => void;
}) => (
  <button
    type="button"
    onClick={onClick}
    className="w-full flex items-start gap-3 p-3 rounded-md border border-[rgb(var(--ec-page-border))] bg-[rgb(var(--ec-card-bg))] text-left transition-colors hover:border-[rgb(var(--ec-accent))] hover:bg-[rgb(var(--ec-accent-subtle)/0.3)] focus:outline-none focus:ring-2 focus:ring-[rgb(var(--ec-accent))]"
  >
    <span className="flex items-center justify-center w-9 h-9 shrink-0 rounded-md bg-[rgb(var(--ec-accent-subtle)/0.5)] text-[rgb(var(--ec-accent))]">
      {icon}
    </span>
    <span className="flex flex-col gap-0.5">
      <span className="text-sm font-medium text-[rgb(var(--ec-page-text))]">
        {title}
      </span>
      <span className="text-xs text-[rgb(var(--ec-page-text-muted))]">
        {description}
      </span>
    </span>
  </button>
);

/** Picks how to export the diagram: as an image, or as a Mermaid file */
const ExportModal = memo(function ExportModal({
  onClose,
  onExportImage,
  onExportMermaid,
}: ExportModalProps) {
  // Closes on Escape, as the menus do
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  const choose = (exportDiagram: () => void) => () => {
    onClose();
    exportDiagram();
  };

  return (
    <>
      <div
        className="absolute inset-0 bg-black/20 z-40"
        onClick={onClose}
        style={{ animation: "fadeIn 150ms ease-out" }}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="export-modal-title"
        className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-[rgb(var(--ec-page-bg))] rounded-lg shadow-xl z-50 w-[calc(100%-2rem)] max-w-md p-6 border border-[rgb(var(--ec-page-border))]"
        style={{ animation: "slideInCenter 250ms ease-out" }}
      >
        {/* Only a short rise: the -translate-x/y-1/2 classes centre the modal
            with the translate property, which a transform here would add to */}
        <style>{`
          @keyframes fadeIn {
            from { opacity: 0; }
            to { opacity: 1; }
          }
          @keyframes slideInCenter {
            from { opacity: 0; transform: translateY(8px); }
            to { opacity: 1; transform: none; }
          }
        `}</style>

        <div className="flex justify-between items-start mb-4">
          <h3
            id="export-modal-title"
            className="text-lg font-semibold text-[rgb(var(--ec-page-text))]"
          >
            Export
          </h3>
          <button
            onClick={onClose}
            className="text-[rgb(var(--ec-page-text-muted))] hover:text-[rgb(var(--ec-page-text))] transition-colors"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex flex-col gap-2">
          <ExportOption
            icon={<Image className="w-5 h-5" />}
            title="Export as image"
            description="Download the diagram as a PNG image."
            onClick={choose(onExportImage)}
          />
          <ExportOption
            icon={<Code className="w-5 h-5" />}
            title="Export as Mermaid"
            description="Download the diagram as a Mermaid (.mmd) file, to use in docs, wikis or other tools."
            onClick={choose(onExportMermaid)}
          />
        </div>
      </div>
    </>
  );
});

export default ExportModal;
