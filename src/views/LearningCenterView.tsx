import React, { useState } from 'react';

const LearningCenterView: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'patterns' | 'corrections'>('patterns');

  // TODO: Fetch this data from the backend via new Tauri commands
  const solutionPatterns = [
    { id: 1, problem: "Make struct serializable", solution: "#[derive(Serialize, Deserialize)]", dependencies: "serde" },
    { id: 2, problem: "Create async main function", solution: "#[tokio::main]\nasync fn main()", dependencies: "tokio" },
  ];
  const correctionHistory = [
    { id: 1, problem: "Move borrowed value", error: "value borrowed here after move", before: "let s1 = String::from(\"...\");\nlet s2 = s1;", after: "let s1 = String::from(\"...\");\nlet s2 = s1.clone();" },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-text-main">Cognitive Core</h1>
        <p className="text-text-secondary mt-1">The agent's long-term memory of solutions and corrections.</p>
      </div>

      <div className="flex border-b border-border">
        <button onClick={() => setActiveTab('patterns')} className={`px-4 py-2 text-sm font-medium ${activeTab === 'patterns' ? 'border-b-2 border-primary text-text-main' : 'text-text-secondary'}`}>Solution Patterns</button>
        <button onClick={() => setActiveTab('corrections')} className={`px-4 py-2 text-sm font-medium ${activeTab === 'corrections' ? 'border-b-2 border-primary text-text-main' : 'text-text-secondary'}`}>Correction History</button>
      </div>

      <div className="bg-surface p-6 rounded-lg shadow-lg">
        {activeTab === 'patterns' && (
          <ul className="space-y-4">
            {solutionPatterns.map(p => (
              <li key={p.id} className="p-4 bg-gray-900 rounded-md">
                <p className="text-text-secondary text-sm">Problem: <span className="text-text-main font-medium">{p.problem}</span></p>
                <p className="text-text-secondary text-sm">Dependencies: <span className="font-mono text-xs bg-gray-700 px-1 py-0.5 rounded">{p.dependencies}</span></p>
                <pre className="bg-black p-2 rounded mt-2 text-sm text-cyan-400 font-mono">{p.solution}</pre>
              </li>
            ))}
          </ul>
        )}
        {activeTab === 'corrections' && (
          <ul className="space-y-4">
            {correctionHistory.map(c => (
              <li key={c.id} className="p-4 bg-gray-900 rounded-md">
                <p className="text-text-secondary text-sm">Error Type: <span className="text-text-main font-medium">{c.error}</span></p>
                <div className="grid grid-cols-2 gap-4 mt-2">
                  <div>
                    <p className="text-red-400 text-xs font-semibold mb-1">BEFORE (Failed)</p>
                    <pre className="bg-black p-2 rounded text-sm text-red-400/80 font-mono">{c.before}</pre>
                  </div>
                  <div>
                    <p className="text-green-400 text-xs font-semibold mb-1">AFTER (Succeeded)</p>
                    <pre className="bg-black p-2 rounded text-sm text-green-400/80 font-mono">{c.after}</pre>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
};

export default LearningCenterView;