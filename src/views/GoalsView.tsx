import React, { useState, useEffect, useCallback } from 'react';
import { tauriApi } from '../utils/tauriApi';
import type { SpecFile, CurrentProjectSession } from '../types';
import { FileText, FolderOpen, PlusCircle, RefreshCw, Play } from 'lucide-react';

interface GoalsViewProps {
  sessionState: CurrentProjectSession | null;
  refreshSessionState: () => void;
}

const GoalsView: React.FC<GoalsViewProps> = ({ sessionState, refreshSessionState }) => {
  const [specs, setSpecs] = useState<SpecFile[]>([]);
  const [isLoadingSpecs, setIsLoadingSpecs] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const [newProjectName, setNewProjectName] = useState('');
  const [basePath, setBasePath] = useState('');
  const [isScaffolding, setIsScaffolding] = useState(false);

  const [projectPathToLoad, setProjectPathToLoad] = useState('');
  const [isLoadingProject, setIsLoadingProject] = useState(false);

  const isProjectLoaded = !!sessionState?.project_path;

  const fetchSpecsForCurrentProject = useCallback(async () => {
    if (!isProjectLoaded) {
      setSpecs([]);
      return;
    }
    setIsLoadingSpecs(true);
    setError(null);
    try {
      const loadedSpecs = await tauriApi.loadSpecFiles();
      setSpecs(loadedSpecs);
    } catch (err: any) {
      setError(err.message || "Failed to load specs.");
      setSpecs([]);
    } finally {
      setIsLoadingSpecs(false);
    }
  }, [isProjectLoaded]);

  useEffect(() => {
    fetchSpecsForCurrentProject();
  }, [fetchSpecsForCurrentProject, sessionState?.project_path]);

  const handleScaffoldProject = async () => {
    if (!newProjectName.trim()) { setError("Project name cannot be empty."); return; }
    setIsScaffolding(true); setError(null);
    try {
      await tauriApi.scaffoldProject(newProjectName, basePath || undefined);
      // Backend now initializes the project automatically after scaffolding
      refreshSessionState();
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
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-text-main">Project & Goals</h1>
        <p className="text-text-secondary mt-1">Load an existing project or scaffold a new one to begin.</p>
      </div>
      {error && <div className="bg-red-900/50 border border-red-700 text-red-300 p-3 rounded-md text-sm">{error}</div>}

      <div className="grid md:grid-cols-2 gap-6">
        <div className="p-6 bg-surface rounded-lg shadow-lg">
          <h3 className="text-xl font-medium text-text-main mb-4 flex items-center"><FolderOpen className="h-5 w-5 mr-2 text-primary"/>Initialize Existing Project</h3>
          <div className="flex gap-2">
            <input type="text" value={projectPathToLoad} onChange={(e) => setProjectPathToLoad(e.target.value)} placeholder="Enter absolute path to project" className="flex-grow p-2 rounded bg-background text-text-main border border-border focus:ring-2 focus:ring-primary focus:border-primary outline-none"/>
            <button onClick={handleInitializeProject} disabled={isLoadingProject} className="bg-primary hover:bg-primary-hover text-white font-bold py-2 px-4 rounded disabled:opacity-50 disabled:cursor-not-allowed flex items-center">
              {isLoadingProject ? 'Loading...' : 'Load'}
            </button>
          </div>
        </div>
        <div className="p-6 bg-surface rounded-lg shadow-lg">
          <h3 className="text-xl font-medium text-text-main mb-4 flex items-center"><PlusCircle className="h-5 w-5 mr-2 text-secondary"/>Scaffold New Project</h3>
          <div className="space-y-3">
            <input type="text" value={newProjectName} onChange={(e) => setNewProjectName(e.target.value)} placeholder="New project name" className="w-full p-2 rounded bg-background text-text-main border border-border"/>
            <input type="text" value={basePath} onChange={(e) => setBasePath(e.target.value)} placeholder="Optional: Base path (e.g., D:\\dev)" className="w-full p-2 rounded bg-background text-text-main border border-border"/>
            <button onClick={handleScaffoldProject} disabled={isScaffolding} className="w-full bg-secondary hover:opacity-90 text-white font-bold py-2 px-4 rounded disabled:opacity-50 disabled:cursor-not-allowed">
              {isScaffolding ? 'Scaffolding...' : 'Scaffold Project'}
            </button>
          </div>
        </div>
      </div>
      
      <div className="bg-surface p-6 rounded-lg shadow-lg">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-xl font-medium text-text-main flex items-center"><FileText className="h-5 w-5 mr-2"/>Available Specifications</h3>
          <button onClick={fetchSpecsForCurrentProject} className="p-2 rounded-md hover:bg-gray-700 disabled:opacity-50" disabled={!isProjectLoaded || isLoadingSpecs}>
            <RefreshCw className={`h-4 w-4 text-text-secondary ${isLoadingSpecs ? 'animate-spin' : ''}`}/>
          </button>
        </div>
        {isLoadingSpecs ? <p className="text-text-secondary">Loading specifications...</p> : !isProjectLoaded ? (
          <p className="text-text-secondary text-center py-4">Load or scaffold a project to see specifications.</p>
        ) : specs.length === 0 ? (
          <p className="text-text-secondary text-center py-4">No specifications found in `{sessionState?.project_path}/docs/specifications/`.</p>
        ) : (
          <ul className="space-y-3">
            {specs.map(spec => (
              <li key={spec.relative_path} className="p-4 bg-background rounded-md shadow-sm flex justify-between items-center hover:bg-gray-700/50 transition-colors">
                <div>
                  <h4 className="font-semibold text-lg text-text-main">{spec.name}</h4>
                  <p className="text-sm text-text-secondary truncate max-w-md" title={spec.content_preview}>{spec.content_preview}</p>
                  <p className="text-xs text-text-tertiary mt-1">Status: {spec.status}</p>
                </div>
                <button onClick={() => handleProcessSpec(spec.relative_path)} className="bg-primary hover:bg-primary-hover text-white font-semibold py-2 px-4 rounded text-sm flex items-center gap-2">
                  <Play className="h-4 w-4"/> Process Spec
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
};
export default GoalsView;