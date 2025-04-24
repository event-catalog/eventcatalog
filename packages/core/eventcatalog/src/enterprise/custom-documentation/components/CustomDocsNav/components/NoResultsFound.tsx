import React from 'react';

interface NoResultsFoundProps {
  searchTerm: string;
}

const NoResultsFound: React.FC<NoResultsFoundProps> = ({ searchTerm }) => (
  <div className="px-4 py-6 text-center">
    <div className="text-gray-400 text-sm mb-2">No results found for "{searchTerm}"</div>
    <div className="text-gray-400 text-xs">
      Try:
      <ul className="mt-2 space-y-1 text-left list-disc pl-4">
        <li>Checking for typos</li>
        <li>Using fewer keywords</li>
        <li>Using more general terms</li>
      </ul>
    </div>
  </div>
);

export default React.memo(NoResultsFound);
