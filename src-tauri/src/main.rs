// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

// --- Module Declarations ---
mod agents;
mod app_state;
mod baml_client;
mod config;
mod error;
mod mcp_client_runtime;
mod mcp_server;
mod models;
mod scaffolder;
mod services;

// --- Imports ---
use app_state::AppState;
use error::{AppError, Result as AppResult};
use models::*;
use services::human_interface as HumanIF;
use services::knowledge_manager::TantivySearchResultItem;

use std::path::PathBuf;
use std::sync::Arc;
use tauri::{AppHandle, Emitter, Manager, RunEvent, State, WindowEvent, Wry};
use uuid::Uuid;

// --- Utility to add log to state and emit event ---
fn log_to_state_and_emit(
    app_handle: &AppHandle,
    app_state: &State<AppState>,
    component: String,
    level: LogLevel,
    message: String,
    task_id: Option<String>,
    details: Option<serde_json::Value>,
) -> AppResult<()> {
    let entry = GlobalLogEntry {
        id: Uuid::new_v4().to_string(),
        timestamp: std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .unwrap_or_default()
            .as_millis() as u64,
        level,
        component,
        message,
        task_id,
        details,
    };
    let payload_clone = entry.clone();
    {
        // Scope for session lock
        let mut session = app_state.current_project_session.lock();
        if session.logs.len() > 200 {
            session.logs.remove(0);
        } // Keep log buffer manageable
        session.logs.push(entry);
    }
    app_handle.emit_filter("global-log-event", |_t| true, payload_clone)?;
    Ok(())
}

// --- Tauri Commands ---

#[tauri::command]
async fn load_settings(app_state: State<'_, AppState>) -> AppResult<ProjectSettings> {
    // TODO: Load settings from a config file (e.g., project_root/cognito_pilot_settings.json or app data dir)
    // For now, returns default or current in-memory settings.
    Ok(app_state.settings.lock().clone())
}

#[tauri::command]
async fn save_settings(
    settings: ProjectSettings,
    app_state: State<'_, AppState>,
    app_handle: AppHandle,
) -> AppResult<()> {
    // TODO: Save settings to a config file.
    *app_state.settings.lock() = settings.clone();
    log_to_state_and_emit(
        &app_handle,
        &app_state,
        "System".into(),
        LogLevel::Info,
        "Settings saved.".into(),
        None,
        Some(serde_json::to_value(settings)?),
    )?;
    Ok(())
}

#[tauri::command]
async fn initialize_project(
    project_path_str: String,
    app_handle: AppHandle,
    app_state: State<'_, AppState>,
) -> AppResult<()> {
    // ... (Implementation from before, using log_to_state_and_emit) ...
    let path = PathBuf::from(&project_path_str);
    if !path.is_dir() || !path.join("codebase").is_dir() || !path.join("docs").is_dir() { /* ... error ... */
    }
    app_state
        .services
        .workspace_service
        .lock()
        .set_project_root(path.clone())?;
    {
        let mut session = app_state.current_project_session.lock();
        session.project_path = Some(project_path_str.clone());
        session.status = ProjectStatus::Idle;
        session.tasks.clear();
        session.logs.clear();
    }
    log_to_state_and_emit(
        &app_handle,
        &app_state,
        "System".into(),
        LogLevel::Info,
        format!("Project initialized: {}", project_path_str),
        None,
        None,
    )?;

    let km_clone = app_state.services.knowledge_manager_service.clone();
    let settings_clone = app_state.settings.lock().clone(); // Clone settings for async block
    tauri::async_runtime::spawn(async move {
        // TODO: Handle error from update_project_file_index by emitting a log event
        let _ = km_clone
            .lock()
            .update_project_file_index(&project_path_str, &settings_clone)
            .await;
    });
    Ok(())
}

