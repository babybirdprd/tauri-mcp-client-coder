use serde::Serialize;
use thiserror::Error;

#[derive(Debug, Error, Serialize, Clone)] // Added Clone
pub enum AppError {
    #[error("IO Error: {0}")]
    Io(String),
    #[error("Serialization Error: {0}")]
    Serialization(String),
    #[error("Tauri API Error: {0}")]
    Tauri(String),
    #[error("Agent Error (Agent: {agent}, Task: {task_id:?}): {message}")]
    Agent { agent: String, task_id: Option<String>, message: String },
    #[error("Service Error (Service: {service}): {message}")]
    Service { service: String, message: String },
    #[error("Configuration Error: {0}")]
    Config(String),
    #[error("Operation Error: {0}")]
    Operation(String),
    #[error("LLM/BAML Error: {0}")]
    Llm(String),
    #[error("Human Input Required: {prompt}")]
    HumanInputRequired { prompt: String },
    #[error("Resource Not Found: {resource_type} - {identifier}")]
    NotFound { resource_type: String, identifier: String },
    #[error("Verification Failed: {stage} - {details}")]
    Verification { stage: String, details: String },
    #[error("Task Dependency Error: Task {task_id} missing dependency {dependency_id}")]
    TaskDependency { task_id: String, dependency_id: String },
    #[error("Invalid State for Operation: Current state {current_state}, expected {expected_state} for {operation}")]
    InvalidState { current_state: String, expected_state: String, operation: String },
}

impl From<std::io::Error> for AppError {
    fn from(err: std::io::Error) -> Self { AppError::Io(err.to_string()) }
}
impl From<serde_json::Error> for AppError {
    fn from(err: serde_json::Error) -> Self { AppError::Serialization(err.to_string()) }
}
impl From<tauri::Error> for AppError {
    fn from(err: tauri::Error) -> Self { AppError::Tauri(err.to_string()) }
}
// Add From<reqwest::Error> if BAML client uses reqwest directly and doesn't map errors
impl From<reqwest::Error> for AppError {
    fn from(err: reqwest::Error) -> Self { AppError::Llm(format!("HTTP Client (reqwest) Error: {}", err)) }
}


pub type Result<T, E = AppError> = std::result::Result<T, E>;
