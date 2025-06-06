import React, { useState, useMemo, useRef, useEffect } from 'react';
import type { GlobalLogEntry } from '../types';
import { LogLevel } from '../types'; // Assuming LogLevel is exported from types
import { Search } from 'lucide-react';

interface SystemTerminalViewProps {
  logs: GlobalLogEntry[];
  cargoStream: string[];
}

const LogLine: React.FC<{ log: GlobalLogEntry }> = ({ log }) => {
    const levelColor = {
        Info: 'text-blue-400',
        Warn: 'text-yellow-400',
        Error: 'text-red-400',
        Debug: 'text-purple-400',
        AgentTrace: 'text-cyan-400',
        LLMTrace: 'text-pink-400',
        HumanInput: 'text-green-400',
    };
    const date = new Date(log.timestamp).toLocaleTimeString();
    return (
        <div className="flex gap-2 items-start">
            <span className="text-text-tertiary">{date}</span>
            <span className={`font-semibold w-20 flex-shrink-0 ${levelColor[log.level] || 'text-gray-400'}`}>[{log.level}]</span>
            <span className="font-medium w-40 flex-shrink-0 text-text-secondary">[{log.component}]</span>
            <span className="whitespace-pre-wrap break-all text-text-main">{log.message}</span>
        </div>
    );
};

const SystemTerminalView: React.FC<SystemTerminalViewProps> = ({ logs, cargoStream }) => {
  const [logFilter, setLogFilter] = useState('');
  const [levelFilter, setLevelFilter] = useState<LogLevel | 'ALL'>('ALL');
  const logsEndRef = useRef<null | HTMLDivElement>(null);
  const cargoEndRef = useRef<null | HTMLDivElement>(null);

  useEffect(() => { logsEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [logs]);
  useEffect(() => { cargoEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [cargoStream]);

  const filteredLogs = useMemo(() => {
    return logs.filter(log => {
      const levelMatch = levelFilter === 'ALL' || log.level === levelFilter;
      const textMatch = logFilter.trim() === '' || 
                        log.message.toLowerCase().includes(logFilter.toLowerCase()) ||
                        log.component.toLowerCase().includes(logFilter.toLowerCase()) ||
                        (log.task_id && log.task_id.includes(logFilter));
      return levelMatch && textMatch;
    });
  }, [logs, logFilter, levelFilter]);

  return (
    <div className="h-full flex flex-col space-y-4">
      <div>
        <h1 className="text-3xl font-bold text-text-main">System Terminal</h1>
        <p className="text-text-secondary mt-1">Observe real-time logs and output from system components.</p>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 flex-grow min-h-0">
        <div className="bg-surface p-3 rounded-lg shadow-lg flex flex-col min-h-0">
          <div className="flex gap-2 mb-2 flex-shrink-0">
            <div className="relative flex-grow">
                <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-text-tertiary"/>
                <input type="text" placeholder="Filter logs..." value={logFilter} onChange={e => setLogFilter(e.target.value)} className="w-full p-1.5 pl-8 rounded bg-background border border-border text-sm"/>
            </div>
            <select value={levelFilter} onChange={e => setLevelFilter(e.target.value as any)} className="p-1.5 rounded bg-background border border-border text-sm">
                <option value="ALL">All Levels</option>
                <option value="Info">Info</option>
                <option value="Warn">Warn</option>
                <option value="Error">Error</option>
                <option value="Debug">Debug</option>
                <option value="AgentTrace">AgentTrace</option>
            </select>
          </div>
          <pre className="text-xs flex-grow overflow-y-auto font-mono space-y-1">
            {filteredLogs.map(log => <LogLine key={log.id} log={log} />)}
            <div ref={logsEndRef} />
          </pre>
        </div>
        <div className="bg-black p-3 rounded-lg shadow-lg flex flex-col min-h-0">
          <h3 className="text-lg font-medium text-text-main mb-2 flex-shrink-0">Cargo Stream</h3>
          <pre className="text-xs text-green-400 flex-grow overflow-y-auto font-mono whitespace-pre-wrap break-all">
            {cargoStream.join('')}
            <div ref={cargoEndRef} />
          </pre>
        </div>
      </div>
    </div>
  );
};

export default SystemTerminalView;