#[tauri::command]
async fn scaffold_project_cmd(
    project_name: String,
    base_path_str: Option<String>,
    is_lib: bool,
    app_handle: AppHandle,
    app_state: State<'_, AppState>,
) -> AppResult<String> {
    // ... (Implementation from before, using log_to_state_and_emit and calling initialize_project) ...
    let root_dir = base_path_str.map_or_else(
        || std::env::current_dir().unwrap_or_default(),
        PathBuf::from,
    );
    let project_target_path = root_dir.join(&project_name);
    if project_target_path.exists() { /* ... error ... */ }
    scaffolder::scaffold_new_project(&project_target_path, &project_name, is_lib)?;
    let success_msg = format!(
        "Project '{}' scaffolded at '{}'",
        project_name,
        project_target_path.display()
    );
    log_to_state_and_emit(
        &app_handle,
        &app_state,
        "Scaffolder".into(),
        LogLevel::Info,
        success_msg.clone(),
        None,
        None,
    )?;
    initialize_project(
        project_target_path.to_string_lossy().into_owned(),
        app_handle.clone(),
        app_state.clone(),
    )
    .await?;
    Ok(success_msg)
}

#[tauri::command]
async fn get_current_session_state(
    app_state: State<'_, AppState>,
) -> AppResult<CurrentProjectSession> {
    Ok(app_state.current_project_session.lock().clone())
}

#[tauri::command]
async fn load_spec_files_from_project(app_state: State<'_, AppState>) -> AppResult<Vec<SpecFile>> {
    // TODO: Use WorkspaceService to list files in `project_root/docs/specs`, read previews.
    Ok(vec![SpecFile {
        name: "example_spec.md".into(),
        relative_path: "docs/specs/example_spec.md".into(),
        content_preview: "Stub: This is an example spec...".into(),
        status: "Pending".into(),
    }])
}

#[tauri::command]
async fn start_full_processing_for_spec(
    spec_relative_path: String,
    app_handle: AppHandle,
    app_state: State<'_, AppState>,
) -> AppResult<()> {
    let spec_file_model = SpecFile {
        /* ... create from spec_relative_path ... */ name: "stub".into(),
        relative_path: spec_relative_path,
        content_preview: "".into(),
        status: "Planning".into(),
    };
    let settings_clone = app_state.settings.lock().clone(); // Clone for async block

    {
        // Scope for session lock
        let mut session = app_state.current_project_session.lock();
        if session.project_path.is_none() {
            return Err(AppError::Config("No project loaded.".into()));
        }
        if !matches!(
            session.status,
            ProjectStatus::Idle | ProjectStatus::CompletedGoal | ProjectStatus::Error(_)
        ) {
            return Err(AppError::InvalidState {
                current_state: format!("{:?}", session.status),
                expected_state: "Idle/CompletedGoal/Error".into(),
                operation: "start_processing_spec".into(),
            });
        }
        session.status = ProjectStatus::Planning;
        session.active_spec_file = Some(spec_file_model.relative_path.clone());
        session.tasks.clear(); // Clear previous tasks
    }
    log_to_state_and_emit(
        &app_handle,
        &app_state,
        "System".into(),
        LogLevel::Info,
        format!("Starting processing for spec: {}", spec_file_model.name),
        None,
        None,
    )?;

    let planner_clone = app_state.agents.planner_agent.clone();
    let app_state_clone = app_state.clone(); // Clone Arc<AppState>
    let app_handle_clone = app_handle.clone();

    // Run planning in a separate task
    tauri::async_runtime::spawn(async move {
        let mut session_for_planner = app_state_clone.current_project_session.lock();
        match planner_clone
            .lock()
            .analyze_and_decompose_spec(&spec_file_model, &mut session_for_planner, &settings_clone)
            .await
        {
            Ok(planner_logs) => {
                for log_entry in planner_logs {
                    let _ = log_to_state_and_emit(
                        &app_handle_clone,
                        &app_state_clone,
                        log_entry.component.clone(),
                        log_entry.level.clone(),
                        log_entry.message.clone(),
                        log_entry.task_id.clone(),
                        log_entry.details.clone(),
                    );
                }
                // Planner updates session status to ReadyToExecute internally
                // Now trigger the main execution loop if planning was successful
                if session_for_planner.status == ProjectStatus::ReadyToExecute {
                    drop(session_for_planner); // Release lock before calling another command that might lock
                    if let Err(e) = run_main_execution_loop(app_handle_clone, app_state_clone).await
                    {
                        let _ = log_to_state_and_emit(
                            &app_handle_clone,
                            &app_state_clone,
                            "System".into(),
                            LogLevel::Error,
                            format!("Execution loop failed: {:?}", e),
                            None,
                            None,
                        );
                        app_state_clone.current_project_session.lock().status =
                            ProjectStatus::Error(format!("Loop Error: {:?}", e));
                    }
                }
            }
            Err(e) => {
                let _ = log_to_state_and_emit(
                    &app_handle_clone,
                    &app_state_clone,
                    "PlannerAgent".into(),
                    LogLevel::Error,
                    format!("Decomposition failed: {:?}", e),
                    None,
                    None,
                );
                session_for_planner.status =
                    ProjectStatus::Error(format!("Planner Error: {:?}", e));
            }
        }
    });
    Ok(())
}

