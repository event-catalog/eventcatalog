import React from 'react';

function Hero() {
  return (
    <div className="bg-white">
      <div className="relative overflow-hidden">
        <div className="relative sm:pb-12">
          <div className="mt-12 md:mt-16 mx-auto max-w-7xl px-4 sm:px-6">
            <div className="text-center">
              <div className="flex items-center text-xl justify-center space-x-4 -ml-4">
                <img src="/img/logo.svg" className="hidden md:block" alt="Logo" style={{ height: '85px' }} />
                <h1 className="text-4xl md:text-7xl font-bold">EventCatalog</h1>
              </div>
              <p className="max-w-md mx-auto text-base text-gray-500 sm:text-lg md:mt-5 md:text-xl md:max-w-3xl">
                Discover, Explore and Document your Event Driven Architectures.
              </p>
              <div className="mt-5 max-w-md mx-auto sm:flex sm:justify-center md:mt-8">
                <div className="rounded-md shadow">
                  <a
                    href="/docs/installation"
                    className="w-full flex items-center justify-center px-8 py-3 border border-transparent text-base font-medium rounded-md text-white bg-gray-800 hover:bg-gray-700 md:py-3 md:text-lg md:px-10"
                  >
                    Get started
                  </a>
                </div>
                <div className="mt-3 rounded-md shadow sm:mt-0 sm:ml-3">
                  <a
                    href="https://demo.eventcatalog.dev/"
                    target="_blank"
                    rel="noreferrer"
                    className="w-full flex items-center justify-center px-8 py-3 border border-transparent text-base font-medium rounded-md text-gray-600 bg-white hover:bg-gray-50 md:py-3 md:text-lg md:px-10"
                  >
                    Live demo
                  </a>
                </div>
              </div>
              <div className="mt-10 space-x-6">
                <span>License: MIT</span>
                <a className="text-gray-800 underline" href="https://github.com/boyney123/eventcatalog">
                  GitHub
                </a>
              </div>
            </div>
          </div>
        </div>

        <div className="relative mt-4 md:mt-0">
          <div className="absolute inset-0 flex flex-col" aria-hidden="true">
            <div className="flex-1" />
            <div className="flex-1 w-full bg-gray-800" />
          </div>
          <div className="max-w-7xl mx-auto px-4 sm:px-6">
            <img className="relative rounded-lg shadow-xl" alt="EventCatalog Screenshot" src="/img/eventcatalog-screen1.png" />
          </div>
        </div>
      </div>

      <div className="bg-gray-800 hidden md:block">
        <div className="max-w-7xl mx-auto py-16 px-4 sm:py-24 sm:px-6 lg:px-8" />
      </div>
    </div>
  );
}

export default Hero;
