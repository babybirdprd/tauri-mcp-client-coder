// This file centralizes all TypeScript types that mirror Rust models.
// It's crucial for type safety between the frontend and backend.

export interface ProjectSettings {
  tier1_llm_model_alias: string;
  tier2_llm_model_alias: string;
  llm_api_key: string | null;
  autonomy_level: 'FullAutopilot' | 'ApprovalCheckpoints' | 'ManualStepThrough';
  git_commit_strategy: 'PerTask' | 'PerFeature' | 'Manual';
  max_self_correction_attempts: number;
}

export interface CurrentProjectSession {
  project_path: string | null;
  status: ProjectStatus;
  active_spec_file: string | null;
  tasks: Task[];
  current_task_id_executing: string | null;
  logs: GlobalLogEntry[];
  known_crates: CrateInfo[];
}

export type ProjectStatus =
  | 'Unloaded' | 'Idle' | 'Planning' | 'ReadyToExecute' | 'ExecutingTask' | 'Paused' | 'CompletedGoal'
  | { AwaitingHumanInput: string } // Contains prompt
  | { SelfCorrecting: string }    // Contains task ID
  | { Error: string };            // Contains error message

export type TaskStatus =
  | 'Pending' | 'Ready' | 'InProgress' | 'BlockedByDependency' | 'AwaitingHumanClarification'
  | 'CompletedSuccess' | 'CompletedWithWarnings' | 'Failed'
  | { BlockedByError: string }; // Contains error message

export interface TaskAttempt {
  attempt_number: number;
  code_generated_summary: string | null;
  docs_generated_summary: string | null;
  verification_stdout: string;
  verification_stderr: string;
  verification_exit_code: number;
  llm_error_summary: string | null;
  coder_notes: string | null;
}

export interface Task {
  id: string;
  parent_id: string | null;
  description: string;
  task_type: string; // Using string for simplicity, can be enum
  status: TaskStatus;
  context_summary: string;
  dependencies: string[];
  sub_task_ids: string[];
  attempts: TaskAttempt[];
  current_attempt_number: number;
  last_coder_output: CoderOutput | null;
  human_review_notes: string | null;
}

export interface CoderOutput {
  task_id: string;
  changed_files: ChangedFileContent[];
  generated_docs: ChangedFileContent[];
  notes: string | null;
  success: boolean;
  error_message: string | null;
}

export interface ChangedFileContent {
  relative_path: string;
  content: string;
  action: 'Created' | 'Modified' | 'Deleted';
}

export interface SpecFile {
  name: string;
  relative_path: string;
  content_preview: string;
  status: string;
}

export interface CrateInfo {
  name: string;
  version: string | null;
  approval_status: 'Pending' | 'Approved' | 'Rejected' | 'NeedsManualReview';
  documentation_summary: string | null;
  source_url: string | null;
  last_qualified_at: number | null;
}

export type LogLevel = 'Info' | 'Warn' | 'Error' | 'Debug' | 'AgentTrace' | 'HumanInput' | 'LLMTrace';

export interface GlobalLogEntry {
  id: string;
  timestamp: number;
  level: LogLevel;
  component: string;
  message: string;
  task_id: string | null;
  details: Record<string, any> | null;
}

export interface TantivySearchResultItem {
  score: number;
  relative_path: string;
  title: string;
  doc_type: string;
  snippet_html?: string;
}

// For the Living Architecture Model
export interface ArchitectureNode {
  id: string; // e.g., "module::path::StructName"
  label: string; // "StructName"
  type: 'Module' | 'Struct' | 'Enum' | 'Function' | 'Trait' | 'ExternalCrate';
  data: {
    filePath: string;
    summary?: string; // LLM-generated summary
  };
}

export interface ArchitectureEdge {
  id: string;
  source: string;
  target: string;
  label: 'uses' | 'contains' | 'impls' | 'calls';
  data?: {
    isViolation?: boolean; // For highlighting drift
  };
}

export interface ArchitectureGraph {
  nodes: ArchitectureNode[];
  edges: ArchitectureEdge[];
}

// Probe-related types
export interface ProbeSearchResult {
  filePath: string;
  lineNumber: number;
  codeSnippet: string;
  contextBefore: string[];
  contextAfter: string[];
  language?: string;
  score: number;
}

export interface ProbeCodeBlock {
  filePath: string;
  code: string;
  language: string;
  startLine: number;
  endLine: number;
  symbols: string[];
  docComments?: string;
}