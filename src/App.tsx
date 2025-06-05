import React, { useState, useEffect, useCallback } from "react";
import {
  tauriApi,
  listenToGlobalLogEvents,
  listenToCargoStreamEvents,
  listenToHumanInputRequestEvents,
  GlobalLogEntry,
  CurrentProjectSession,
  Task,
} from "./utils/tauriApi";
import Nav from "./components/Nav";
import Dashboard from "./components/Dashboard";
import SpecsView from "./components/SpecsView";
import TaskProgressView from "./components/TaskProgressView";
import KnowledgeBaseView from "./components/KnowledgeBaseView";
import SystemTerminalView from "./components/SystemTerminalView";
import SettingsView from "./components/SettingsView";
import HumanInputDialog from "./components/HumanInputDialog"; // New component

type ViewName =
  | "Dashboard"
  | "Specs"
  | "Tasks"
  | "Knowledge"
  | "Terminal"
  | "Settings";

function App() {
  const [currentView, setCurrentView] = useState<ViewName>("Dashboard");
  const [sessionState, setSessionState] =
    useState<CurrentProjectSession | null>(null);
  const [logs, setLogs] = useState<GlobalLogEntry[]>([]);
  const [cargoStream, setCargoStream] = useState<string[]>([]);
  const [humanInputRequest, setHumanInputRequest] = useState<{
    taskId: string;
    prompt: string;
  } | null>(null);

  const refreshSessionState = useCallback(() => {
    tauriApi
      .getCurrentSessionState()
      .then((state) => {
        setSessionState(state);
        if (state.logs) {
          // If backend sends logs with session state
          setLogs((prev) => {
            // Merge logs carefully to avoid duplicates if also listening
            const existingIds = new Set(prev.map((l) => l.id));
            const newLogs = state.logs.filter((l) => !existingIds.has(l.id));
            return [...prev, ...newLogs]
              .sort((a, b) => a.timestamp - b.timestamp)
              .slice(-200); // Keep last 200
          });
        }
      })
      .catch((err) => console.error("Failed to get session state:", err));
  }, []);

  useEffect(() => {
    refreshSessionState(); // Initial load

    const unlistenLogs = listenToGlobalLogEvents((event) => {
      setLogs((prev) =>
        [...prev, event.payload]
          .sort((a, b) => a.timestamp - b.timestamp)
          .slice(-200),
      );
      // Refresh full session state if log indicates significant change or task completion
      if (
        event.payload.message.includes("Selected task") ||
        event.payload.message.includes("Decomposition complete") ||
        event.payload.message.includes("loop finished") ||
        event.payload.level === "Error" ||
        (event.payload.message.includes("Task") &&
          (event.payload.message.includes("PASSED") ||
            event.payload.message.includes("FAILED") ||
            event.payload.message.includes("completed")))
      ) {
        refreshSessionState();
      }
    });

    const unlistenCargo = listenToCargoStreamEvents((event) => {
      setCargoStream((prev) => [...prev, event.payload].slice(-100)); // Keep last 100 lines
    });

    const unlistenHumanInput = listenToHumanInputRequestEvents((event) => {
      setHumanInputRequest(event.payload);
    });

    const intervalId = setInterval(refreshSessionState, 10000); // Poll less frequently

    return () => {
      unlistenLogs.then((f) => f());
      unlistenCargo.then((f) => f());
      unlistenHumanInput.then((f) => f());
      clearInterval(intervalId);
    };
  }, [refreshSessionState]);

  const handleHumanResponseSubmit = async (
    taskId: string,
    responseText: string,
  ) => {
    try {
      await tauriApi.submitHumanResponse(taskId, responseText);
      setHumanInputRequest(null);
      refreshSessionState(); // Refresh state after submission
    } catch (error) {
      console.error("Failed to submit human response:", error);
      // TODO: Show error to user
    }
  };

  const renderView = () => {
    // TODO: Pass relevant parts of sessionState and logs to each component
    switch (currentView) {
      case "Dashboard":
        return <Dashboard sessionState={sessionState} />;
      case "Specs":
        return <SpecsView refreshSessionState={refreshSessionState} />;
      case "Tasks":
        return (
          <TaskProgressView
            tasks={sessionState?.tasks || []}
            currentExecutingTaskId={sessionState?.current_task_id_executing}
          />
        );
      case "Knowledge":
        return (
          <KnowledgeBaseView knownCrates={sessionState?.known_crates || []} />
        );
      case "Terminal":
        return <SystemTerminalView logs={logs} cargoStream={cargoStream} />;
      case "Settings":
        return <SettingsView />;
      default:
        return <Dashboard sessionState={sessionState} />;
    }
  };

  return (
    <div className="flex h-screen bg-gray-900 text-gray-100">
      <Nav setCurrentView={setCurrentView} />
      <main className="flex-1 p-6 ml-48 overflow-y-auto">{renderView()}</main>
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
