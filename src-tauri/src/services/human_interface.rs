use crate::error::{AppError, Result as AppResult};
use crate::models::{GlobalLogEntry, LogLevel};
use tauri::{AppHandle, Emitter, Manager}; // Manager for get_window
use uuid::Uuid;

// This service is more of a collection of utility functions that use AppHandle.
// It's not typically stored in AppState directly if methods need AppHandle.

pub async fn notify_frontend_user(
    app_handle: &AppHandle,
    event_name: &str,
    payload: impl serde::Serialize + Clone,
) -> AppResult<()> {
    app_handle.emit_filter(event_name, |_target| true, payload)?; // Emit to all webviews
    Ok(())
}

pub async fn send_log_to_frontend(
    app_handle: &AppHandle,
    component: String,
    level: LogLevel,
    message: String,
    task_id: Option<String>,
    details: Option<serde_json::Value>,
) -> AppResult<()> {
    let log_entry = GlobalLogEntry {
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
    // Note: AppState's internal log buffer should also be updated. This function is just for emitting.
    // The `log_and_emit` utility in main.rs handles both.
    app_handle.emit_filter("global-log-event", |_target| true, log_entry)?;
    Ok(())
}

pub async fn request_human_input_modal(
    app_handle: &AppHandle,
    task_id: String,
    prompt: String,
) -> AppResult<()> {
    // TODO:
    // 1. Emit an event like "human-input-request" to the frontend with { task_id, prompt }.
    // 2. Frontend shows a modal and captures input.
    // 3. Frontend calls a Tauri command like `submit_human_input(task_id, input_text)`.
    // 4. The Planner/System then needs to be unblocked, perhaps by checking a shared state or a channel
    //    that `submit_human_input` writes to. This is a complex async interaction.
    notify_frontend_user(
        app_handle,
        "human-input-request",
        serde_json::json!({ "taskId": task_id, "prompt": prompt }),
    )
    .await?;
    Err(AppError::HumanInputRequired { prompt }) // Signal that input is now awaited
}
