import React, { useState } from 'react';

import codeStyle from 'react-syntax-highlighter/dist/cjs/styles/prism/dracula';
import { Prism as PrismSyntaxHighlighter } from 'react-syntax-highlighter';
import copy from 'copy-text-to-clipboard';

function SyntaxHighlighter({ language, name = '', ...props }: any) {
  const [showCopied, setShowCopied] = useState(false);

  const handleCopyCode = () => {
    copy(props.children);
    setShowCopied(true);
    setTimeout(() => setShowCopied(false), 2000);
  };

  const regex = /\\n/g;
  return (
    <div className="relative group">
      <button
        type="button"
        onClick={handleCopyCode}
        className="absolute top-2  right-5 text-sm bg-gray-700 text-white rounded-md py-1 px-4 transform transition opacity-0  group-hover:opacity-100"
      >
        {showCopied ? 'Copied' : 'Copy'}
      </button>
      <PrismSyntaxHighlighter style={codeStyle} language={language} {...props} wrapLines className="max-h-96 overflow-auto">
        {props.children.replace(regex, '\n')}
      </PrismSyntaxHighlighter>
      {name && <span className="-mb-2 block text-xs text-right font-bold">{name}</span>}
    </div>
  );
}

export default SyntaxHighlighter;
