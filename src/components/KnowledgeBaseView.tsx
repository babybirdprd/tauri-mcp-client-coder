import React from 'react';
import { CrateInfo } from '../utils/tauriApi';
import GlobalSearch from './GlobalSearch';

interface KnowledgeBaseViewProps {
    knownCrates: CrateInfo[];
}

const KnowledgeBaseView: React.FC<KnowledgeBaseViewProps> = ({ knownCrates }) => {
  // TODO: Implement UI for approving/rejecting crates and adding new ones for qualification.
  return (
    <div className="p-4 space-y-6">
      <h2 className="text-2xl font-semibold text-indigo-400">Knowledge Base</h2>
      
      <div className="bg-gray-800 p-6 rounded-lg shadow">
        <h3 className="text-xl font-medium text-gray-200 mb-4">Known Crates</h3>
        {knownCrates.length > 0 ? (
            <ul className="space-y-2">
                {knownCrates.map(crateInfo => (
                    <li key={crateInfo.name} className="p-3 bg-gray-700 rounded">
                        <p className="font-semibold text-white">{crateInfo.name}</p>
                        <p className="text-sm text-gray-400">Status: {crateInfo.approval_status}</p>
                    </li>
                ))}
            </ul>
        ) : (
            <p className="text-gray-400">No crates have been processed yet.</p>
        )}
      </div>

      <GlobalSearch />

      <div className="bg-gray-800 p-6 rounded-lg shadow">
        <h3 className="text-xl font-medium text-gray-200 mb-3">Architecture</h3>
        {/* TODO: Add a viewer for docs/architecture.md */}
        <p className="text-gray-400">Architecture document viewer will be here.</p>
      </div>
    </div>
  );
};

export default KnowledgeBaseView;