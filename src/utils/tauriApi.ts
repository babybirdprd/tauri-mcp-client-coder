import { invoke } from "@tauri-apps/api/core";
import {
  listen,
  type EventCallback,
  type UnlistenFn,
} from "@tauri-apps/api/event";

// --- Replicated Rust Models (ensure these match Rust exactly) ---
export interface ProjectSettings {
  /* ... */
}
export interface CurrentProjectSession {
  /* ... */
}
export interface Task {
  /* ... */
}
export interface SpecFile {
  /* ... */
}
export interface CrateInfo {
  /* ... */
}
export interface GlobalLogEntry {
  /* ... */
}
// --- End Replicated Rust Models ---

export interface TantivySearchResultItem {
  score: number;
  relative_path: string;
  title: string;
  doc_type: string;
  snippet_html?: string;
}

export const tauriApi = {
  // ... existing api functions ...
  rebuildProjectSearchIndex: (): Promise<void> =>
    invoke("rebuild_project_search_index"),
  searchProjectGlobally: (
    query: string,
    docTypeFilter?: string,
    limit?: number,
  ): Promise<TantivySearchResultItem[]> =>
    invoke("search_project_globally", { query, docTypeFilter, limit }),
};

export const tauriApi = {
  loadSettings: (): Promise<ProjectSettings> => invoke("load_settings"),
  saveSettings: (settings: ProjectSettings): Promise<void> =>
    invoke("save_settings", { settings }),
  initializeProject: (projectPathStr: string): Promise<void> =>
    invoke("initialize_project", { projectPathStr }),
  scaffoldProject: (
    projectName: string,
    basePathStr?: string,
    isLib?: boolean,
  ): Promise<string> =>
    invoke("scaffold_project_cmd", { projectName, basePathStr, isLib }),
  getCurrentSessionState: (): Promise<CurrentProjectSession> =>
    invoke("get_current_session_state"),
  loadSpecFiles: (): Promise<SpecFile[]> =>
    invoke("load_spec_files_from_project"),
  startFullProcessingForSpec: (specRelativePath: string): Promise<void> =>
    invoke("start_full_processing_for_spec", { specRelativePath }),
  // runNextAvailableTask: (): Promise<void> => invoke("run_next_available_task"), // May not be needed if loop is internal
  submitHumanResponse: (taskId: string, responseText: string): Promise<void> =>
    invoke("submit_human_response", { taskId, responseText }),
  getCrateInfo: (crateName: string): Promise<CrateInfo | null> =>
    invoke("get_crate_info_cmd", { crateName }),
  approveCrate: (crateName: string): Promise<void> =>
    invoke("approve_crate_cmd", { crateName }),
  searchCodebase: (query: string, filePattern?: string): Promise<string> =>
    invoke("search_codebase", { query, filePattern }),
};

export async function listenToGlobalLogEvents(
  handler: EventCallback<GlobalLogEntry>,
): Promise<UnlistenFn> {
  return await listen("global-log-event", handler);
}
export async function listenToCargoStreamEvents(
  handler: EventCallback<string>,
): Promise<UnlistenFn> {
  return await listen("cargo-stream", handler);
}
export async function listenToHumanInputRequestEvents(
  handler: EventCallback<{ taskId: string; prompt: string }>,
): Promise<UnlistenFn> {
  return await listen("human-input-request", handler);
}
// Add more event listeners as needed (e.g., "session-state-changed")
