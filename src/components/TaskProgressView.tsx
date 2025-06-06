import React from 'react';
import { Task as TaskType } from '../utils/tauriApi';

interface TaskProgressViewProps {
  tasks: TaskType[];
  currentExecutingTaskId?: string | null;
}

const TaskItem: React.FC<{ task: TaskType; level: number; isExecuting: boolean }> = ({ task, level, isExecuting }) => {
  // TODO: Implement collapsible sub-tasks
  // TODO: Show more details on click (description, attempts, logs related to this task)
  const statusColor = () => {
    if (isExecuting) return 'border-blue-500 animate-pulse';
    switch (task.status) {
      case 'CompletedSuccess': return 'border-green-500';
      case 'InProgress': return 'border-yellow-500'; // Should be covered by isExecuting
      case 'Failed':
      case 'BlockedByError': return 'border-red-500';
      case 'Pending':
      case 'Ready': return 'border-gray-600';
      default: return 'border-gray-500';
    }
  };

  const statusBgColor = () => {
    switch (task.status) {
        case 'CompletedSuccess': return 'bg-green-600 text-green-100';
        case 'InProgress': return 'bg-yellow-600 text-yellow-100';
        case 'Failed':
        case 'BlockedByError': return 'bg-red-600 text-red-100';
        default: return 'bg-gray-500 text-gray-100';
    }
  }

  return (
    <div style={{ marginLeft: `${level * 20}px` }} className={`mb-2 p-3 bg-gray-800 rounded border-l-4 ${statusColor()}`}>
      <div className="flex justify-between items-center">
        <span className="font-medium text-white text-sm">{task.description.substring(0,100)}{task.description.length > 100 ? '...' : ''}</span>
        <span className={`px-2 py-0.5 text-xs rounded-full ${statusBgColor()}`}>
          {task.status.toString().startsWith('BlockedByError') ? 'Blocked' : task.status.toString()}
        </span>
      </div>
      <p className="text-xs text-gray-500 mt-1">ID: {task.id} | Type: {task.task_type.toString()} | Attempts: {task.current_attempt_number}</p>
      {/* TODO: Show sub_tasks recursively if task.sub_task_ids is populated and tasks are fetched hierarchically or flattened with parent_id */}
    </div>
  );
};

const TaskProgressView: React.FC<TaskProgressViewProps> = ({ tasks, currentExecutingTaskId }) => {
  // TODO: Implement hierarchical rendering if tasks have parent_id and sub_task_ids
  // For now, assumes a flat list or tasks are already nested in the data structure.
  return (
    <div className="p-4">
      <h2 className="text-2xl font-semibold mb-6 text-indigo-400">Task Progress</h2>
      {/* TODO: Add controls to trigger run_main_execution_loop if system is Paused/Idle */}
      {tasks.length === 0 ? (
        <p className="text-gray-400">No tasks planned yet. Process a specification to see tasks here.</p>
      ) : (
        <div className="space-y-3">
          {tasks.map(task => (
            <TaskItem key={task.id} task={task} level={0} isExecuting={task.id === currentExecutingTaskId} />
          ))}
        </div>
      )}
    </div>
  );
};

export default TaskProgressView;