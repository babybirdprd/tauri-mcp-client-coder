use crate::app_state::{AppServices, CurrentProjectSession};
use crate::baml_client::{BamlClient, BamlTaskOutput, BamlTaskType as BamlClientTaskType};
use crate::error::{AppError, Result as AppResult};
use crate::models::{
    CoderOutput, GlobalLogEntry, LogLevel, ProjectSettings, ProjectStatus, SpecFile, Task,
    TaskStatus, TaskType,
};
use crate::services::knowledge_manager::TantivySearchResultItem;
use parking_lot::Mutex;
use std::sync::Arc;
use uuid::Uuid;

// Helper to convert BAML TaskType to model TaskType
fn baml_task_type_to_model(baml_type: BamlClientTaskType) -> TaskType {
    /* ... as before ... */
    TaskType::ImplementFunction
}

pub struct PlannerAgent {
    services: Arc<AppServices>,
    baml_client: Arc<BamlClient>,
}

impl PlannerAgent {
    pub fn new(services: Arc<AppServices>, baml_client: Arc<BamlClient>) -> Self {
        Self {
            services,
            baml_client,
        }
    }

    fn log_entry(
        &self,
        message: String,
        level: LogLevel,
        task_id: Option<String>,
        details: Option<serde_json::Value>,
    ) -> GlobalLogEntry {
        GlobalLogEntry {
            id: Uuid::new_v4().to_string(),
            timestamp: std::time::SystemTime::now()
                .duration_since(std::time::UNIX_EPOCH)
                .unwrap_or_default()
                .as_millis() as u64,
            level,
            component: "PlannerAgent".to_string(),
            message,
            task_id,
            details,
        }
    }

    pub async fn prepare_context_for_coder(
        &self,
        task: &Task,
        project_path: &str,
        settings: &ProjectSettings,
    ) -> AppResult<(String, String, Vec<GlobalLogEntry>)> {
        // (code_ctx, crate_docs_ctx, logs)
        let mut logs = Vec::new();
        logs.push(self.log_entry(
            format!("Preparing BAML context for Coder, task: {}", task.id),
            LogLevel::Debug,
            Some(task.id.clone()),
            None,
            None,
        ));

        let workspace = self.services.workspace_service.lock();
        let knowledge_manager = self.services.knowledge_manager_service.lock(); // Tantivy is here

        let mut relevant_code_context_str = String::new();
        let mut relevant_crate_docs_str = String::new();

        // --- Intelligent Context Fetching using Tantivy ---
        // 1. Parse task.description for keywords, symbols, file names, crate names.
        // TODO: Implement NLP or regex for keyword extraction from task.description.
        let keywords_from_task = vec![task.task_type.to_string()]; // Basic: use task type as a keyword
                                                                   // Add more sophisticated keyword extraction here.

        if !keywords_from_task.is_empty() {
            let query = keywords_from_task.join(" OR "); // Example query construction

            // Search for relevant code files
            match knowledge_manager
                .search_index(&query, 3, Some("rust_code"), project_path)
                .await
            {
                Ok((code_results, search_logs)) => {
                    logs.extend(search_logs);
                    for item in code_results.iter().take(2) {
                        // Take top 2 code results
                        match workspace.read_file_from_project(project_path, &item.relative_path).await {
                            Ok(content) => relevant_code_context_str.push_str(&format!("\n--- Relevant Code File: {} (Score: {:.2}) ---\n```rust\n{}\n```\n", item.relative_path, item.score, content.chars().take(1500).collect::<String>())), // Limit content length
                            Err(e) => logs.push(self.log_entry(format!("CtxPrep: Failed to read {}: {:?}", item.relative_path, e), LogLevel::Warn, Some(task.id.clone()), None)),
                        }
                    }
                }
                Err(e) => logs.push(self.log_entry(
                    format!(
                        "CtxPrep: Tantivy code search failed for query '{}': {:?}",
                        query, e
                    ),
                    LogLevel::Error,
                    Some(task.id.clone()),
                    None,
                )),
            }

            // Search for relevant documentation (specs or codebase docs)
            match knowledge_manager
                .search_index(&query, 2, Some("code_doc"), project_path)
                .await
            {
                // Also search "spec_doc"
                Ok((doc_results, search_logs)) => {
                    logs.extend(search_logs);
                    for item in doc_results.iter().take(1) {
                        // Take top 1 doc result
                        match workspace
                            .read_file_from_project(project_path, &item.relative_path)
                            .await
                        {
                            Ok(content) => relevant_code_context_str.push_str(&format!(
                                "\n--- Relevant Documentation: {} (Score: {:.2}) ---\n{}\n",
                                item.relative_path,
                                item.score,
                                content.chars().take(1000).collect::<String>()
                            )),
                            Err(e) => logs.push(self.log_entry(
                                format!("CtxPrep: Failed to read {}: {:?}", item.relative_path, e),
                                LogLevel::Warn,
                                Some(task.id.clone()),
                                None,
                            )),
                        }
                    }
                }
                Err(e) => logs.push(self.log_entry(
                    format!(
                        "CtxPrep: Tantivy doc search failed for query '{}': {:?}",
                        query, e
                    ),
                    LogLevel::Error,
                    Some(task.id.clone()),
                    None,
                )),
            }
        }

        // TODO: Extract crate names mentioned in task.description and fetch their summaries
        // using knowledge_manager.get_crate_documentation_summary (which might itself use Tantivy if summaries are indexed)
        // and append to `relevant_crate_docs_str`.

        if relevant_code_context_str.is_empty() {
            relevant_code_context_str =
                "// No specific code context found by Tantivy for this task.".to_string();
        }
        if relevant_crate_docs_str.is_empty() {
            relevant_crate_docs_str =
                "// No specific crate documentation context identified for this task.".to_string();
        }

        logs.push(self.log_entry(
            "Context preparation with Tantivy completed.".into(),
            LogLevel::Debug,
            Some(task.id.clone()),
            Some(serde_json::json!({
                "code_ctx_len": relevant_code_context_str.len(),
                "crate_docs_ctx_len": relevant_crate_docs_str.len(),
            })),
        ));

        Ok((relevant_code_context_str, relevant_crate_docs_str, logs))
    }

