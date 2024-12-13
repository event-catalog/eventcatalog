import { Panel, useReactFlow, getNodesBounds, getViewportForBounds } from '@xyflow/react';
import { toPng } from 'html-to-image';
import { DocumentArrowDownIcon } from '@heroicons/react/24/outline';

function downloadImage(dataUrl: string, filename?: string) {
  const a = document.createElement('a');

  a.setAttribute('download', `${filename || 'eventcatalog'}.png`);
  a.setAttribute('href', dataUrl);
  a.click();
}

const imageWidth = 1024;
const imageHeight = 768;

function DownloadButton({ filename, addPadding = true }: { filename?: string; addPadding?: boolean }) {
  const { getNodes } = useReactFlow();
  const onClick = () => {
    const nodesBounds = getNodesBounds(getNodes());
    const width = imageWidth > nodesBounds.width ? imageWidth : nodesBounds.width;
    const height = imageHeight > nodesBounds.height ? imageHeight : nodesBounds.height;
    const viewport = getViewportForBounds(nodesBounds, width, height, 0.5, 2, 0);

    // Hide the button
    // @ts-ignore
    document.getElementById('download-visual').style.display = 'none';
    // @ts-ignore
    document.querySelector('.react-flow__controls').style.display = 'none';

    // @ts-ignore
    toPng(document.querySelector('.react-flow__viewport'), {
      backgroundColor: '#f1f1f1',
      width,
      height,
      style: {
        width,
        height,
        transform: `translate(${viewport.x}px, ${viewport.y}px) scale(${viewport.zoom})`,
      },
    }).then((dataUrl: string) => {
      downloadImage(dataUrl, filename);
      // @ts-ignore
      document.getElementById('download-visual').style.display = 'block';
      // @ts-ignore
      document.querySelector('.react-flow__controls').style.display = 'block';
    });
  };

  return (
    <div id="download-visual">
      <button
        className={`hidden md:flex bg-white group download-btn items-center space-x-1 text-[14px] border border-gray-200 px-1 py-0.5 rounded-md hover:bg-gray-100/50 ${addPadding ? 'mt-14' : '-mt-1'}`}
        onClick={onClick}
      >
        <DocumentArrowDownIcon className="w-4 h-4 group-hover:text-primary" />
        <span className="group-hover:text-primary">Export visual </span>
      </button>
    </div>
  );
}

export default DownloadButton;
