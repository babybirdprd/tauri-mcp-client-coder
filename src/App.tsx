import { useState, useEffect, useCallback } from "react";
import { tauriApi, listenToGlobalLogEvents, listenToCargoStreamEvents, listenToHumanInputRequestEvents, GlobalLogEntry, CurrentProjectSession } from "./utils/tauriApi";
import Nav, { ViewName } from "./components/Nav";
import Dashboard from "./components/Dashboard";
import SpecsView from "./components/SpecsView";
import TaskProgressView from "./components/TaskProgressView";
import KnowledgeBaseView from "./components/KnowledgeBaseView";
import SystemTerminalView from "./components/SystemTerminalView";
import SettingsView from "./components/SettingsView";
import HumanInputDialog from "./components/HumanInputDialog";

function App() {
  const [currentView, setCurrentView] = useState<ViewName>("Dashboard");
  const [sessionState, setSessionState] = useState<CurrentProjectSession | null>(null);
  const [logs, setLogs] = useState<GlobalLogEntry[]>([]);
  const [cargoStream, setCargoStream] = useState<string[]>([]);
  const [humanInputRequest, setHumanInputRequest] = useState<{taskId: string, prompt: string} | null>(null);

  const refreshSessionState = useCallback(() => {
    tauriApi.getCurrentSessionState()
      .then(state => setSessionState(state))
      .catch(err => console.error("Failed to get session state:", err));
  }, []);

  useEffect(() => {
    refreshSessionState();
    const unlistenLogs = listenToGlobalLogEvents((event) => {
      setLogs(prev => [...prev, event.payload].sort((a, b) => a.timestamp - b.timestamp).slice(-200));
      if (event.payload.level === "Error" || event.payload.message.includes("loop finished") || event.payload.message.includes("Decomposition complete")) {
          refreshSessionState();
      }
    });
    const unlistenCargo = listenToCargoStreamEvents((event) => setCargoStream(prev => [...prev, event.payload].slice(-100)));
    const unlistenHumanInput = listenToHumanInputRequestEvents((event) => setHumanInputRequest(event.payload));
    const intervalId = setInterval(refreshSessionState, 5000);
    return () => {
      unlistenLogs.then(f => f());
      unlistenCargo.then(f => f());
      unlistenHumanInput.then(f => f());
      clearInterval(intervalId);
    };
  }, [refreshSessionState]);

  const handleHumanResponseSubmit = async (taskId: string, responseText: string) => {
    try {
        await tauriApi.submitHumanResponse(taskId, responseText);
        setHumanInputRequest(null);
        refreshSessionState();
    } catch (error) { console.error("Failed to submit human response:", error); }
  };

  const renderView = () => {
    switch (currentView) {
      case "Dashboard": return <Dashboard sessionState={sessionState} />;
      case "Specs": return <SpecsView refreshSessionState={refreshSessionState} />;
      case "Tasks": return <TaskProgressView tasks={sessionState?.tasks || []} currentExecutingTaskId={sessionState?.current_task_id_executing} />;
      case "Knowledge": return <KnowledgeBaseView knownCrates={sessionState?.known_crates || []} />;
      case "Terminal": return <SystemTerminalView logs={logs} cargoStream={cargoStream} />;
      case "Settings": return <SettingsView />;
      default: return <Dashboard sessionState={sessionState} />;
    }
  };

  return (
    <div className="flex h-screen bg-gray-900 text-gray-100 font-sans">
      <Nav setCurrentView={setCurrentView} currentView={currentView} />
      <main className="flex-1 p-6 ml-56 overflow-y-auto">
        {renderView()}
      </main>
      {humanInputRequest && (
        <HumanInputDialog
          taskId={humanInputRequest.taskId}
          prompt={humanInputRequest.prompt}
          onSubmit={handleHumanResponseSubmit}
          onClose={() => setHumanInputRequest(null)}
        />
      )}
    </div>
  );
}
export default App;