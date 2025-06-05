import React from "react";
import { CurrentProjectSession } from "../utils/tauriApi"; // Assuming types are defined

interface DashboardProps {
  sessionState: CurrentProjectSession | null;
}

const Dashboard: React.FC<DashboardProps> = ({ sessionState }) => {
  if (!sessionState)
    return <div className="text-center p-8">Loading dashboard...</div>;

  const completedTasks = sessionState.tasks.filter(
    (t) => t.status === "CompletedSuccess",
  ).length;
  const pendingTasks = sessionState.tasks.filter(
    (t) => t.status === "Pending" || t.status === "Ready",
  ).length;
  const failedTasks = sessionState.tasks.filter(
    (t) =>
      t.status === "Failed" || t.status.toString().startsWith("BlockedByError"),
  ).length;

  return (
    <div className="p-4 space-y-6">
      <h2 className="text-3xl font-semibold text-indigo-400">
        Mission Control
      </h2>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* ... (Project Path, System Status, Active Spec cards as before, using sessionState) ... */}
        <div className="bg-gray-800 p-5 rounded-lg shadow">
          <h3 className="text-md font-medium text-gray-400 mb-1">
            Project Path
          </h3>
          <p className="text-lg text-green-400 break-all">
            {sessionState.project_path || "No project loaded"}
          </p>
        </div>
        <div className="bg-gray-800 p-5 rounded-lg shadow">
          <h3 className="text-md font-medium text-gray-400 mb-1">
            System Status
          </h3>
          <p className="text-lg text-yellow-400">
            {typeof sessionState.status === "string"
              ? sessionState.status
              : JSON.stringify(sessionState.status)}
          </p>
        </div>
        <div className="bg-gray-800 p-5 rounded-lg shadow">
          <h3 className="text-md font-medium text-gray-400 mb-1">
            Active Specification
          </h3>
          <p className="text-lg text-cyan-400">
            {sessionState.active_spec_file || "None"}
          </p>
        </div>
      </div>

      <div className="bg-gray-800 p-6 rounded-lg shadow">
        <h3 className="text-xl font-semibold text-gray-200 mb-3">
          Task Progress
        </h3>
        <div className="flex justify-around text-center">
          <div>
            <p className="text-2xl font-bold text-white">
              {sessionState.tasks.length}
            </p>
            <p className="text-sm text-gray-400">Total</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-green-500">
              {completedTasks}
            </p>
            <p className="text-sm text-gray-400">Completed</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-yellow-500">{pendingTasks}</p>
            <p className="text-sm text-gray-400">Pending</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-red-500">{failedTasks}</p>
            <p className="text-sm text-gray-400">Failed/Blocked</p>
          </div>
        </div>
        {/* TODO: Add a progress bar or more detailed task summary */}
      </div>

      {/* TODO: Recent Activity Log (from sessionState.logs, filtered) */}
      {/* TODO: Alerts/Notifications Area (from specific events or critical logs) */}
    </div>
  );
};
export default Dashboard;