// This is the core execution loop, can be triggered after planning or by a command
async fn run_main_execution_loop(
    app_handle: AppHandle,
    app_state: State<'_, AppState>,
) -> AppResult<()> {
    log_to_state_and_emit(
        &app_handle,
        &app_state,
        "System".into(),
        LogLevel::Info,
        "Starting main execution loop...".into(),
        None,
        None,
    )?;
    loop {
        let mut task_to_run_opt: Option<Task> = None;
        let project_path_clone: String;
        let current_settings: ProjectSettings;
        let mut should_break_loop = false;

        {
            // --- Task Selection Scope ---
            let mut session = app_state.current_project_session.lock();
            project_path_clone = session
                .project_path
                .as_ref()
                .ok_or(AppError::Config("Project path not set in loop".to_string()))?
                .clone();
            current_settings = app_state.settings.lock().clone();

            match session.status {
                ProjectStatus::ReadyToExecute | ProjectStatus::SelfCorrecting(_) | ProjectStatus::CompletedGoal /* to pick up new specs if any */ | ProjectStatus::Idle /* if just started */ => {
                    // If SelfCorrecting, try to re-select the specific task being corrected.
                    let task_id_for_correction = if let ProjectStatus::SelfCorrecting(ref tid) = session.status { Some(tid.clone()) } else { None };

                    if let Some(tid) = task_id_for_correction {
                        task_to_run_opt = session.tasks.iter().find(|t| t.id == tid && t.current_attempt_number < current_settings.max_self_correction_attempts).cloned();
                        if task_to_run_opt.is_none() { // Max attempts reached or task not found
                            log_to_state_and_emit(&app_handle, &app_state, "PlannerAgent".into(), LogLevel::Error, format!("Failed to re-select task {} for self-correction or max attempts reached.", tid), Some(tid.clone()), None)?;
                            session.status = ProjectStatus::AwaitingHumanInput(format!("Task {} failed self-correction.", tid));
                            should_break_loop = true;
                        }
                    } else {
                        task_to_run_opt = app_state.agents.planner_agent.lock().select_next_task(&session).await.cloned();
                    }

                    if let Some(ref task) = task_to_run_opt {
                        session.status = ProjectStatus::ExecutingTask;
                        session.current_task_id_executing = Some(task.id.clone());
                        log_to_state_and_emit(&app_handle, &app_state, "PlannerAgent".into(), LogLevel::Info, format!("Selected task: {} ({})", task.description, task.id), Some(task.id.clone()), None)?;
                    } else {
                        log_to_state_and_emit(&app_handle, &app_state, "PlannerAgent".into(), LogLevel::Info, "No more runnable tasks found.".into(), None, None)?;
                        session.status = if session.tasks.iter().all(|t| t.status == TaskStatus::CompletedSuccess) { ProjectStatus::CompletedGoal } else { ProjectStatus::Idle }; // Or AwaitingHumanInput if some failed
                        should_break_loop = true;
                    }
                }
                ProjectStatus::ExecutingTask | ProjectStatus::Planning => {
                    // Already processing, loop will continue or another trigger will occur.
                    // This check prevents re-entry if loop is called while busy.
                    // This part of the logic might need refinement based on how `run_main_execution_loop` is invoked.
                    // For now, assume it's called once after planning, and then tasks are processed sequentially.
                    // If it's meant to be a persistent poller, this needs adjustment.
                    // For simplicity, let's assume it processes one task then exits, and is re-triggered.
                    // Or, if it's a true loop, it should await some signal or delay.
                    // For this iteration, let's make it process one task and then the loop condition will break if no more tasks.
                    should_break_loop = true; // Let current execution finish
                }
                _ => { // Paused, Error, AwaitingHumanInput, Unloaded
                    log_to_state_and_emit(&app_handle, &app_state, "System".into(), LogLevel::Warn, format!("Execution loop paused or in non-runnable state: {:?}", session.status), None, None)?;
                    should_break_loop = true;
                }
            }
        } // --- End Task Selection Scope (session lock released) ---

        if should_break_loop {
            break;
        }

        if let Some(mut task_to_run) = task_to_run_opt {
            let planner = app_state.agents.planner_agent.clone(); // Arc clone
            let coder = app_state.agents.coder_agent.clone();
            let workspace = app_state.services.workspace_service.clone();
            let knowledge_manager = app_state.services.knowledge_manager_service.clone();

            // 1. Prepare Context
            let (code_ctx, crate_docs_ctx, prep_logs) = planner
                .lock()
                .prepare_context_for_coder(&task_to_run, &project_path_clone, &current_settings)
                .await?;
            for log_entry in prep_logs {
                log_to_state_and_emit(
                    &app_handle,
                    &app_state,
                    log_entry.component,
                    log_entry.level,
                    log_entry.message,
                    log_entry.task_id,
                    log_entry.details,
                )?;
            }

            // Update task in session with context summary (if needed)
            app_state
                .current_project_session
                .lock()
                .tasks
                .iter_mut()
                .find(|t| t.id == task_to_run.id)
                .map(|t| {
                    t.context_summary = format!(
                        "Code Ctx: {} chars, Crate Docs: {} chars",
                        code_ctx.len(),
                        crate_docs_ctx.len()
                    )
                });

            // 2. Execute Task with Coder
            let (coder_output, coder_logs) = coder
                .lock()
                .execute_task(
                    &mut task_to_run,
                    &code_ctx,
                    &crate_docs_ctx,
                    &current_settings,
                )
                .await?;
            for log_entry in coder_logs {
                log_to_state_and_emit(
                    &app_handle,
                    &app_state,
                    log_entry.component,
                    log_entry.level,
                    log_entry.message,
                    log_entry.task_id,
                    log_entry.details,
                )?;
            }

            let mut final_task_status_for_this_attempt: TaskStatus;
            let mut verification_logs_combined = Vec::new();

            if coder_output.success {
                // 3. Apply Changes
                let apply_logs = workspace
                    .lock()
                    .apply_coder_output(&project_path_clone, &coder_output)
                    .await?;
                for log_entry in apply_logs {
                    log_to_state_and_emit(
                        &app_handle,
                        &app_state,
                        log_entry.component,
                        log_entry.level,
                        log_entry.message,
                        log_entry.task_id,
                        log_entry.details,
                    )?;
                }

                // 4. Verification Stages
                let verification_stages = ["fmt", "check", "clippy", "test"]; // TODO: Make configurable per task type
                let mut overall_verification_success = true;
                let mut combined_stdout = String::new();
                let mut combined_stderr = String::new();
                let mut last_exit_code = 0;

                for stage in verification_stages {
                    let emit_fn = Arc::new(|s: String| {
                        app_handle
                            .emit_filter("cargo-stream", |_t| true, s.clone())
                            .unwrap_or_default();
                    });
                    let (stdout, stderr, exit_code, stage_logs) = workspace
                        .lock()
                        .run_verification_stage(stage, &project_path_clone, emit_fn.clone())
                        .await?;
                    for log_entry in stage_logs {
                        verification_logs_combined.push(log_entry);
                    }
                    combined_stdout.push_str(&format!(
                        "\n--- {} STDOUT ---\n{}",
                        stage.to_uppercase(),
                        stdout
                    ));
                    combined_stderr.push_str(&format!(
                        "\n--- {} STDERR ---\n{}",
                        stage.to_uppercase(),
                        stderr
                    ));
                    last_exit_code = exit_code;
                    if exit_code != 0 {
                        overall_verification_success = false;
                        log_to_state_and_emit(
                            &app_handle,
                            &app_state,
                            "WorkspaceService".into(),
                            LogLevel::Warn,
                            format!(
                                "Verification stage '{}' FAILED for task {}",
                                stage, task_to_run.id
                            ),
                            Some(task_to_run.id.clone()),
                            Some(
                                serde_json::json!({"stage": stage, "exit_code": exit_code, "stderr": stderr }),
                            ),
                        )?;
                        break; // Stop further verification if one stage fails
                    } else {
                        log_to_state_and_emit(
                            &app_handle,
                            &app_state,
                            "WorkspaceService".into(),
                            LogLevel::Info,
                            format!(
                                "Verification stage '{}' PASSED for task {}",
                                stage, task_to_run.id
                            ),
                            Some(task_to_run.id.clone()),
                            None,
                        )?;
                    }
                }

                // 5. Process Coder Output & Verification (Planner decides final task status)
                let (status_after_verify, process_logs) = planner
                    .lock()
                    .process_coder_output_and_verification(
                        &mut task_to_run,
                        coder_output,
                        combined_stdout,
                        combined_stderr,
                        last_exit_code,
                        &mut app_state.current_project_session.lock(), // Pass mutable session
                        &current_settings,
                    )
                    .await?;
                final_task_status_for_this_attempt = status_after_verify;
                for log_entry in process_logs {
                    verification_logs_combined.push(log_entry);
                } // Add planner's processing logs
            } else {
                // Coder itself reported failure
                final_task_status_for_this_attempt = TaskStatus::BlockedByError(
                    coder_output
                        .error_message
                        .unwrap_or_else(|| "Coder indicated failure without details.".into()),
                );
                // Update task attempt record (as verification was skipped)
                if let Some(last_attempt) = task_to_run.attempts.last_mut() {
                    last_attempt.verification_exit_code = -1; // Indicate verification skipped
                    last_attempt.llm_error_summary =
                        Some(format!("{:?}", final_task_status_for_this_attempt));
                }
            }
            for log_entry in verification_logs_combined {
                log_to_state_and_emit(
                    &app_handle,
                    &app_state,
                    log_entry.component,
                    log_entry.level,
                    log_entry.message,
                    log_entry.task_id,
                    log_entry.details,
                )?;
            }

            // 6. Update Task and Session State (Final for this iteration)
            {
                // Scope for session lock
                let mut session = app_state.current_project_session.lock();
                if let Some(task_in_session) =
                    session.tasks.iter_mut().find(|t| t.id == task_to_run.id)
                {
                    task_in_session.status = final_task_status_for_this_attempt.clone();
                    task_in_session.attempts = task_to_run.attempts; // Persist attempts
                    task_in_session.last_coder_output = task_to_run.last_coder_output;
                    // Persist last output
                }

                // If task completed successfully, and git strategy is PerTask, commit.
                if final_task_status_for_this_attempt == TaskStatus::CompletedSuccess
                    && current_settings.git_commit_strategy == GitCommitStrategy::PerTask
                {
                    let commit_msg = format!(
                        "AI: Task {} - {} completed.",
                        task_to_run.id,
                        task_to_run.description.chars().take(50).collect::<String>()
                    );
                    let commit_logs = workspace
                        .lock()
                        .git_commit_changes(&project_path_clone, &commit_msg, Some(&task_to_run.id))
                        .await?;
                    for log_entry in commit_logs {
                        log_to_state_and_emit(
                            &app_handle,
                            &app_state,
                            log_entry.component,
                            log_entry.level,
                            log_entry.message,
                            log_entry.task_id,
                            log_entry.details,
                        )?;
                    }
                }

                // If task completed successfully, trigger file index update
                if final_task_status_for_this_attempt == TaskStatus::CompletedSuccess {
                    let km_clone = knowledge_manager.clone(); // Arc clone
                    let pp_clone = project_path_clone.clone();
                    let s_clone = current_settings.clone();
                    tauri::async_runtime::spawn(async move {
                        let _ = km_clone
                            .lock()
                            .update_project_file_index(&pp_clone, &s_clone)
                            .await;
                    });
                }

                // Set session status for next iteration or human input
                if session.status != ProjectStatus::SelfCorrecting(task_to_run.id.clone())
                    && session.status != ProjectStatus::AwaitingHumanInput("".into())
                {
                    // Avoid overriding these specific statuses
                    session.status = ProjectStatus::ReadyToExecute;
                }
                session.current_task_id_executing = None;
            } // session lock released
        } else {
            // This means select_next_task returned None, loop should have broken.
            log_to_state_and_emit(
                &app_handle,
                &app_state,
                "System".into(),
                LogLevel::Warn,
                "Execution loop entered iteration without a task to run. Breaking.".into(),
                None,
                None,
            )?;
            break;
        }
        // TODO: Add a small delay here if this is a tight loop, or make it event-driven.
        // For now, it will loop immediately to pick the next task.
    } // End loop
    log_to_state_and_emit(
        &app_handle,
        &app_state,
        "System".into(),
        LogLevel::Info,
        "Main execution loop finished.".into(),
        None,
        None,
    )?;
    Ok(())
}

