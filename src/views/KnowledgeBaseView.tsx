import React, { useState, useEffect } from 'react';
import { tauriApi } from '../utils/tauriApi';
import type { CrateInfo } from '../types';
import GlobalSearch from '../components/GlobalSearch';
import { BookOpen, Package, ShieldCheck, ShieldOff, Clock } from 'lucide-react';
import ReactMarkdown from 'react-markdown';

interface KnowledgeBaseViewProps {
  knownCrates: CrateInfo[];
}

const KnowledgeBaseView: React.FC<KnowledgeBaseViewProps> = ({ knownCrates }) => {
  const [newCrateName, setNewCrateName] = useState('');
  const [isQualifying, setIsQualifying] = useState(false);
  const [architectureMd, setArchitectureMd] = useState<string | null>(null);

  useEffect(() => {
    // TODO: Create and call a tauri command to get architecture.md content
    // tauriApi.getArchitectureDocContent().then(setArchitectureMd);
    setArchitectureMd("## Architecture Overview\n\n*Stub: This content would be loaded from `docs/architecture.md`.*\n\n- **Web Layer**: Handles incoming HTTP requests.\n- **Service Layer**: Contains core business logic.\n- **Data Layer**: Interacts with the database.\n\n**Rules:**\n1. Web Layer MUST NOT directly access the Data Layer.");
  }, []);

  const handleQualifyCrate = async () => {
    if (!newCrateName.trim()) return;
    setIsQualifying(true);
    try {
      // TODO: Create and call a tauri command for this
      // await tauriApi.qualifyNewCrate(newCrateName);
      alert(`Qualification process started for '${newCrateName}'.`);
      setNewCrateName('');
    } catch (error) {
      console.error("Failed to qualify crate:", error);
    } finally {
      setIsQualifying(false);
    }
  };

  const CrateStatusIcon = ({ status }: { status: CrateInfo['approval_status'] }) => {
    switch (status) {
      case 'Approved': return <ShieldCheck className="h-5 w-5 text-green-500" />;
      case 'Rejected': return <ShieldOff className="h-5 w-5 text-red-500" />;
      case 'Pending': return <Clock className="h-5 w-5 text-yellow-500" />;
      default: return <Package className="h-5 w-5 text-text-secondary" />;
    }
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-text-main">Knowledge Base</h1>
        <p className="text-text-secondary mt-1">Manage project dependencies, search the codebase, and review architecture.</p>
      </div>

      <GlobalSearch />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-surface p-6 rounded-lg shadow-lg">
          <h3 className="text-xl font-semibold text-text-main mb-4 flex items-center"><Package className="h-5 w-5 mr-2"/>Crate Management</h3>
          <div className="flex gap-2 mb-4">
            <input
              type="text"
              value={newCrateName}
              onChange={(e) => setNewCrateName(e.target.value)}
              placeholder="Enter crate name to qualify..."
              className="flex-grow p-2 rounded bg-background text-text-main border border-border"
            />
            <button onClick={handleQualifyCrate} disabled={isQualifying} className="bg-primary hover:bg-primary-hover text-white font-semibold px-4 py-2 rounded">
              {isQualifying ? "..." : "Qualify"}
            </button>
          </div>
          <div className="space-y-3 max-h-96 overflow-y-auto pr-2">
            {knownCrates.length > 0 ? knownCrates.map(crateInfo => (
              <div key={crateInfo.name} className="p-3 bg-background rounded-md flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <CrateStatusIcon status={crateInfo.approval_status} />
                  <div>
                    <p className="font-medium text-text-main">{crateInfo.name} <span className="text-xs text-text-secondary">{crateInfo.version}</span></p>
                    <p className="text-xs text-text-secondary">{crateInfo.documentation_summary || "No summary available."}</p>
                  </div>
                </div>
                {crateInfo.approval_status === 'Pending' && (
                  <div className="flex gap-2">
                    <button className="text-xs px-2 py-1 bg-green-600 rounded hover:bg-green-700">Approve</button>
                    <button className="text-xs px-2 py-1 bg-red-600 rounded hover:bg-red-700">Reject</button>
                  </div>
                )}
              </div>
            )) : <p className="text-text-secondary text-center py-4">No crates have been processed yet.</p>}
          </div>
        </div>

        <div className="bg-surface p-6 rounded-lg shadow-lg">
          <h3 className="text-xl font-semibold text-text-main mb-4 flex items-center"><BookOpen className="h-5 w-5 mr-2"/>Architecture Document</h3>
          <div className="prose prose-invert prose-sm bg-background p-4 rounded-md max-h-[26rem] overflow-y-auto">
            {architectureMd ? <ReactMarkdown>{architectureMd}</ReactMarkdown> : <p>Loading architecture document...</p>}
          </div>
        </div>
      </div>
    </div>
  );
};

export default KnowledgeBaseView;