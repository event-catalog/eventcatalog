import type { CollectionEntry } from 'astro:content';
import { getIconForProtocol } from '@utils/protocols';

const ChannelParameters = (data: CollectionEntry<'channels'>['data']) => {
  return (
    <div className="container mx-auto py-4 not-prose space-y-4">
      <div>
        <h4 className="text-2xl font-bold">Channel information</h4>
      </div>

      <div>
        <p className="text-md">
          {data.address && (
            <div>
              <span className="font-semibold">Address:</span> <code className="bg-gray-100 p-1 rounded">{data.address}</code>
            </div>
          )}
          {data.protocols && data.protocols.length > 0 && (
            <div className="mt-2 flex items-center space-x-1">
              <span className="font-semibold">{data.protocols.length > 1 ? 'Protocols:' : 'Protocol:'}</span>
              <ul className="space-x-2 flex">
                {data.protocols.map((protocol) => {
                  const IconComponent = getIconForProtocol(protocol.toLowerCase());
                  return (
                    <li key={protocol} className=" text-sm flex items-center space-x-1  bg-gray-100 rounded-md px-1">
                      {IconComponent && <IconComponent className="w-4 h-4" />}
                      <span>{protocol}</span>
                    </li>
                  );
                })}
              </ul>
            </div>
          )}
        </p>
      </div>

      {data.parameters && Object.keys(data.parameters).length > 0 && (
        <div className="overflow-x-auto">
          <table className="min-w-full bg-white border border-gray-300">
            <thead>
              <tr className="bg-purple-500 text-white">
                <th className="py-2 px-4 border-b text-left">Parameter</th>
                <th className="py-2 px-4 border-b text-left">Description</th>
                <th className="py-2 px-4 border-b text-left">Options</th>
                <th className="py-2 px-4 border-b text-left">Default</th>
              </tr>
            </thead>
            <tbody>
              {Object.entries(data.parameters).map(([param, details]) => (
                <tr className="hover:bg-gray-50" key={param}>
                  <td className="py-2 px-4 border-b">{param}</td>
                  <td className="py-2 px-4 border-b">{details.description}</td>
                  <td className="py-2 px-4 border-b">{details.enum ? details.enum.join(', ') : 'N/A'}</td>
                  <td className="py-2 px-4 border-b">{details.default || 'N/A'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default ChannelParameters;
