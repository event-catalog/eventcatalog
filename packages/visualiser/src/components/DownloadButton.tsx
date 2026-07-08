import { useReactFlow, useStoreApi, getNodesBounds } from "@xyflow/react";
import { toPng } from "html-to-image";
import { DocumentArrowDownIcon } from "@heroicons/react/24/outline";
import {
  getExportImageDimensions,
  injectExportStyles,
} from "../utils/export-image";

function downloadImage(dataUrl: string, filename?: string) {
  const a = document.createElement("a");

  a.setAttribute("download", `${filename || "eventcatalog"}.png`);
  a.setAttribute("href", dataUrl);
  a.click();
}

function DownloadButton({
  filename,
  addPadding = true,
}: {
  filename?: string;
  addPadding?: boolean;
}) {
  const { getNodes } = useReactFlow();
  const storeApi = useStoreApi();
  const onClick = () => {
    // nodeLookup resolves child node positions (relative to their parent
    // group) to absolute coordinates — without it grouped graphs get cropped
    const nodesBounds = getNodesBounds(getNodes(), {
      nodeLookup: storeApi.getState().nodeLookup,
    });
    const { width, height, viewport } = getExportImageDimensions(nodesBounds);

    // Hide the button
    // @ts-ignore
    document.getElementById("download-visual").style.display = "none";
    // @ts-ignore
    document.querySelector(".react-flow__controls").style.display = "none";

    const viewportElement = document.querySelector(
      ".react-flow__viewport",
    ) as HTMLElement;
    const removeExportStyles = injectExportStyles(viewportElement);

    toPng(viewportElement, {
      backgroundColor: "#f1f1f1",
      width,
      height,
      style: {
        width: `${width}px`,
        height: `${height}px`,
        transform: `translate(${viewport.x}px, ${viewport.y}px) scale(${viewport.zoom})`,
      },
    })
      .then((dataUrl: string) => {
        downloadImage(dataUrl, filename);
      })
      .finally(() => {
        removeExportStyles();
        // @ts-ignore
        document.getElementById("download-visual").style.display = "block";
        // @ts-ignore
        document.querySelector(".react-flow__controls").style.display = "block";
      });
  };

  return (
    <div id="download-visual">
      <button
        className={`ec-download-btn md:flex bg-white group download-btn items-center space-x-1 text-[14px] border border-gray-200 px-1 py-0.5 rounded-md hover:bg-gray-100/50 ${addPadding ? "mt-14" : "-mt-1"}`}
        onClick={onClick}
      >
        <DocumentArrowDownIcon className="w-4 h-4 group-hover:text-primary" />
        <span className="group-hover:text-primary">Export visual </span>
      </button>
    </div>
  );
}

export default DownloadButton;
