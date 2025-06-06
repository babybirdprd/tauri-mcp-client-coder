import React from 'react';
import { CurrentProjectSession, Task } from '../types';
import { AlertTriangle, CheckCircle, Cpu, GitBranch, ShieldCheck } from 'lucide-react';

interface DashboardProps { sessionState: CurrentProjectSession | null; }

const StatCard: React.FC<{ title: string; value: string | number; icon: React.ElementType; colorClass: string }> = ({ title, value, icon: Icon, colorClass }) => (
    <div className="bg-surface p-5 rounded-lg shadow-lg flex items-center">
        <div className={`p-3 rounded-full mr-4 ${colorClass} bg-opacity-20`}>
            <Icon className={`h-6 w-6 ${colorClass}`} />
        </div>
        <div>
            <h3 className="text-sm font-medium text-text-secondary mb-1">{title}</h3>
            <p className="text-2xl font-bold text-text-main">{value}</p>
        </div>
    </div>
);

const DashboardView: React.FC<DashboardProps> = ({ sessionState }) => {
  if (!sessionState) return <div className="text-center p-8 text-text-secondary">Loading dashboard...</div>;

  const completedTasks = sessionState.tasks.filter((t: Task) => t.status === 'CompletedSuccess').length;
  const totalTasks = sessionState.tasks.length;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-text-main">Mission Control</h1>
        <p className="text-text-secondary mt-1">Overview of the current project session and AI agent status.</p>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <StatCard title="System Status" value={typeof sessionState.status === 'string' ? sessionState.status : 'Complex State'} icon={Cpu} colorClass="text-yellow-400" />
        <StatCard title="Active Goal" value={sessionState.active_spec_file?.split('/').pop() || "None"} icon={GitBranch} colorClass="text-cyan-400" />
        <StatCard title="Task Completion" value={`${completedTasks} / ${totalTasks}`} icon={CheckCircle} colorClass="text-green-400" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-surface p-6 rounded-lg shadow-lg">
            <h3 className="text-lg font-semibold text-text-main mb-4 flex items-center"><AlertTriangle className="h-5 w-5 mr-2 text-yellow-500"/>Proactive Agent Alerts</h3>
            {/* TODO: Populate this from backend events */}
            <ul className="space-y-3 text-sm">
                <li className="text-text-secondary">Code Gardener: Suggests refactoring `calculate_totals` due to high complexity. <button className="text-primary text-xs ml-2">View Task</button></li>
                <li className="text-text-secondary">Architect: Detected architectural drift in `web_handlers`. <button className="text-primary text-xs ml-2">View Violation</button></li>
            </ul>
        </div>
        <div className="bg-surface p-6 rounded-lg shadow-lg">
            <h3 className="text-lg font-semibold text-text-main mb-4 flex items-center"><ShieldCheck className="h-5 w-5 mr-2 text-green-500"/>Dependency Guardian</h3>
            {/* TODO: Populate this from backend events */}
            <ul className="space-y-3 text-sm">
                <li className="text-text-secondary">`serde` can be updated from 1.0.197 to 1.0.200 (minor). <button className="text-primary text-xs ml-2">Approve Update</button></li>
                <li className="text-text-secondary">`cargo audit` found no vulnerabilities.</li>
            </ul>
        </div>
      </div>

      {/* TODO: Add Recent Activity Log component here */}
    </div>
  );
};
export default DashboardView;