#[tauri::command]
async fn submit_human_response(
    task_id: String,
    response_text: String,
    app_handle: AppHandle,
    app_state: State<'_, AppState>,
) -> AppResult<()> {
    // TODO:
    // 1. Find the task by task_id.
    // 2. Update its status (e.g., from AwaitingHumanInput to Pending/Ready).
    // 3. Store response_text in task.human_review_notes.
    // 4. Potentially modify task description or create new sub-tasks based on response.
    // 5. If system was AwaitingHumanInput, change status to ReadyToExecute to resume loop.
    log_to_state_and_emit(
        &app_handle,
        &app_state,
        "HumanInterface".into(),
        LogLevel::HumanInput,
        format!("Human response for task {}: {}", task_id, response_text),
        Some(task_id.clone()),
        None,
    )?;
    {
        let mut session = app_state.current_project_session.lock();
        if let Some(task) = session.tasks.iter_mut().find(|t| t.id == task_id) {
            task.human_review_notes = Some(response_text);
            if matches!(
                task.status,
                TaskStatus::AwaitingHumanClarification | TaskStatus::Failed
            ) {
                // Assuming Failed tasks might also get human input
                task.status = TaskStatus::Pending; // Reset for re-evaluation by planner
            }
        }
        if matches!(session.status, ProjectStatus::AwaitingHumanInput(_)) {
            session.status = ProjectStatus::ReadyToExecute;
        }
    }
    // Optionally, re-trigger the execution loop if it was paused waiting for this.
    // run_main_execution_loop(app_handle, app_state).await?;
    Ok(())
}

