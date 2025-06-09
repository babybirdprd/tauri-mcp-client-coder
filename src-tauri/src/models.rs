use serde::{Serialize, Deserialize};
use std::path::PathBuf;

#[derive(Serialize, Deserialize, Debug, Clone, Default)]
pub struct ProjectSettings {
    pub tier1_llm_model_alias: String,
    pub tier2_llm_model_alias: String,
    pub llm_api_key: Option<String>,
    pub autonomy_level: AutonomyLevel,
    pub git_commit_strategy: GitCommitStrategy,
    pub max_self_correction_attempts: u32,
}

#[derive(Serialize, Deserialize, Debug, Clone, Default, PartialEq)]
pub enum AutonomyLevel { #[default] FullAutopilot, ApprovalCheckpoints, ManualStepThrough }
#[derive(Serialize, Deserialize, Debug, Clone, Default, PartialEq)]
pub enum GitCommitStrategy { #[default] PerTask, PerFeature, Manual }

#[derive(Serialize, Deserialize, Debug, Clone, Default, PartialEq)]
pub enum ProjectStatus {
    #[default] Unloaded, Idle, Planning, ReadyToExecute, ExecutingTask,
    AwaitingHumanInput(String), SelfCorrecting(String),
    Paused, Error(String), CompletedGoal,
}

#[derive(Serialize, Deserialize, Debug, Clone, PartialEq)]
pub enum TaskStatus {
    Pending, Ready, InProgress, BlockedByDependency,
    BlockedByError(String), AwaitingHumanClarification,

    CompletedSuccess, CompletedWithWarnings, Failed,
}

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct TaskAttempt {
    pub attempt_number: u32,
    pub code_generated_summary: Option<String>,
    pub verification_stdout: String,
    pub verification_stderr: String,
    pub verification_exit_code: i32,
    pub llm_error_summary: Option<String>,
    pub coder_notes: Option<String>,
}

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct Task {
    pub id: String, pub parent_id: Option<String>, pub description: String,
    pub task_type: TaskType, pub status: TaskStatus, pub context_summary: String,
    pub dependencies: Vec<String>, pub sub_task_ids: Vec<String>,
    pub attempts: Vec<TaskAttempt>, pub current_attempt_number: u32,
    pub last_coder_output: Option<CoderOutput>,
    pub human_review_notes: Option<String>,
}

#[derive(Serialize, Deserialize, Debug, Clone, PartialEq)]
pub enum TaskType {
    AnalyzeSpec, DecomposeSpec, DefineStruct, ImplementFunction, WriteUnitTest,
    WriteIntegrationTest, WriteE2ETest, RefactorCode, UpdateFileDocumentation,
    UpdateCrateDocumentation, SetupNewCrate, RunVerificationStage, RequestHumanInput,
    GitCommit, GitPush, UpdateFileIndex, QualifyCrate,
}

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct CoderOutput {
    pub task_id: String, pub changed_files: Vec<ChangedFileContent>,
    pub generated_docs: Vec<ChangedFileContent>,
    pub notes: Option<String>, pub success: bool, pub error_message: Option<String>,
}

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct ChangedFileContent {
    pub relative_path: String, pub content: String, pub action: FileAction,
}
#[derive(Serialize, Deserialize, Debug, Clone, PartialEq)]
pub enum FileAction { Created, Modified, Deleted }

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct SpecFile {
    pub name: String, pub relative_path: String,
    pub content_preview: String, pub status: String,
}

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct CrateInfo {
    pub name: String, pub version: Option<String>,
    pub approval_status: CrateApprovalStatus,
    pub documentation_summary: Option<String>, pub source_url: Option<String>,
    pub last_qualified_at: Option<u64>,
}
#[derive(Serialize, Deserialize, Debug, Clone, PartialEq)]
pub enum CrateApprovalStatus { Pending, Approved, Rejected, NeedsManualReview }

#[derive(Serialize, Deserialize, Debug, Clone, PartialEq)]
pub enum LogLevel { Info, Warn, Error, Debug, AgentTrace, HumanInput, LLMTrace }

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct GlobalLogEntry {
    pub id: String, pub timestamp: u64, pub level: LogLevel, pub component: String,
    pub message: String, pub task_id: Option<String>, pub details: Option<serde_json::Value>,
}

impl GlobalLogEntry {
    pub fn info(
        component: String,
        message: String,
        task_id: Option<String>,
        details: Option<serde_json::Value>,
    ) -> Self {
        Self {
            id: uuid::Uuid::new_v4().to_string(),
            timestamp: std::time::SystemTime::now()
                .duration_since(std::time::UNIX_EPOCH)
                .unwrap_or_default()
                .as_millis() as u64,
            level: LogLevel::Info,
            component,
            message,
            task_id,
            details,
        }
    }
    
    pub fn error(
        component: String,
        message: String,
        task_id: Option<String>,
        details: Option<serde_json::Value>,
    ) -> Self {
        Self {
            id: uuid::Uuid::new_v4().to_string(),
            timestamp: std::time::SystemTime::now()
                .duration_since(std::time::UNIX_EPOCH)
                .unwrap_or_default()
                .as_millis() as u64,
            level: LogLevel::Error,
            component,
            message,
            task_id,
            details,
        }
    }
}

// --- Probe-specific models ---

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct ProbeSearchResult {
    pub file_path: String,
    pub line_number: usize,
    pub code_snippet: String,
    pub context_before: Vec<String>,
    pub context_after: Vec<String>,
    pub language: Option<String>,
    pub score: f32,
}

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct ProbeCodeBlock {
    pub file_path: String,
    pub code: String,
    pub language: String,
    pub start_line: usize,
    pub end_line: usize,
    pub symbols: Vec<String>,
    pub doc_comments: Option<String>,
}