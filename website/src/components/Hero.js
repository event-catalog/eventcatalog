import React from 'react';

function Hero() {
  return (
    <div className="bg-white">
      <div className="relative overflow-hidden">
        <div className="relative sm:pb-12">
          <div className="mt-16 mx-auto max-w-7xl px-4 sm:px-6">
            <div className="text-center">
              <div className="flex items-center text-xl justify-center space-x-4 -ml-4">
                <img src="/img/logo.svg" alt="Logo" style={{ height: '85px' }} />
                <h1 className="text-7xl font-bold">EventCatalog</h1>
              </div>
              <p className="mt-3 max-w-md mx-auto text-base text-gray-500 sm:text-lg md:mt-5 md:text-xl md:max-w-3xl">
                Discover, Explore and Document your Event Driven Architectures.
              </p>
            </div>
          </div>
        </div>

        <div className="relative">
          <div className="absolute inset-0 flex flex-col" aria-hidden="true">
            <div className="flex-1" />
            <div className="flex-1 w-full bg-gray-800" />
          </div>
          <div className="max-w-7xl mx-auto px-4 sm:px-6">
            <img
              className="relative rounded-lg shadow-xl"
              alt="EventCatalog Screenshot"
              src="/img/eventcatalog-screen1.png"
            />
          </div>
        </div>
      </div>

      <div className="bg-gray-800">
        <div className="max-w-7xl mx-auto py-16 px-4 sm:py-24 sm:px-6 lg:px-8" />
      </div>
    </div>
  );
}

export default Hero;
