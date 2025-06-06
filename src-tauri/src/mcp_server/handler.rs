use async_trait::async_trait;
use rust_mcp_sdk::mcp_server::ServerHandler;
use rust_mcp_sdk::schema::{CallToolError, CallToolRequest, CallToolResult, ListToolsRequest, ListToolsResult, RpcError};
use rust_mcp_sdk::McpServer;
use std::sync::Arc;
use crate::app_state::AppServices;
use crate::mcp_server::tools::InternalTools;
use crate::models::CoderOutput;

pub struct InternalMcpHandler {
    pub services: Arc<AppServices>,
    pub project_root: String,
}

#[async_trait]
impl ServerHandler for InternalMcpHandler {
    async fn handle_list_tools_request(&self, _request: ListToolsRequest, _runtime: &dyn McpServer) -> Result<ListToolsResult, RpcError> {
        Ok(ListToolsResult { tools: InternalTools::tools(), meta: None, next_cursor: None })
    }

    async fn handle_call_tool_request(&self, request: CallToolRequest, _runtime: &dyn McpServer) -> Result<CallToolResult, CallToolError> {
        let tool_call = InternalTools::try_from(request.params).map_err(|e| CallToolError::invalid_params(Some(e.to_string())))?;

        match tool_call {
            InternalTools::GetFileContentTool(params) => {
                let ws = self.services.workspace_service.lock();
                match ws.read_file_from_project(&self.project_root, ¶ms.relative_path).await {
                    Ok(content) => Ok(CallToolResult::json_content(serde_json::json!({ "content": content }), None)),
                    Err(e) => Err(CallToolError::internal_error(Some(e.to_string()))),
                }
            }
            InternalTools::ProjectSearchTool(params) => {
                let km = self.services.knowledge_manager_service.lock();
                match km.search_index(¶ms.query, params.limit.unwrap_or(10), params.doc_type_filter.as_deref(), &self.project_root).await {
                    Ok((results, _logs)) => Ok(CallToolResult::json_content(serde_json::to_value(results).unwrap_or_default(), None)),
                    Err(e) => Err(CallToolError::internal_error(Some(e.to_string()))),
                }
            }
            InternalTools::ApplyChangesTool(params) => {
                let ws = self.services.workspace_service.lock();
                let coder_output = CoderOutput {
                    task_id: "mcp_tool_call".to_string(),
                    changed_files: params.changes,
                    generated_docs: vec![],
                    notes: Some("Changes applied via ApplyChangesTool".to_string()),
                    success: true,
                    error_message: None,
                };
                match ws.apply_coder_output(&self.project_root, &coder_output).await {
                    Ok(_) => {
                        match ws.git_commit_changes(&self.project_root, ¶ms.commit_message, None).await {
                            Ok(_) => Ok(CallToolResult::text_content("Changes applied and committed successfully.".to_string(), None)),
                            Err(e) => Err(CallToolError::internal_error(Some(format!("Changes applied but commit failed: {}", e)))),
                        }
                    }
                    Err(e) => Err(CallToolError::internal_error(Some(e.to_string()))),
                }
            }
        }
    }
}