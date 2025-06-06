import React, { useState, useEffect, useCallback } from 'react';
import { tauriApi, SpecFile as SpecFileType } from '../utils/tauriApi';

interface SpecsViewProps { refreshSessionState: () => void; }

const SpecsView: React.FC<SpecsViewProps> = ({ refreshSessionState }) => {
  const [specs, setSpecs] = useState<SpecFileType[]>([]);
  const [isLoadingSpecs, setIsLoadingSpecs] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [newProjectName, setNewProjectName] = useState('');
  const [basePath, setBasePath] = useState('');
  const [isScaffolding, setIsScaffolding] = useState(false);
  const [projectPathToLoad, setProjectPathToLoad] = useState('');
  const [isLoadingProject, setIsLoadingProject] = useState(false);

  const fetchSpecsForCurrentProject = useCallback(async () => {
    setIsLoadingSpecs(true); setError(null);
    try {
      const loadedSpecs = await tauriApi.loadSpecFiles();
      setSpecs(loadedSpecs);
    } catch (err: any) {
      setError(err.message || "Failed to load specs. Is a project active?");
      setSpecs([]);
    } finally { setIsLoadingSpecs(false); }
  }, []);

  useEffect(() => { fetchSpecsForCurrentProject(); }, [fetchSpecsForCurrentProject]);

  const handleScaffoldProject = async () => {
    if (!newProjectName.trim()) { setError("Project name cannot be empty."); return; }
    setIsScaffolding(true); setError(null);
    try {
        await tauriApi.scaffoldProject(newProjectName, basePath || undefined);
        refreshSessionState();
        fetchSpecsForCurrentProject();
        setNewProjectName(''); setBasePath('');
    } catch (err: any) { setError(err.message || "Scaffolding failed."); }
    finally { setIsScaffolding(false); }
  };

  const handleInitializeProject = async () => {
    if (!projectPathToLoad.trim()) { setError("Project path to load is empty."); return; }
    setIsLoadingProject(true); setError(null);
    try {
        await tauriApi.initializeProject(projectPathToLoad);
        refreshSessionState();
        fetchSpecsForCurrentProject();
        setProjectPathToLoad('');
    } catch (err: any) { setError(err.message || "Failed to initialize project."); }
    finally { setIsLoadingProject(false); }
  };

  const handleProcessSpec = async (specPath: string) => {
    setError(null);
    try {
        await tauriApi.startFullProcessingForSpec(specPath);
        refreshSessionState();
    } catch (err: any) { setError(err.message || "Failed to start spec processing."); }
  };

  return (
    <div className="p-4 space-y-8">
      <h2 className="text-3xl font-semibold text-gray-100">Project & Specifications</h2>
      {error && <div className="bg-red-500/20 border border-red-500 text-red-300 p-3 rounded-md">{error}</div>}

      <div className="grid md:grid-cols-2 gap-6">
        <div className="p-6 bg-gray-800 rounded-lg shadow-md">
          <h3 className="text-xl font-medium text-gray-200 mb-4">Initialize Existing Project</h3>
          <div className="flex gap-2">
            <input type="text" value={projectPathToLoad} onChange={(e) => setProjectPathToLoad(e.target.value)} placeholder="Enter absolute path to project" className="flex-grow p-2 rounded bg-gray-700 text-white border border-gray-600 focus:ring-indigo-500 focus:border-indigo-500"/>
            <button onClick={handleInitializeProject} disabled={isLoadingProject} className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded disabled:opacity-50 disabled:cursor-not-allowed">
              {isLoadingProject ? 'Loading...' : 'Load'}
            </button>
          </div>
        </div>
        <div className="p-6 bg-gray-800 rounded-lg shadow-md">
          <h3 className="text-xl font-medium text-gray-200 mb-4">Scaffold New Project</h3>
          <div className="space-y-3">
            <input type="text" value={newProjectName} onChange={(e) => setNewProjectName(e.target.value)} placeholder="New project name" className="w-full p-2 rounded bg-gray-700 text-white border border-gray-600"/>
            <input type="text" value={basePath} onChange={(e) => setBasePath(e.target.value)} placeholder="Optional: Base path (e.g., D:\\dev)" className="w-full p-2 rounded bg-gray-700 text-white border border-gray-600"/>
            <button onClick={handleScaffoldProject} disabled={isScaffolding} className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded disabled:opacity-50 disabled:cursor-not-allowed">
              {isScaffolding ? 'Scaffolding...' : 'Scaffold Project'}
            </button>
          </div>
        </div>
      </div>
      
      <div className="bg-gray-800 p-6 rounded-lg shadow-md">
        <h3 className="text-xl font-medium text-gray-200 mb-4">Available Specifications</h3>
        {isLoadingSpecs ? <p>Loading specifications...</p> : specs.length === 0 ? (
          <p className="text-gray-400">No specifications found. Load a project to see specs.</p>
        ) : (
          <ul className="space-y-3">
            {specs.map(spec => (
              <li key={spec.path} className="p-4 bg-gray-700/50 rounded-md shadow-sm flex justify-between items-center hover:bg-gray-700 transition-colors">
                <div>
                  <h4 className="font-semibold text-lg text-gray-100">{spec.name}</h4>
                  <p className="text-sm text-gray-400 truncate max-w-md" title={spec.content_preview}>{spec.content_preview}</p>
                  <p className="text-xs text-gray-500">Status: {spec.status}</p>
                </div>
                <button onClick={() => handleProcessSpec(spec.path)} className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-2 px-4 rounded text-sm">
                  Process Spec
                </button>
              </li>
            ))}
          </ul>
        )}
        <button onClick={fetchSpecsForCurrentProject} className="mt-4 bg-gray-600 hover:bg-gray-500 text-white py-2 px-3 rounded text-sm">Refresh Specs</button>
      </div>
    </div>
  );
};
export default SpecsView;