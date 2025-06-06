import React from 'react';
import { CurrentProjectSession, Task } from '../utils/tauriApi';

interface DashboardProps { sessionState: CurrentProjectSession | null; }

const StatCard: React.FC<{ title: string; value: string | number; colorClass: string }> = ({ title, value, colorClass }) => (
    <div className="bg-gray-800 p-5 rounded-lg shadow-md">
        <h3 className="text-md font-medium text-gray-400 mb-1">{title}</h3>
        <p className={`text-2xl font-bold ${colorClass}`}>{value}</p>
    </div>
);

const Dashboard: React.FC<DashboardProps> = ({ sessionState }) => {
  if (!sessionState) return <div className="text-center p-8 text-gray-400">Loading dashboard...</div>;

  const completedTasks = sessionState.tasks.filter((t: Task) => t.status === 'CompletedSuccess').length;
  const pendingTasks = sessionState.tasks.filter((t: Task) => t.status === 'Pending' || t.status === 'Ready').length;
  const failedTasks = sessionState.tasks.filter((t: Task) => t.status === 'Failed' || t.status.toString().startsWith('BlockedByError')).length;
  const inProgressTasks = sessionState.tasks.filter((t: Task) => t.status === 'InProgress' || sessionState.current_task_id_executing === t.id).length;

  return (
    <div className="p-4 space-y-8">
      <h2 className="text-3xl font-semibold text-gray-100">Mission Control</h2>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <StatCard title="Project Path" value={sessionState.project_path || "No project loaded"} colorClass="text-green-400 text-lg break-all" />
        <StatCard title="System Status" value={typeof sessionState.status === 'string' ? sessionState.status : JSON.stringify(sessionState.status)} colorClass="text-yellow-400" />
        <StatCard title="Active Specification" value={sessionState.active_spec_file?.split('/').pop() || "None"} colorClass="text-cyan-400" />
      </div>

      <div className="bg-gray-800 p-6 rounded-lg shadow-md">
        <h3 className="text-xl font-semibold text-gray-200 mb-4">Task Progress</h3>
        <div className="flex justify-around text-center">
            <div><p className="text-3xl font-bold text-white">{sessionState.tasks.length}</p><p className="text-sm text-gray-400">Total</p></div>
            <div><p className="text-3xl font-bold text-green-500">{completedTasks}</p><p className="text-sm text-gray-400">Completed</p></div>
            <div><p className="text-3xl font-bold text-yellow-500">{inProgressTasks}</p><p className="text-sm text-gray-400">In Progress</p></div>
            <div><p className="text-3xl font-bold text-gray-500">{pendingTasks}</p><p className="text-sm text-gray-400">Pending</p></div>
            <div><p className="text-3xl font-bold text-red-500">{failedTasks}</p><p className="text-sm text-gray-400">Failed/Blocked</p></div>
        </div>
      </div>
    </div>
  );
};
export default Dashboard;