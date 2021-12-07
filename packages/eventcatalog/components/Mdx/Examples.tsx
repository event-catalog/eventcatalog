import React, { useState } from 'react'
import SyntaxHighlighter from '@/components/SyntaxHighlighter'

function classNames(...classes) {
  return classes.filter(Boolean).join(' ')
}

const Examples = ({ title = 'Examples', description, examples = [], showLineNumbers }) => {
  const tabs = examples.map((example, index) => {
    return {
      name: example.name || `Example ${index + 1}`,
      content: example.snippet,
      description: example.description,
      langugage: example.langugage,
    }
  })

  const [selectedTab, setSelectedTab] = useState(tabs[0])

  const handleTabSelection = (selectedTab) => {
    setSelectedTab(selectedTab)
  }

  return (
    <div className="my-5 examples">
      <div className="">
        <h2 className="text-lg font-medium text-gray-700 underline">{title}</h2>
        {description && <p className="text-md font-medium text-gray-700">{description}</p>}

        <div>
          <nav className="-mb-px flex" aria-label="Tabs">
            {tabs.map((tab) => {
              const isSelected = tab.name === selectedTab.name
              return (
                <button
                  key={tab.name}
                  onClick={() => handleTabSelection(tab)}
                  className={classNames(
                    isSelected
                      ? 'border-green-500 text-green-600 selected'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300',
                    'whitespace-nowrap py-4 border-b-2 font-medium text-sm important:no-underline px-8 hover:bg-gray-50 transition'
                  )}
                  aria-current={isSelected ? 'page' : undefined}
                >
                  {tab.name}
                  <span className="block text-xs mt-">({tab.langugage})</span>
                </button>
              )
            })}
          </nav>
          <div className="my-4">
            <SyntaxHighlighter language={selectedTab.langugage} showLineNumbers={showLineNumbers}>
              {selectedTab.content}
            </SyntaxHighlighter>
            {selectedTab.langugage && (
              <span className="-mb-2 block text-xs text-right font-bold">{selectedTab.name}</span>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default Examples
