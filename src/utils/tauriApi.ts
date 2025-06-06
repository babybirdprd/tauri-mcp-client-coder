import { invoke } from "@tauri-apps/api/core";
import {
  listen,
  type EventCallback,
  type UnlistenFn,
} from "@tauri-apps/api/event";

// --- Replicated Rust Models (ensure these match Rust exactly) ---
// TODO: Manually define these interfaces to match the Rust structs in `models.rs`
export interface ProjectSettings {
  [key: string]: any;
}
export interface CurrentProjectSession {
  [key: string]: any;
}
export interface Task {
  [key: string]: any;
}
export interface SpecFile {
  [key: string]: any;
}
export interface CrateInfo {
  [key: string]: any;
}
export interface GlobalLogEntry {
  id: string;
  timestamp: number;
  level: string;
  component: string;
  message: string;
  task_id?: string;
  details?: any;
}
export interface TantivySearchResultItem {
  score: number;
  relative_path: string;
  title: string;
  doc_type: string;
  snippet_html?: string;
}
// --- End Replicated Rust Models ---

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
  submitHumanResponse: (taskId: string, responseText: string): Promise<void> =>
    invoke("submit_human_response", { taskId, responseText }),
  getCrateInfo: (crateName: string): Promise<CrateInfo | null> =>
    invoke("get_crate_info_cmd", { crateName }),
  approveCrate: (crateName: string): Promise<void> =>
    invoke("approve_crate_cmd", { crateName }),
  rebuildProjectSearchIndex: (): Promise<void> =>
    invoke("rebuild_project_search_index"),
  searchProjectGlobally: (
    query: string,
    docTypeFilter?: string,
    limit?: number,
  ): Promise<TantivySearchResultItem[]> =>
    invoke("search_project_globally", { query, docTypeFilter, limit }),
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
