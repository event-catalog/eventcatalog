import React from 'react'

const landing = () => {
  return (
    <div className="pb-20 ">
      <div className="text-center py-10">
        <h1 className="text-4xl tracking-tight font-extrabold text-gray-900 sm:text-5xl md:text-6xl">
          <span className="block xl:inline">Explore & Discover</span>{' '}
          <span className="block text-indigo-600 xl:inline">Events</span>
        </h1>
        <p className="mt-3 max-w-md mx-auto text-base text-gray-500 sm:text-lg md:mt-5 md:text-xl md:max-w-3xl">
          The easisit event catalog in the world.
        </p>
      </div>
      <div className="flex justify-evenly ">
        <div className="border-gray-200 border rounded-lg shadow-lg w-1/4 h-96">
          <div className="h-64">Image</div>
          <div className="px-10">Text</div>
        </div>
        <div className="border-gray-200 border rounded-lg shadow-lg w-1/4 h-96">2</div>
        <div className="border-gray-200 border rounded-lg shadow-lg w-1/4 h-96">3</div>
      </div>
    </div>
  )
}

export default landing