#[tauri::command]
async fn get_crate_info_cmd(
    crate_name: String,
    app_state: State<'_, AppState>,
) -> AppResult<Option<CrateInfo>> {
    let project_root = app_state
        .current_project_session
        .lock()
        .project_path
        .as_ref()
        .ok_or(AppError::Config("Project not loaded".into()))?
        .clone();
    let (info_opt, _logs) = app_state
        .services
        .knowledge_manager_service
        .lock()
        .get_crate_documentation_summary(&project_root, &crate_name)
        .await?;
    // This command needs to be reworked to return CrateInfo, not just summary.
    // For now, placeholder:
    if info_opt.is_some() {
        Ok(Some(CrateInfo {
            name: crate_name,
            version: None,
            approval_status: CrateApprovalStatus::Pending,
            documentation_summary: info_opt,
            source_url: None,
            last_qualified_at: None,
        }))
    } else {
        Ok(None)
    }
}

#[tauri::command]
async fn approve_crate_cmd(
    crate_name: String,
    app_state: State<'_, AppState>,
    app_handle: AppHandle,
) -> AppResult<()> {
    // TODO: Update the status of the crate in `CurrentProjectSession.known_crates`.
    // Persist this approval (e.g., to a manifest file in `docs/crate-docs/`).
    log_to_state_and_emit(
        &app_handle,
        &app_state,
        "KnowledgeManager".into(),
        LogLevel::Info,
        format!("Crate {} approved by user.", crate_name),
        None,
        None,
    )?;
    Ok(())
}

