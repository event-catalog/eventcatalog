import React from 'react';

export default function Example() {
  return (
    <div className="bg-white">
      <div className="max-w-7xl mx-auto text-center py-16 lg:py-12 px-4 sm:px-6 lg:py-24 lg:px-8">
        <h2 className="text-2xl font-extrabold tracking-tight text-gray-900 md:text-5xl">
          <span className="block">
            Ready to start using <span className="text-green-500">EventCatalog?</span>
          </span>
          <span className="block mt-4">Getting started within minutes.</span>
        </h2>
        <div className="mt-8 flex justify-center">
          <div className="inline-flex rounded-md shadow">
            <a
              href="/docs/installation"
              className="inline-flex items-center justify-center px-5 py-3 border border-transparent text-base font-medium rounded-md text-white bg-gray-800 hover:bg-gray-700"
            >
              Get started &rarr;
            </a>
          </div>
          <div className="ml-3 inline-flex">
            <a
              href="/docs/introduction"
              className="inline-flex items-center justify-center px-5 py-3 border border-transparent text-base font-medium rounded-md text-gray-700 bg-gray-100 hover:bg-gray-200"
            >
              Learn more
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
