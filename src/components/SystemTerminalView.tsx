import React, { useRef, useEffect } from "react";
import { GlobalLogEntry } from "../utils/tauriApi";

interface SystemTerminalViewProps {
  logs: GlobalLogEntry[];
  cargoStream: string[];
}

const SystemTerminalView: React.FC<SystemTerminalViewProps> = ({
  logs,
  cargoStream,
}) => {
  const logsEndRef = useRef<null | HTMLDivElement>(null);
  const cargoEndRef = useRef<null | HTMLDivElement>(null);

  useEffect(() => {
    logsEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [logs]);
  useEffect(() => {
    cargoEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [cargoStream]);

  const formatLog = (log: GlobalLogEntry) => {
    const date = new Date(log.timestamp).toLocaleTimeString();
    return `[${date}][${log.level}][${log.component}${log.task_id ? `:${log.task_id.substring(0, 8)}` : ""}] ${log.message}`;
  };

  return (
    <div className="p-4 h-full flex flex-col">
      <h2 className="text-2xl font-semibold mb-4 text-indigo-400">
        System Logs & Terminal
      </h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 flex-grow min-h-0">
        <div className="bg-gray-800 p-3 rounded shadow flex flex-col min-h-0">
          <h3 className="text-lg font-medium text-gray-300 mb-2">
            Main System Logs
          </h3>
          <pre className="text-xs text-gray-300 flex-grow overflow-y-auto whitespace-pre-wrap break-all">
            {logs.map((log) => (
              <div key={log.id}>{formatLog(log)}</div>
            ))}
            <div ref={logsEndRef} />
          </pre>
        </div>
        <div className="bg-gray-800 p-3 rounded shadow flex flex-col min-h-0">
          <h3 className="text-lg font-medium text-gray-300 mb-2">
            Cargo Stream
          </h3>
          <pre className="text-xs text-green-400 flex-grow overflow-y-auto whitespace-pre-wrap break-all">
            {cargoStream.join("\n")}
            <div ref={cargoEndRef} />
          </pre>
        </div>
      </div>
      {/* TODO: Input for diagnostic commands or ripgrep search */}
    </div>
  );
};
export default SystemTerminalView;
