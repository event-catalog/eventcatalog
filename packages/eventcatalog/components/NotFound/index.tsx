import { DocumentAddIcon } from '@heroicons/react/solid';

interface NotFoundProps {
  type: 'service' | 'event' | 'domain';
  name: string;
  editUrl?: string;
}

export default function Example(props: NotFoundProps) {
  const { type, name, editUrl } = props;

  return (
    <main className="min-h-full bg-cover bg-top sm:bg-top h-screen">
      <div className="max-w-7xl mx-auto px-4 py-16 text-center sm:px-6 sm:py-24 lg:px-8 lg:py-48">
        <p className="text-sm font-semibold text-gray-700 text-opacity-50 uppercase tracking-wide blur-xl">
          Failed to find {type}
        </p>
        <h1 className="mt-2 text-4xl font-extrabold text-gray-900 tracking-tight sm:text-5xl">Missing Documentation</h1>
        <p className="mt-2 text-lg font-medium text-gray-700 text-opacity-50 text-center ">
          Documentation for {type} is missing!
          <span className="block font-bold text-gray-800 underline break-all max-w-2xl mx-auto py-4">{name}</span>
        </p>
        <p className="mt-4 text-xs text-gray-400">Help the eco-system and add the documentation for others ❤️ </p>
        {editUrl && (
          <div className="mt-12">
            <a
              href={editUrl}
              target="_blank"
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-black bg-opacity-75 "
              rel="noreferrer"
            >
              <DocumentAddIcon className="-ml-1 mr-2 h-5 w-5" aria-hidden="true" />
              Add missing <span className="underline px-1">{type}</span> documentation
            </a>
          </div>
        )}
      </div>
    </main>
  );
}
