import React, { useState } from 'react';
import SyntaxHighlighter from '@/components/SyntaxHighlighter';

function classNames(...classes) {
  return classes.filter(Boolean).join(' ');
}

interface ExampleProps {
  title?: string;
  description?: string;
  examples: any;
  showLineNumbers?: boolean;
}

function Examples({ title = 'Examples', description, examples = [], showLineNumbers }: ExampleProps) {
  const tabs = examples.map((example, index) => ({
    name: example.name || `Example ${index + 1}`,
    content: example.snippet,
    description: example.description,
    langugage: example.langugage,
  }));

  const [selectedTab, setSelectedTab] = useState(tabs[0]);

  const handleTabSelection = (tab: string) => {
    setSelectedTab(tab);
  };

  return (
    <div className="my-5 examples">
      <div className="">
        <h2 className="text-lg font-medium text-gray-700 underline">{title}</h2>
        {description && <p className="text-md font-medium text-gray-700">{description}</p>}

        <div>
          <div className="col-span-5">
            <nav className="-mb-2 flex bg-gray-900 w-full overflow-hidden overflow-x-scroll" aria-label="Tabs">
              {tabs.map((tab) => {
                const isSelected = tab.name === selectedTab.name;
                return (
                  <button
                    type="button"
                    key={tab.name}
                    onClick={() => handleTabSelection(tab)}
                    className={classNames(
                      isSelected
                        ? 'border-yellow-300 text-yellow-300 selected bg-gray-700'
                        : 'border-transparent text-gray-500 hover:text-gray-400 bg-gray-800  ',
                      'whitespace-nowrap py-3 border-b-2 font-medium important:no-underline px-6 text-xs  transition '
                    )}
                    aria-current={isSelected ? 'page' : undefined}
                  >
                    {tab.name}
                  </button>
                );
              })}
            </nav>
            <div>
              <SyntaxHighlighter language={selectedTab.langugage} showLineNumbers={showLineNumbers}>
                {selectedTab.content}
              </SyntaxHighlighter>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Examples;
