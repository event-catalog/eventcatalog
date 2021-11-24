import React, { useState } from 'react'

import codeStyle from 'react-syntax-highlighter/dist/cjs/styles/prism/vsc-dark-plus'
import { Prism as PrismSyntaxHighlighter } from 'react-syntax-highlighter'
import copy from 'copy-text-to-clipboard'

const SyntaxHighlighter = ({ language, ...props }) => {
  const [showCopied, setShowCopied] = useState(false)


  const handleCopyCode = () => {
    copy(props.children)
    setShowCopied(true)
    setTimeout(() => setShowCopied(false), 2000)
  }

// console.log('asdadasdas', 'random\n\nadsa')
  const regex = /\\n/g;

  console.log('passadas', props)

  return (
    <div className="relative group">
      <button onClick={handleCopyCode} className="absolute top-2  right-5 text-sm bg-gray-700 text-white rounded-md py-1 px-4 transform transition opacity-0  group-hover:opacity-100">
        {showCopied ? 'Copied': 'Copy'}
      </button>
      {/* <MDXRemote {...props.markdown.source} components={mdxComponents} /> */}
      {/* <PrismSyntaxHighlighter style={codeStyle} language={language} {...props} children={test} wrapLines={true} /> */}
      <PrismSyntaxHighlighter style={codeStyle} language={language} {...props} children={props.children.replace(regex, '\n')} wrapLines={true} />
    </div>
  )
}

export default SyntaxHighlighter

