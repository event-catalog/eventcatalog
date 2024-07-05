import { Panel, useReactFlow, getRectOfNodes } from 'reactflow';
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
    const nodesBounds = getRectOfNodes(getNodes());

    // Hide the button
    // @ts-ignore
    document.getElementById('download-visual').style.display = 'none';
    // @ts-ignore
    document.querySelector('.react-flow__controls').style.display = 'none';

    // @ts-ignore
    toPng(document.querySelector('.react-flow'), {
      backgroundColor: '#f1f1f1',
      width: imageWidth * 1.2,
      height: imageHeight,
      style: {
        width: imageWidth * 1.2,
        height: imageHeight,
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
    <Panel position="top-right" id="download-visual">
      <button
        className={`hidden md:flex bg-white group download-btn items-center space-x-1 text-[14px] border border-gray-200 px-1 py-0.5 rounded-md hover:bg-gray-100/50 ${addPadding ? 'mt-14' : '-mt-1'}`}
        onClick={onClick}
      >
        <DocumentArrowDownIcon className="w-4 h-4 group-hover:text-purple-500" />
        <span className="group-hover:text-purple-500">Download visual </span>
      </button>
    </Panel>
  );
}

export default DownloadButton;
