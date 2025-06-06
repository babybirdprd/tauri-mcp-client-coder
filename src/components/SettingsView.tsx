import React from 'react';

const SettingsView: React.FC = () => {
  // TODO: Implement form fields and logic to load/save settings via tauriApi.
  return (
    <div className="p-4">
      <h2 className="text-2xl font-semibold mb-6 text-indigo-400">Settings</h2>
      <div className="space-y-6">
        <div className="bg-gray-800 p-6 rounded-lg shadow">
            <h3 className="text-xl font-medium text-gray-200 mb-3">AI Model Configuration</h3>
            <p className="text-gray-400">Configure Tier 1/Tier 2 model aliases and API keys here.</p>
        </div>
        <div className="bg-gray-800 p-6 rounded-lg shadow">
            <h3 className="text-xl font-medium text-gray-200 mb-3">Autonomy & Git</h3>
            <p className="text-gray-400">Set autonomy level, self-correction attempts, and Git commit strategy here.</p>
        </div>
        <div className="bg-gray-800 p-6 rounded-lg shadow">
            <h3 className="text-xl font-medium text-gray-200 mb-3">External MCP Servers</h3>
            <p className="text-gray-400">Manage connections to external tool servers here.</p>
        </div>
        <div className="bg-gray-800 p-6 rounded-lg shadow">
            <h3 className="text-xl font-medium text-gray-200 mb-3">Search Index</h3>
            {/* TODO: Add button to trigger tauriApi.rebuildProjectSearchIndex() */}
            <button className="mt-2 bg-purple-600 hover:bg-purple-700 text-white font-bold py-2 px-4 rounded">
                Rebuild Tantivy Index
            </button>
        </div>
      </div>
    </div>
  );
};

export default SettingsView;