#[tauri::command]
async fn rebuild_project_search_index(
    app_handle: AppHandle,
    app_state: State<'_, AppState>,
) -> AppResult<()> {
    let session = app_state.current_project_session.lock();
    let project_root = session
        .project_path
        .as_ref()
        .ok_or(AppError::Config("Project not loaded".into()))?
        .clone();
    let settings = app_state.settings.lock().clone();
    drop(session); // Release lock

    log_to_state_and_emit(
        &app_handle,
        &app_state,
        "KnowledgeManager".into(),
        LogLevel::Info,
        "Manual search index rebuild initiated.".into(),
        None,
        None,
    )?;

    let km_clone = app_state.services.knowledge_manager_service.clone();
    // Run in background as it can be long
    tauri::async_runtime::spawn(async move {
        match km_clone
            .lock()
            .rebuild_full_index(&project_root, &settings)
            .await
        {
            Ok(logs) => {
                for log_entry in logs {
                    let _ = log_to_state_and_emit(
                        &app_handle,
                        &app_state,
                        log_entry.component,
                        log_entry.level,
                        log_entry.message,
                        log_entry.task_id,
                        log_entry.details,
                    );
                }
            }
            Err(e) => {
                let _ = log_to_state_and_emit(
                    &app_handle,
                    &app_state,
                    "KnowledgeManager".into(),
                    LogLevel::Error,
                    format!("Index rebuild failed: {:?}", e),
                    None,
                    None,
                );
            }
        }
    });
    Ok(())
}

