import React from 'react';
import MonacoEditor from '@monaco-editor/react';

import { DocumentTextIcon, CodeIcon } from '@heroicons/react/solid';

const Editor = ({ value, theme = 'vs-dark', language = 'json', minimap = false }) => {
  const tabs = [
    { name: 'Schema', href: '#', icon: DocumentTextIcon, current: true },
    { name: 'Example Event', href: '#', icon: CodeIcon, current: false },
  ];

  function classNames(...classes) {
    return classes.filter(Boolean).join(' ');
  }

  return (
    <section >
      <div>
        <div className="sm:hidden">
          <label htmlFor="tabs" className="sr-only">
            Select a tab
          </label>
          {/* Use an "onChange" listener to redirect the user to the selected tab URL. */}
          <select id="tabs" name="tabs" className="block w-full focus:ring-indigo-500 focus:border-indigo-500 border-gray-300 rounded-md" defaultValue={tabs.find((tab) => tab.current).name}>
            {tabs.map((tab) => (
              <option key={tab.name}>{tab.name}</option>
            ))}
          </select>
        </div>
        <div className="hidden sm:block">
          <div className="border-b border-gray-200">
            <nav className="-mb-px flex space-x-8" aria-label="Tabs">
              {tabs.map((tab) => (
                <a
                  key={tab.name}
                  href={tab.href}
                  className={classNames(
                    tab.current ? 'border-indigo-500 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300',
                    'group inline-flex items-center py-4 px-1 border-b-2 font-medium text-sm'
                  )}
                  aria-current={tab.current ? 'page' : undefined}
                >
                  <tab.icon className={classNames(tab.current ? 'text-indigo-500' : 'text-gray-400 group-hover:text-gray-500', '-ml-0.5 mr-2 h-5 w-5')} aria-hidden="true" />
                  <span>{tab.name}</span>
                </a>
              ))}
            </nav>
          </div>
        </div>
      </div>
      <MonacoEditor
        height="500px"
        width="100%"
        defaultLanguage={language}
        className="border border-gray-100 mt-1"
        defaultValue={JSON.stringify(value, null, 4)}
        theme={theme}
        options={{ minimap: { enabled: minimap }, readOnly: true }}
      />
    </section>
  );
};

export default Editor;
