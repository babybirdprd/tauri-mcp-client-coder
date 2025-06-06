import { useState } from "react";
import { useTauriState } from "./hooks/useTauriState";
import { tauriApi } from "./utils/tauriApi";
import Nav, { ViewName } from "./components/Nav";
import DashboardView from "./views/DashboardView";
import GoalsView from "./views/GoalsView";
import TaskProgressView from "./views/TaskProgressView";
import KnowledgeBaseView from "./views/KnowledgeBaseView";
import SystemTerminalView from "./views/SystemTerminalView";
import SettingsView from "./views/SettingsView";
import ArchitectureView from "./views/ArchitectureView";
import LearningCenterView from "./views/LearningCenterView";
import WhiteboardView from "./views/WhiteboardView";
import HumanInputDialog from "./components/HumanInputDialog";
import TaskDetailModal from "./views/TaskDetailView";
import { Task } from "./types";

function App() {
  const [currentView, setCurrentView] = useState<ViewName>("Dashboard");
  
  // Debug logging
  console.log('Current view state:', currentView);
  const { sessionState, logs, cargoStream, humanInputRequest, setHumanInputRequest, refreshSessionState, isLoading } = useTauriState();
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);

  const handleHumanResponseSubmit = async (taskId: string, responseText: string) => {
    try {
        await tauriApi.submitHumanResponse(taskId, responseText);
        setHumanInputRequest(null);
        refreshSessionState();
    } catch (error) { console.error("Failed to submit human response:", error); }
  };

  const renderView = () => {
    console.log('renderView - isLoading:', isLoading, 'sessionState:', sessionState, 'project_path:', sessionState?.project_path);
    
    if (isLoading && !sessionState) {
        return <div className="flex items-center justify-center h-full"><p>Initializing Cognito Pilot...</p></div>;
    }
    // Only force Goals view if we have a session but no project path
    // This allows navigation during development when sessionState is null
    if (sessionState && !sessionState.project_path) {
        // If no project is loaded, force the Goals/Specs view to load one.
        console.log('No project path found, forcing Goals view');
        return <GoalsView sessionState={sessionState} refreshSessionState={refreshSessionState} />;
    }

    switch (currentView) {
      case "Dashboard": return <DashboardView sessionState={sessionState} />;
      case "Goals": return <GoalsView sessionState={sessionState} refreshSessionState={refreshSessionState} />;
      case "Tasks": return <TaskProgressView tasks={sessionState?.tasks || []} currentExecutingTaskId={sessionState?.current_task_id_executing} onTaskSelect={setSelectedTask} />;
      case "Architecture": return <ArchitectureView />;
      case "Learning": return <LearningCenterView />;
      case "Whiteboard": return <WhiteboardView />;
      case "Knowledge": return <KnowledgeBaseView knownCrates={sessionState?.known_crates || []} />;
      case "Terminal": return <SystemTerminalView logs={logs} cargoStream={cargoStream} />;
      case "Settings": return <SettingsView />;
      default: return <DashboardView sessionState={sessionState} />;
    }
  };

  return (
    <div className="flex h-screen bg-background text-text-main font-sans">
      <Nav setCurrentView={setCurrentView} currentView={currentView} />
      <main className="flex-1 p-8 ml-64 overflow-y-auto">
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
      {selectedTask && (
        <TaskDetailModal
          task={selectedTask}
          onClose={() => setSelectedTask(null)}
        />
      )}
    </div>
  );
}
export default App;