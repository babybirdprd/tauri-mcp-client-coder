use rust_mcp_sdk::macros::{mcp_tool, tool_box, JsonSchema};
use serde::{Deserialize, Serialize};

#[mcp_tool(name = "get_file_content", description = "Reads the full content of a file at a given path relative to the project root.", read_only_hint = true)]
#[derive(Debug, Deserialize, Serialize, JsonSchema)]
pub struct GetFileContentTool {
    pub relative_path: String,
}

#[mcp_tool(name = "project_search", description = "Performs a full-text search across the project's codebase, documentation, and specs using Tantivy.", read_only_hint = true)]
#[derive(Debug, Deserialize, Serialize, JsonSchema)]
pub struct ProjectSearchTool {
    pub query: String,
    pub doc_type_filter: Option<String>,
    pub limit: Option<usize>,
}

#[mcp_tool(name = "apply_changes", description = "Applies a set of file changes (create, modify, delete) to the workspace and commits them with a message.", destructive_hint = true)]
#[derive(Debug, Deserialize, Serialize, JsonSchema)]
pub struct ApplyChangesTool {
    pub changes: Vec<crate::models::ChangedFileContent>,
    pub commit_message: String,
}

tool_box!(
    InternalTools,
    [GetFileContentTool, ProjectSearchTool, ApplyChangesTool]
);