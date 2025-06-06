import React, { useState } from 'react';
import { Task } from '../types';
import { X, Code, Bug, FileText, History } from 'lucide-react';

interface TaskDetailModalProps {
  task: Task;
  onClose: () => void;
}

const TaskDetailModal: React.FC<TaskDetailModalProps> = ({ task, onClose }) => {
  const [activeTab, setActiveTab] = useState<'details' | 'attempts' | 'diff' | 'debug'>('details');

  const isDebuggingAvailable = task.status.toString().startsWith('BlockedByError') && task.status.toString().includes('test failed');

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
      <div className="bg-surface rounded-lg shadow-xl w-full max-w-4xl h-[90vh] flex flex-col">
        <header className="p-4 border-b border-border flex justify-between items-center">
          <div>
            <h2 className="text-xl font-semibold text-text-main">Task Details</h2>
            <p className="text-xs text-text-secondary font-mono">{task.id}</p>
          </div>
          <button onClick={onClose} className="p-1 rounded-full hover:bg-gray-700"><X className="h-5 w-5"/></button>
        </header>

        <div className="flex border-b border-border">
            <button onClick={() => setActiveTab('details')} className={`px-4 py-2 text-sm flex items-center ${activeTab === 'details' ? 'border-b-2 border-primary text-text-main' : 'text-text-secondary'}`}><FileText className="h-4 w-4 mr-2"/>Details</button>
            <button onClick={() => setActiveTab('attempts')} className={`px-4 py-2 text-sm flex items-center ${activeTab === 'attempts' ? 'border-b-2 border-primary text-text-main' : 'text-text-secondary'}`}><History className="h-4 w-4 mr-2"/>Attempts ({task.attempts.length})</button>
            <button onClick={() => setActiveTab('diff')} className={`px-4 py-2 text-sm flex items-center ${activeTab === 'diff' ? 'border-b-2 border-primary text-text-main' : 'text-text-secondary'}`}><Code className="h-4 w-4 mr-2"/>Code Diff</button>
            {isDebuggingAvailable && <button onClick={() => setActiveTab('debug')} className={`px-4 py-2 text-sm flex items-center ${activeTab === 'debug' ? 'border-b-2 border-primary text-text-main' : 'text-text-secondary'}`}><Bug className="h-4 w-4 mr-2 text-red-400"/>Interactive Debug</button>}
        </div>

        <div className="flex-grow p-6 overflow-y-auto">
            {/* TODO: Implement content for each tab */}
            {activeTab === 'details' && <div><h3 className="font-semibold">Description</h3><p className="whitespace-pre-wrap bg-gray-900 p-3 rounded mt-2">{task.description}</p></div>}
            {activeTab === 'attempts' && <div><h3 className="font-semibold">Execution Attempts</h3>{/* List attempts here */}</div>}
            {activeTab === 'diff' && <div><h3 className="font-semibold">Last Code Output</h3>{/* Show code diff here */}</div>}
            {activeTab === 'debug' && <div><h3 className="font-semibold">Interactive Debugging Session</h3>{/* Show debug chat/analysis here */}</div>}
        </div>
      </div>
    </div>
  );
};

export default TaskDetailModal;