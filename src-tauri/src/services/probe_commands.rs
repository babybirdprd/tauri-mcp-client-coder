use crate::app_state::AppState;
use crate::error::{AppError, Result as AppResult};
use crate::models::{GlobalLogEntry, ProbeCodeBlock, ProbeSearchResult};
use std::path::{Path, PathBuf};
use tauri::{AppHandle, State};

// Convert a probe::models::SearchResult to our internal ProbeSearchResult
fn convert_search_result(result: &probe::models::SearchResult) -> ProbeSearchResult {
    ProbeSearchResult {
        file_path: result.file_path.clone(),
        line_number: result.line_number,
        code_snippet: result.matched_line.clone(),
        context_before: result.context_before.clone(),
        context_after: result.context_after.clone(),
        language: result.language.clone(),
        score: result.score,
    }
}

// Convert a probe::models::CodeBlock to our internal ProbeCodeBlock
fn convert_code_block(block: &probe::models::CodeBlock, file_path: &str) -> ProbeCodeBlock {
    ProbeCodeBlock {
        file_path: file_path.to_string(),
        code: block.content.clone(),
        language: block.language.clone().unwrap_or_else(|| "unknown".to_string()),
        start_line: block.start_line,
        end_line: block.end_line,
        symbols: block.symbols.clone().unwrap_or_default(),
        doc_comments: block.doc_comments.clone(),
    }
}

/// Command to search code with the probe
#[tauri::command]
pub async fn probe_search_code(
    query: String,
    directory: Option<String>,
    file_extensions: Option<Vec<String>>,
    max_results: Option<usize>,
    context_lines: Option<usize>,
    app_handle: AppHandle,
    app_state: State<'_, AppState>,
) -> AppResult<Vec<ProbeSearchResult>> {
    let session = app_state.current_project_session.lock();
    let project_root = match &directory {
        Some(dir) => PathBuf::from(dir),
        None => match &session.project_path {
            Some(path) => PathBuf::from(path),
            None => return Err(AppError::Config("No project path set".into())),
        },
    };
    drop(session);

    let (results, logs) = app_state
        .services
        .probe_service
        .lock()
        .search_code(
            &query,
            &project_root,
            file_extensions,
            max_results,
            context_lines,
        )
        .await?;

    // Log all the service logs
    for log in logs {
        let app_state_clone = app_state.clone();
        let _ = log_to_state_and_emit(&app_handle, &app_state_clone, &log);
    }

    // Convert the results to our internal format
    let converted_results = results.iter().map(convert_search_result).collect();
    Ok(converted_results)
}

/// Command to execute a structured query using probe's query engine
#[tauri::command]
pub async fn probe_execute_query(
    query: String,
    directory: Option<String>,
    language: Option<String>,
    app_handle: AppHandle,
    app_state: State<'_, AppState>,
) -> AppResult<Vec<ProbeCodeBlock>> {
    let session = app_state.current_project_session.lock();
    let project_root = match &directory {
        Some(dir) => PathBuf::from(dir),
        None => match &session.project_path {
            Some(path) => PathBuf::from(path),
            None => return Err(AppError::Config("No project path set".into())),
        },
    };
    drop(session);

    let (blocks, logs) = app_state
        .services
        .probe_service
        .lock()
        .execute_query(&query, &project_root, language)
        .await?;

    // Log all the service logs
    for log in logs {
        let app_state_clone = app_state.clone();
        let _ = log_to_state_and_emit(&app_handle, &app_state_clone, &log);
    }

    // Convert the blocks to our internal format
    let project_root_str = project_root.to_string_lossy().to_string();
    let converted_blocks = blocks
        .iter()
        .map(|block| convert_code_block(block, &project_root_str))
        .collect();

    Ok(converted_blocks)
}

/// Command to extract code blocks from a specific file
#[tauri::command]
pub async fn probe_extract_from_file(
    file_path: String,
    pattern: Option<String>,
    app_handle: AppHandle,
    app_state: State<'_, AppState>,
) -> AppResult<Vec<ProbeCodeBlock>> {
    let path = PathBuf::from(file_path.clone());
    
    if !path.exists() {
        return Err(AppError::IO(format!("File does not exist: {}", file_path)));
    }

    let (blocks, logs) = app_state
        .services
        .probe_service
        .lock()
        .extract_from_file(&path, pattern.as_deref())
        .await?;

    // Log all the service logs
    for log in logs {
        let app_state_clone = app_state.clone();
        let _ = log_to_state_and_emit(&app_handle, &app_state_clone, &log);
    }

    // Convert the blocks to our internal format
    let converted_blocks = blocks
        .iter()
        .map(|block| convert_code_block(block, &file_path))
        .collect();

    Ok(converted_blocks)
}

// Helper function to log events and emit them
fn log_to_state_and_emit(
    app_handle: &AppHandle,
    app_state: &State<AppState>,
    log_entry: &GlobalLogEntry,
) -> AppResult<()> {
    let payload_clone = log_entry.clone();
    {
        // Scope for session lock
        let mut session = app_state.current_project_session.lock();
        if session.logs.len() > 200 {
            session.logs.remove(0);
        } // Keep log buffer manageable
        session.logs.push(log_entry.clone());
    }
    app_handle.emit_filter("global-log-event", |_t| true, payload_clone)?;
    Ok(())
}