import type { CollectionEntry } from 'astro:content';
import { getIconForProtocol } from '@utils/protocols';

const ChannelParameters = (data: CollectionEntry<'channels'>['data']) => {
  return (
    <div className="container mx-auto py-4 not-prose space-y-4">
      <div>
        <h4 className="text-2xl font-bold text-[rgb(var(--ec-page-text))]">Channel information</h4>
      </div>

      <div>
        <p className="text-md text-[rgb(var(--ec-page-text))]">
          {data.address && (
            <div>
              <span className="font-semibold">Address:</span>{' '}
              <code className="bg-[rgb(var(--ec-content-hover))] p-1 rounded text-[rgb(var(--ec-page-text))]">{data.address}</code>
            </div>
          )}
          {data.protocols && data.protocols.length > 0 && (
            <div className="mt-2 flex items-center space-x-1">
              <span className="font-semibold">{data.protocols.length > 1 ? 'Protocols:' : 'Protocol:'}</span>
              <ul className="space-x-2 flex">
                {data.protocols.map((protocol) => {
                  const IconComponent = getIconForProtocol(protocol.toLowerCase());
                  return (
                    <li
                      key={protocol}
                      className="text-sm flex items-center space-x-1 bg-[rgb(var(--ec-content-hover))] rounded-md px-1"
                    >
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
          <table className="min-w-full bg-[rgb(var(--ec-card-bg,var(--ec-page-bg)))] border border-[rgb(var(--ec-page-border))]">
            <thead>
              <tr className="bg-[rgb(var(--ec-accent))] text-white">
                <th className="py-2 px-4 border-b border-[rgb(var(--ec-page-border))] text-left">Parameter</th>
                <th className="py-2 px-4 border-b border-[rgb(var(--ec-page-border))] text-left">Description</th>
                <th className="py-2 px-4 border-b border-[rgb(var(--ec-page-border))] text-left">Options</th>
                <th className="py-2 px-4 border-b border-[rgb(var(--ec-page-border))] text-left">Default</th>
              </tr>
            </thead>
            <tbody>
              {Object.entries(data.parameters).map(([param, details]) => (
                <tr className="hover:bg-[rgb(var(--ec-content-hover))]" key={param}>
                  <td className="py-2 px-4 border-b border-[rgb(var(--ec-page-border))] text-[rgb(var(--ec-page-text))]">{param}</td>
                  <td className="py-2 px-4 border-b border-[rgb(var(--ec-page-border))] text-[rgb(var(--ec-page-text-muted))]">
                    {details.description}
                  </td>
                  <td className="py-2 px-4 border-b border-[rgb(var(--ec-page-border))] text-[rgb(var(--ec-page-text-muted))]">
                    {details.enum ? details.enum.join(', ') : 'N/A'}
                  </td>
                  <td className="py-2 px-4 border-b border-[rgb(var(--ec-page-border))] text-[rgb(var(--ec-page-text-muted))]">
                    {details.default || 'N/A'}
                  </td>
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
