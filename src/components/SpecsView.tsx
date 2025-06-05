import React, { useState, useEffect, useCallback } from "react";
import {
  tauriApi,
  SpecFile as SpecFileType,
  CurrentProjectSession,
} from "../utils/tauriApi";

interface SpecsViewProps {
  refreshSessionState: () => void; // Callback to refresh App's session state
}

const SpecsView: React.FC<SpecsViewProps> = ({ refreshSessionState }) => {
  const [specs, setSpecs] = useState<SpecFileType[]>([]);
  const [isLoadingSpecs, setIsLoadingSpecs] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [newProjectName, setNewProjectName] = useState("");
  const [basePath, setBasePath] = useState(""); // Optional base path for scaffolding
  const [isScaffolding, setIsScaffolding] = useState(false);

  const [projectPathToLoad, setProjectPathToLoad] = useState("");
  const [isLoadingProject, setIsLoadingProject] = useState(false);

  const fetchSpecsForCurrentProject = useCallback(async () => {
    // First, ensure a project is loaded by checking session state (passed or fetched)
    // This component might need access to sessionState from App.tsx to know if a project is loaded.
    // For now, we assume `loadSpecs` will fail if no project is active on backend.
    setIsLoadingSpecs(true);
    setError(null);
    try {
      const loadedSpecs = await tauriApi.loadSpecFiles();
      setSpecs(loadedSpecs);
    } catch (err: any) {
      console.error("Failed to load specs:", err);
      setError(
        err.message ||
          (typeof err === "string"
            ? err
            : "Failed to load specs. Is a project active?"),
      );
      setSpecs([]);
    } finally {
      setIsLoadingSpecs(false);
    }
  }, []);

  useEffect(() => {
    // Fetch specs if a project might be loaded (e.g., on component mount if App state indicates so)
    // This needs a better trigger, perhaps based on App's sessionState.project_path
    fetchSpecsForCurrentProject();
  }, [fetchSpecsForCurrentProject]);

  const handleScaffoldProject = async () => {
    /* ... as before, call refreshSessionState on success ... */
    if (!newProjectName.trim()) {
      setError("Project name empty.");
      return;
    }
    setIsScaffolding(true);
    setError(null);
    try {
      await tauriApi.scaffoldProject(newProjectName, basePath || undefined);
      // After scaffolding, the backend now also initializes it.
      refreshSessionState(); // This will update App's session, triggering spec load if path is set
      setNewProjectName("");
      setBasePath("");
    } catch (err: any) {
      setError(err.message || "Scaffolding failed.");
    } finally {
      setIsScaffolding(false);
    }
  };

  const handleInitializeProject = async () => {
    if (!projectPathToLoad.trim()) {
      setError("Project path to load is empty.");
      return;
    }
    setIsLoadingProject(true);
    setError(null);
    try {
      await tauriApi.initializeProject(projectPathToLoad);
      refreshSessionState(); // This will update App's session
      setProjectPathToLoad("");
    } catch (err: any) {
      setError(err.message || "Failed to initialize project.");
    } finally {
      setIsLoadingProject(false);
    }
  };

  const handleProcessSpec = async (specPath: string) => {
    /* ... as before, call refreshSessionState ... */
    setError(null);
    try {
      await tauriApi.startFullProcessingForSpec(specPath);
      // Backend now handles planning and starts the loop. UI will update via polling/events.
      refreshSessionState(); // To reflect new status like "Planning"
    } catch (err: any) {
      setError(err.message || "Failed to start spec processing.");
    }
  };

  return (
    <div className="p-4 space-y-6">
      <h2 className="text-2xl font-semibold text-indigo-400">
        Specifications & Goals
      </h2>
      {error && <p className="text-red-400 bg-red-900 p-3 rounded">{error}</p>}

      <div className="grid md:grid-cols-2 gap-6">
        <div className="p-6 bg-gray-800 rounded-lg shadow">
          <h3 className="text-xl font-medium text-gray-200 mb-3">
            Initialize Existing Project
          </h3>
          {/* ... input for projectPathToLoad, button for handleInitializeProject ... */}
        </div>
        <div className="p-6 bg-gray-800 rounded-lg shadow">
          <h3 className="text-xl font-medium text-gray-200 mb-3">
            Scaffold New Project
          </h3>
          {/* ... inputs for newProjectName, basePath, button for handleScaffoldProject ... */}
        </div>
      </div>

      <div className="bg-gray-800 p-6 rounded-lg shadow">
        {/* ... Specs list and refresh button as before ... */}
      </div>
    </div>
  );
};
export default SpecsView;