#[tauri::command]
async fn search_project_globally(
    query: String,
    doc_type_filter: Option<String>,
    limit: Option<usize>,
    app_handle: AppHandle,
    app_state: State<'_, AppState>,
) -> AppResult<Vec<TantivySearchResultItem>> {
    let session = app_state.current_project_session.lock();
    let project_root = session
        .project_path
        .as_ref()
        .ok_or(AppError::Config("Project not loaded".into()))?
        .clone();
    drop(session);

    log_to_state_and_emit(
        &app_handle,
        &app_state,
        "KnowledgeManager".into(),
        LogLevel::Info,
        format!("Global search initiated for query: {}", query),
        None,
        None,
    )?;

    let km = app_state.services.knowledge_manager_service.lock();
    let (results, search_logs) = km
        .search_index(
            &query,
            limit.unwrap_or(10),
            doc_type_filter.as_deref(),
            &project_root,
        )
        .await?;
    for log_entry in search_logs {
        log_to_state_and_emit(
            &app_handle,
            &app_state,
            log_entry.component,
            log_entry.level,
            log_entry.message,
            log_entry.task_id,
            log_entry.details,
        )?;
    }
    Ok(results)
}

// In main function, add new commands to handler:
// .invoke_handler(tauri::generate_handler![
//     // ... existing commands ...
//     rebuild_project_search_index,
//     search_project_globally
// ])

#[tauri::command]
async fn search_project_globally(
    query: String,
    doc_type_filter: Option<String>,
    limit: Option<usize>,
    app_handle: AppHandle,
    app_state: State<'_, AppState>,
) -> AppResult<Vec<TantivySearchResultItem>> {
    // ... (Full implementation from previous response) ...
    Ok(vec![])
}

// --- Main Application Entry Point ---
fn main() {
    let app_state_instance = AppState::new();

    tauri::Builder::default()
        .manage(app_state_instance)
        .invoke_handler(tauri::generate_handler![
            load_settings,
            save_settings,
            initialize_project,
            scaffold_project_cmd,
            get_current_session_state,
            load_spec_files_from_project,
            start_full_processing_for_spec,
            submit_human_response,
            get_crate_info_cmd,
            approve_crate_cmd,
            rebuild_project_search_index,
            search_project_globally
        ])
        .setup(|app| {
            let handle = app.handle().clone();
            let app_state_clone = app.state::<AppState>().clone();
            let _ = log_to_state_and_emit(
                &handle,
                &app_state_clone,
                "System".into(),
                LogLevel::Info,
                "Cognito Pilot application started.".into(),
                None,
                None,
            );
            #[cfg(debug_assertions)]
            {
                if let Some(main_window) = app.get_webview_window("main") {
                    main_window.open_devtools();
                }
            }
            Ok(())
        })
        .build(tauri::generate_context!())
        .expect("error while building tauri application")
        .run(|_app_handle, event| match event {
            RunEvent::ExitRequested { api, .. } => {
                tracing::info!("App exit requested.");
                // TODO: Add cleanup logic here
                // api.prevent_exit(); // Uncomment to prevent closing
            }
            _ => {}
        });
}
