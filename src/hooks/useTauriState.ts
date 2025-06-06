import { useState, useEffect, useCallback } from 'react';
import { tauriApi, listenToGlobalLogEvents, listenToCargoStreamEvents, listenToHumanInputRequestEvents } from '../utils/tauriApi';
import type { CurrentProjectSession, GlobalLogEntry } from '../types';

export function useTauriState() {
  const [sessionState, setSessionState] = useState<CurrentProjectSession | null>(null);
  const [logs, setLogs] = useState<GlobalLogEntry[]>([]);
  const [cargoStream, setCargoStream] = useState<string[]>([]);
  const [humanInputRequest, setHumanInputRequest] = useState<{taskId: string, prompt: string} | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const refreshSessionState = useCallback(() => {
    setIsLoading(true);
    tauriApi.getCurrentSessionState()
      .then(state => {
        setSessionState(state);
        // Initialize logs from session state if they exist
        if (state.logs && state.logs.length > 0) {
            setLogs(state.logs.sort((a,b) => a.timestamp - b.timestamp));
        }
      })
      .catch(err => console.error("Failed to get session state:", err))
      .finally(() => setIsLoading(false));
  }, []);

  useEffect(() => {
    refreshSessionState();

    const unlistenPromises = [
      listenToGlobalLogEvents((event) => {
        setLogs(prev => [...prev, event.payload].sort((a,b) => a.timestamp - b.timestamp).slice(-200));
        // A more robust approach is a dedicated "state-changed" event, but this works for now.
        if (event.payload.message.includes("loop finished") || event.payload.message.includes("Decomposition complete") || event.payload.level === "Error") {
            refreshSessionState();
        }
      }),
      listenToCargoStreamEvents((event) => {
        setCargoStream(prev => [...prev, event.payload].slice(-100));
      }),
      listenToHumanInputRequestEvents((event) => {
        setHumanInputRequest(event.payload);
      })
    ];

    const intervalId = setInterval(refreshSessionState, 5000);

    return () => {
      unlistenPromises.forEach(p => p.then(f => f()));
      clearInterval(intervalId);
    };
  }, [refreshSessionState]);

  return { sessionState, logs, cargoStream, humanInputRequest, setHumanInputRequest, refreshSessionState, isLoading };
}