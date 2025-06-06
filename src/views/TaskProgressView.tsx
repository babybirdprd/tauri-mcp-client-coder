import React from 'react';
import type { Task } from '../types';
import { CheckCircle, XCircle, Loader, Clock, GitBranch, AlertCircle, BrainCircuit, Play, ListChecks } from 'lucide-react';

interface TaskProgressViewProps {
  tasks: Task[];
  currentExecutingTaskId?: string | null;
  onTaskSelect: (task: Task) => void;
}

const TaskItem: React.FC<{ task: Task; level: number; isExecuting: boolean; onSelect: () => void }> = ({ task, level, isExecuting, onSelect }) => {
  const getStatusIcon = () => {
    if (isExecuting) return <Loader className="h-5 w-5 text-blue-400 animate-spin" />;
    switch (task.status) {
      case 'CompletedSuccess': return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'Failed': return <XCircle className="h-5 w-5 text-red-500" />;
      case 'Pending': case 'Ready': return <Clock className="h-5 w-5 text-gray-500" />;
      default:
        if (typeof task.status === 'object' && 'BlockedByError' in task.status) {
            return <AlertCircle className="h-5 w-5 text-red-500" />;
        }
        return <BrainCircuit className="h-5 w-5 text-yellow-500" />; // For InProgress, SelfCorrecting etc.
    }
  };

  const getStatusText = () => {
    if (typeof task.status === 'object') {
        if ('BlockedByError' in task.status) return 'Blocked';
        return 'Complex State';
    }
    return task.status;
  };

  return (
    <div style={{ marginLeft: `${level * 24}px` }} className="mb-2">
      <div onClick={onSelect} className="p-3 bg-surface rounded-md flex items-center gap-4 hover:bg-gray-700/80 cursor-pointer transition-colors">
        <div className="flex-shrink-0">{getStatusIcon()}</div>
        <div className="flex-grow">
          <p className="font-medium text-text-main text-sm">{task.description}</p>
          <div className="flex items-center gap-4 text-xs text-text-secondary mt-1">
            <span>Type: <span className="font-mono bg-background px-1.5 py-0.5 rounded">{task.task_type}</span></span>
            <span>Status: <span className="font-medium">{getStatusText()}</span></span>
            <span>Attempts: <span className="font-mono">{task.current_attempt_number}</span></span>
          </div>
        </div>
      </div>
      {/* TODO: Implement recursive rendering for sub_tasks */}
    </div>
  );
};

const TaskProgressView: React.FC<TaskProgressViewProps> = ({ tasks, currentExecutingTaskId, onTaskSelect }) => {
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
            <h1 className="text-3xl font-bold text-text-main">Task Execution Plan</h1>
            <p className="text-text-secondary mt-1">The agent's decomposed plan of action. Click a task for details.</p>
        </div>
        <div>
            {/* TODO: Add buttons for Run/Pause/Step */}
            <button className="bg-primary hover:bg-primary-hover text-white font-semibold py-2 px-4 rounded text-sm flex items-center gap-2">
                <Play className="h-4 w-4"/> Run Next Task
            </button>
        </div>
      </div>
      <div className="bg-surface p-4 rounded-lg shadow-lg">
        {tasks.length === 0 ? (
          <div className="text-center py-10 text-text-secondary">
            <ListChecks className="mx-auto h-12 w-12 mb-4"/>
            <p>No tasks planned yet.</p>
            <p className="text-sm">Process a specification from the "Goals" view to generate a task plan.</p>
          </div>
        ) : (
          <div className="space-y-1">
            {tasks.map(task => (
              <TaskItem key={task.id} task={task} level={0} isExecuting={task.id === currentExecutingTaskId} onSelect={() => onTaskSelect(task)} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default TaskProgressView;