    pub async fn analyze_and_decompose_spec(
        &self,
        spec_file: &SpecFile,
        project_session: &mut CurrentProjectSession,
        settings: &ProjectSettings,
    ) -> AppResult<Vec<GlobalLogEntry>> {
        let mut logs = Vec::new();
        logs.push(self.log_entry(
            format!("Starting BAML decomposition for spec: {}", spec_file.name),
            LogLevel::Info,
            None,
            None,
        ));
        // ... (fetch spec_content, architecture_content, file_index_content as before) ...
        let project_root = project_session
            .project_path
            .as_ref()
            .ok_or(AppError::Operation("Project path not set".into()))?;
        let workspace = self.services.workspace_service.lock();
        let spec_content = workspace
            .read_file_from_project(project_root, &spec_file.relative_path)
            .await?;
        let architecture_content = workspace
            .read_file_from_project(project_root, "docs/architecture.md")
            .await
            .unwrap_or_else(|_| "Not available.".to_string());
        let file_index_content = workspace
            .read_file_from_project(project_root, "docs/file-index.md")
            .await
            .unwrap_or_else(|_| "Not available.".to_string());

        let baml_tasks: Vec<BamlTaskOutput> = self
            .baml_client
            .decompose_specification(
                &spec_file.name,
                &spec_content,
                &architecture_content,
                &file_index_content,
            )
            .await
            .map_err(|e| {
                logs.push(self.log_entry(
                    format!("BAML DecomposeSpecification failed: {:?}", e),
                    LogLevel::Error,
                    None,
                    None,
                ));
                AppError::Llm(format!("BAML DecomposeSpecification: {:?}", e))
            })?;

        // TODO: Post-process baml_tasks:
        // 1. Validate IDs are unique.
        // 2. Build a proper parent_id hierarchy if BAML output is flat but implies hierarchy.
        // 3. Ensure all dependencies point to valid task IDs from the current decomposition.
        // 4. Convert to model_tasks as before.
        let model_tasks = baml_tasks
            .into_iter()
            .map(|bt| Task {
                id: bt.id,
                parent_id: bt.parent_id,
                description: bt.description,
                task_type: baml_task_type_to_model(bt.task_type),
                status: TaskStatus::Pending,
                context_summary: "Awaiting context preparation".into(),
                dependencies: bt.dependencies,
                sub_task_ids: vec![],
                attempts: vec![],
                current_attempt_number: 0,
                last_coder_output: None,
                human_review_notes: None,
            })
            .collect();

        project_session.tasks = model_tasks;
        project_session.status = ProjectStatus::ReadyToExecute;
        logs.push(self.log_entry(
            format!(
                "BAML decomposition complete. {} tasks created.",
                project_session.tasks.len()
            ),
            LogLevel::Info,
            None,
            None,
        ));
        Ok(logs)
    }

