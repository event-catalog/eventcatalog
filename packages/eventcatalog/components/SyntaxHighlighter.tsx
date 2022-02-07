import React, { useState } from 'react';

import codeStyle from 'react-syntax-highlighter/dist/cjs/styles/prism/dracula';
import { Prism as PrismSyntaxHighlighter } from 'react-syntax-highlighter';
import copy from 'copy-text-to-clipboard';
import { ClipboardCopyIcon } from '@heroicons/react/outline';

function SyntaxHighlighter({ language, name = '', ...props }: any) {
  const [showCopied, setShowCopied] = useState(false);

  const handleCopyCode = () => {
    copy(props.children);
    setShowCopied(true);
    setTimeout(() => setShowCopied(false), 2000);
  };

  const regex = /\\n/g;
  return (
    <div className="h-96 relative">
      {name && (
        <div className={`flex -mb-3 pb-2 bg-gray-900 ${name ? 'justify-between' : 'justify-end'}`}>
          {name && <span className="block text-xs py-2 px-2 font-bold text-gray-300">{name}</span>}
          <button type="button" onClick={handleCopyCode} className="text-xs  text-white rounded-md px-4">
            {showCopied ? 'Copied' : <ClipboardCopyIcon className="h-4 w-4" />}
          </button>
        </div>
      )}

      {!name && (
        <button type="button" onClick={handleCopyCode} className="text-xs absolute right-0 top-2 text-white rounded-md px-4">
          {showCopied ? 'Copied' : <ClipboardCopyIcon className="h-4 w-4" />}
        </button>
      )}

      <PrismSyntaxHighlighter style={codeStyle} language={language} {...props} wrapLines className="h-96 overflow-auto">
        {props.children.replace(regex, '\n')}
      </PrismSyntaxHighlighter>
    </div>
  );
}

export default SyntaxHighlighter;
