import React, { useState } from 'react';
import type { Task, TaskAttempt, ChangedFileContent } from '../types';
import { X, FileText, History, Code, Bug } from 'lucide-react';
import { tauriApi } from '../utils/tauriApi';

interface TaskDetailModalProps {
  task: Task;
  onClose: () => void;
}

const TabButton: React.FC<{ label: string; icon: React.ElementType; isActive: boolean; onClick: () => void; disabled?: boolean }> = ({ label, icon: Icon, isActive, onClick, disabled }) => (
    <button onClick={onClick} disabled={disabled} className={`px-4 py-2 text-sm flex items-center gap-2 border-b-2 transition-colors ${isActive ? 'border-primary text-text-main' : 'border-transparent text-text-secondary hover:text-text-main'} disabled:opacity-50 disabled:cursor-not-allowed`}>
        <Icon className="h-4 w-4"/>{label}
    </button>
);

const AttemptDetails: React.FC<{ attempt: TaskAttempt }> = ({ attempt }) => (
    <div className="bg-background p-4 rounded-md mb-4 border border-border">
        <h4 className="font-semibold text-text-main mb-2">Attempt #{attempt.attempt_number}</h4>
        <div className="space-y-3 text-sm">
            <p><span className="font-medium text-text-secondary">Coder Notes:</span> {attempt.coder_notes || 'None'}</p>
            <p><span className="font-medium text-text-secondary">LLM Error:</span> {attempt.llm_error_summary || 'None'}</p>
            <div>
                <p className="font-medium text-text-secondary">Verification Output (Exit Code: {attempt.verification_exit_code})</p>
                <pre className="bg-black p-3 rounded mt-1 text-xs text-gray-400 max-h-40 overflow-y-auto font-mono">
                    <span className="text-green-400">{attempt.verification_stdout}</span>
                    <span className="text-red-400">{attempt.verification_stderr}</span>
                </pre>
            </div>
        </div>
    </div>
);

const CodeDiffViewer: React.FC<{ files: ChangedFileContent[] }> = ({ files }) => {
    if (!files || files.length === 0) {
        return <p className="text-text-secondary">No code changes were part of this output.</p>;
    }
    // TODO: Implement a proper side-by-side diff viewer component. This is a simplified version.
    return (
        <div className="space-y-4">
            {files.map(file => (
                <div key={file.relative_path}>
                    <p className="font-mono text-sm text-purple-400 mb-1">{file.relative_path} ({file.action})</p>
                    <pre className="bg-black p-3 rounded text-xs text-gray-300 max-h-80 overflow-y-auto font-mono">
                        {file.content}
                    </pre>
                </div>
            ))}
        </div>
    );
};

const InteractiveDebugView: React.FC<{ task: Task }> = ({ task }) => {
    // TODO: Implement the chat-like interface for debugging.
    return (
        <div>
            <h3 className="font-semibold text-text-main mb-2">Interactive Debugging Session</h3>
            <div className="bg-black p-4 rounded-lg h-96 flex flex-col">
                <div className="flex-grow space-y-4 text-sm overflow-y-auto">
                    {/* AI Message */}
                    <div className="flex items-start gap-3">
                        <div className="w-8 h-8 bg-primary rounded-full flex-shrink-0 flex items-center justify-center"><Bug className="h-5 w-5"/></div>
                        <div className="bg-surface p-3 rounded-lg">
                            <p>Test `{task.id}` failed. I've analyzed the error output:</p>
                            <pre className="text-xs font-mono text-red-400 bg-black p-2 my-2 rounded">{task.attempts.at(-1)?.verification_stderr}</pre>
                            <p>It seems the issue is related to a value being moved. I can try to add `.clone()` to the variable on line X. Alternatively, I can add logging statements to trace the variable's state. How should I proceed?</p>
                        </div>
                    </div>
                </div>
                <div className="mt-4 flex gap-2">
                    <input type="text" placeholder="Your instruction..." className="flex-grow p-2 rounded bg-gray-700 text-white border border-border"/>
                    <button className="bg-primary hover:bg-primary-hover text-white font-semibold px-4 py-2 rounded">Send</button>
                </div>
            </div>
        </div>
    );
};


const TaskDetailModal: React.FC<TaskDetailModalProps> = ({ task, onClose }) => {
  const [activeTab, setActiveTab] = useState<'details' | 'attempts' | 'diff' | 'debug'>('details');

  const isDebuggingAvailable = task.status.toString().startsWith('BlockedByError') && task.attempts.at(-1)?.verification_stderr.includes('test failed');

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-surface rounded-lg shadow-xl w-full max-w-4xl h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>
        <header className="p-4 border-b border-border flex justify-between items-center flex-shrink-0">
          <div>
            <h2 className="text-xl font-semibold text-text-main">{task.task_type}</h2>
            <p className="text-xs text-text-secondary font-mono">{task.id}</p>
          </div>
          <button onClick={onClose} className="p-1 rounded-full hover:bg-gray-700"><X className="h-5 w-5"/></button>
        </header>

        <div className="flex border-b border-border px-4 flex-shrink-0">
            <TabButton label="Details" icon={FileText} isActive={activeTab === 'details'} onClick={() => setActiveTab('details')} />
            <TabButton label="Attempts" icon={History} isActive={activeTab === 'attempts'} onClick={() => setActiveTab('attempts')} />
            <TabButton label="Code Diff" icon={Code} isActive={activeTab === 'diff'} onClick={() => setActiveTab('diff')} disabled={!task.last_coder_output?.changed_files.length} />
            <TabButton label="Interactive Debug" icon={Bug} isActive={activeTab === 'debug'} onClick={() => setActiveTab('debug')} disabled={!isDebuggingAvailable} />
        </div>

        <div className="flex-grow p-6 overflow-y-auto">
            {activeTab === 'details' && (
                <div>
                    <h3 className="font-semibold text-text-main mb-2">Full Task Description</h3>
                    <p className="whitespace-pre-wrap bg-background p-4 rounded text-sm text-text-secondary">{task.description}</p>
                    <h3 className="font-semibold text-text-main mt-4 mb-2">Context Summary</h3>
                    <p className="whitespace-pre-wrap bg-background p-4 rounded text-sm text-text-secondary">{task.context_summary}</p>
                </div>
            )}
            {activeTab === 'attempts' && (
                <div>
                    <h3 className="font-semibold text-text-main mb-2">Execution History</h3>
                    {task.attempts.length > 0 ? task.attempts.map(att => <AttemptDetails key={att.attempt_number} attempt={att} />) : <p className="text-text-secondary">No attempts have been made for this task yet.</p>}
                </div>
            )}
            {activeTab === 'diff' && (
                <div>
                    <h3 className="font-semibold text-text-main mb-2">Last Coder Output</h3>
                    <CodeDiffViewer files={task.last_coder_output?.changed_files || []} />
                </div>
            )}
            {activeTab === 'debug' && isDebuggingAvailable && <InteractiveDebugView task={task} />}
        </div>
      </div>
    </div>
  );
};

export default TaskDetailModal;