    pub async fn select_next_task<'a>(
        &self,
        project_session: &'a CurrentProjectSession,
    ) -> Option<&'a Task> {
        // TODO: Implement more sophisticated task selection:
        // - Prioritize tasks based on type (e.g., setup before implementation).
        // - Consider task readiness (Pending or Ready status).
        // - Ensure all dependencies are in CompletedSuccess status.
        project_session.tasks.iter().find(|task| {
            (task.status == TaskStatus::Pending || task.status == TaskStatus::Ready)
                && task.dependencies.iter().all(|dep_id| {
                    project_session
                        .tasks
                        .iter()
                        .find(|t| t.id == *dep_id)
                        .map_or(false, |t_dep| t_dep.status == TaskStatus::CompletedSuccess)
                })
        })
    }

    pub async fn prepare_context_for_coder(
        &self,
        task: &Task,
        project_path: &str,
        settings: &ProjectSettings,
    ) -> AppResult<(String, String, Vec<GlobalLogEntry>)> {
        // (code_ctx, crate_docs_ctx, logs)
        let mut logs = Vec::new();
        logs.push(self.log_entry(
            format!("Preparing BAML context for Coder, task: {}", task.id),
            LogLevel::Debug,
            Some(task.id.clone()),
            None,
        ));

        let workspace = self.services.workspace_service.lock();
        let knowledge_manager = self.services.knowledge_manager_service.lock();

        let mut relevant_code_context_str = String::new();
        let mut relevant_crate_docs_str = String::new();

        // TODO: Implement intelligent context fetching based on task.description and task.task_type:
        // 1. Parse task.description for file paths, function/struct names, crate names.
        // 2. Use WorkspaceService.search_code_with_sidecar_ripgrep for usages/definitions.
        // 3. Use WorkspaceService.read_file_from_project to get content of relevant files.
        // 4. Use KnowledgeManagerService.get_crate_documentation_summary for mentioned crates.
        // 5. Concatenate these into `relevant_code_context_str` and `relevant_crate_docs_str`.
        //    Be mindful of context window limits for the LLM. Summarize if necessary.
        relevant_code_context_str =
            "// Stub: Relevant code context would be fetched here.".to_string();
        relevant_crate_docs_str = "// Stub: Relevant crate docs would be fetched here.".to_string();
        logs.push(self.log_entry(
            "Context preparation stub executed.".into(),
            LogLevel::Debug,
            Some(task.id.clone()),
            None,
        ));

        Ok((relevant_code_context_str, relevant_crate_docs_str, logs))
    }

    pub async fn process_coder_output_and_verification(
        &self,
        task: &mut Task,
        coder_output: CoderOutput,
        verification_stdout: String,
        verification_stderr: String,
        verification_exit_code: i32,
        project_session: &mut CurrentProjectSession,
        settings: &ProjectSettings,
    ) -> AppResult<(TaskStatus, Vec<GlobalLogEntry>)> {
        let mut logs = Vec::new();
        let log_prefix = format!("[Task {} Att.{}] ", task.id, task.current_attempt_number);

        task.last_coder_output = Some(coder_output.clone()); // Store last output

        let mut current_task_status: TaskStatus;

        if !coder_output.success {
            current_task_status = TaskStatus::BlockedByError(
                coder_output
                    .error_message
                    .unwrap_or_else(|| "Coder marked as failed without specific error.".into()),
            );
            logs.push(self.log_entry(
                format!("{}Coder failed task: {:?}", log_prefix, current_task_status),
                LogLevel::Error,
                Some(task.id.clone()),
                None,
            ));
        } else if verification_exit_code != 0 {
            // TODO: Parse verification_stderr for specific errors to make status more informative
            current_task_status = TaskStatus::BlockedByError(format!(
                "Verification failed (code {}): {}",
                verification_exit_code,
                verification_stderr
                    .lines()
                    .take(5)
                    .collect::<Vec<_>>()
                    .join("\n")
            ));
            logs.push(self.log_entry(format!("{}Verification failed: {:?}", log_prefix, current_task_status), LogLevel::Warn, Some(task.id.clone()), Some(serde_json::json!({ "stdout": verification_stdout, "stderr": verification_stderr }))));
        } else {
            current_task_status = TaskStatus::CompletedSuccess;
            logs.push(self.log_entry(
                format!("{}Task successfully coded and verified.", log_prefix),
                LogLevel::Info,
                Some(task.id.clone()),
                None,
            ));
        }

        // Update task attempt record (assuming it was pushed by CoderAgent.execute_task before this call)
        if let Some(last_attempt) = task.attempts.last_mut() {
            last_attempt.verification_stdout = verification_stdout;
            last_attempt.verification_stderr = verification_stderr;
            last_attempt.verification_exit_code = verification_exit_code;
            if !matches!(current_task_status, TaskStatus::CompletedSuccess) {
                last_attempt.llm_error_summary = Some(format!("{:?}", current_task_status));
                // Or specific error from coder_output
            }
        }

        // Self-correction logic
        if !matches!(current_task_status, TaskStatus::CompletedSuccess)
            && task.current_attempt_number < settings.max_self_correction_attempts
        {
            logs.push(self.log_entry(
                format!(
                    "{}Attempting self-correction (attempt {}/{})",
                    log_prefix,
                    task.current_attempt_number + 1,
                    settings.max_self_correction_attempts
                ),
                LogLevel::Info,
                Some(task.id.clone()),
                None,
            ));
            project_session.status = ProjectStatus::SelfCorrecting(task.id.clone());
            // The task status itself remains BlockedByError, but the session status indicates self-correction is underway for this task.
            // The main loop will pick this task up again for the CoderAgent.
        } else if !matches!(current_task_status, TaskStatus::CompletedSuccess) {
            logs.push(self.log_entry(format!("{}Max self-correction attempts reached or coder indicated unrecoverable error. Task failed.", log_prefix), LogLevel::Error, Some(task.id.clone()), None));
            current_task_status = TaskStatus::Failed; // Final failure
            project_session.status = ProjectStatus::AwaitingHumanInput(format!(
                "Task {} failed after {} attempts. Needs review.",
                task.id, task.current_attempt_number
            ));
        }

        Ok((current_task_status, logs))
    }
}
