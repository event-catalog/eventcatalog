import React from 'react'
import MonacoEditor from '@monaco-editor/react'

import { DocumentTextIcon, CodeIcon } from '@heroicons/react/solid'

const Editor = ({ value, theme = 'vs-dark', language = 'json', minimap = false }) => {
  const tabs = [
    { name: 'Schema', href: '#', icon: DocumentTextIcon, current: true }
  ]

  function classNames(...classes) {
    return classes.filter(Boolean).join(' ')
  }

  return (
    <section>
      <h2 className="text-lg font-medium text-gray-700 underline">Event Schema</h2>
      <MonacoEditor
        height="800px"
        width="100%"
        defaultLanguage={language}
        className="border border-gray-200 shadow-sm mt-1"
        defaultValue={JSON.stringify(value, null, 4)}
        options={{ minimap: { enabled: true }, readOnly: true }}
      />
    </section>
  )
}

export default Editor
