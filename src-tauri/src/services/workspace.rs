use crate::error::{AppError, Result as AppResult};
use crate::models::{ChangedFileContent, FileAction, GlobalLogEntry, LogLevel};
use std::io::{BufRead, BufReader};
use std::path::{Path, PathBuf};
use std::process::{Command as StdCommand, Stdio}; // Renamed to avoid conflict
use tauri::api::process::Command as TauriCommand; // For logging

pub struct WorkspaceService {
    current_project_root: Option<PathBuf>,
}

impl WorkspaceService {
    pub fn new() -> Self {
        Self {
            current_project_root: None,
        }
    }
    pub fn set_project_root(&mut self, path: PathBuf) -> AppResult<()> {
        /* ... as before ... */
        Ok(())
    }
    fn get_project_root(&self) -> AppResult<&PathBuf> {
        /* ... as before ... */
        Ok(self.current_project_root.as_ref().unwrap())
    }
    fn get_codebase_root(&self) -> AppResult<PathBuf> {
        Ok(self.get_project_root()?.join("codebase"))
    }
    fn get_codebase_docs_root(&self) -> AppResult<PathBuf> {
        Ok(self.get_project_root()?.join("codebase-docs"))
    }
    fn get_docs_root(&self) -> AppResult<PathBuf> {
        Ok(self.get_project_root()?.join("docs"))
    }

    pub async fn read_file_from_project(
        &self,
        project_root_str: &str,
        relative_path_from_project: &str,
    ) -> AppResult<String> {
        // TODO: Implement robust file reading, ensure path is within project_root_str.
        let full_path = PathBuf::from(project_root_str).join(relative_path_from_project);
        tokio::fs::read_to_string(&full_path)
            .await
            .map_err(|e| AppError::Io(format!("Read {}: {}", full_path.display(), e)))
    }

    pub async fn write_file_to_project(
        &self,
        project_root_str: &str,
        relative_path_from_project: &str,
        content: &str,
    ) -> AppResult<()> {
        // TODO: Implement robust file writing, ensure path is within project_root_str. Create parent dirs.
        let full_path = PathBuf::from(project_root_str).join(relative_path_from_project);
        if let Some(parent) = full_path.parent() {
            tokio::fs::create_dir_all(parent).await?;
        }
        tokio::fs::write(&full_path, content)
            .await
            .map_err(|e| AppError::Io(format!("Write {}: {}", full_path.display(), e)))
    }

    pub async fn apply_coder_output(
        &self,
        project_root_str: &str,
        coder_output: &crate::models::CoderOutput,
    ) -> AppResult<Vec<GlobalLogEntry>> {
        let mut logs = Vec::new();
        let project_root_path = PathBuf::from(project_root_str);

        for file_change in &coder_output.changed_files {
            let target_dir = self.get_codebase_root()?; // Assuming these are codebase changes
            let full_path = target_dir.join(&file_change.relative_path);
            // TODO: Implement applying file_change (Create, Modify, Delete) to full_path using tokio::fs.
            // Log each action.
            logs.push(GlobalLogEntry {
                id: Uuid::new_v4().to_string(),
                timestamp: 0,
                level: LogLevel::Debug,
                component: "WorkspaceService".into(),
                message: format!(
                    "Applying file change: {:?} to {}",
                    file_change.action,
                    full_path.display()
                ),
                task_id: Some(coder_output.task_id.clone()),
                details: None,
            });
            match file_change.action {
                FileAction::Created | FileAction::Modified => {
                    if let Some(parent) = full_path.parent() {
                        tokio::fs::create_dir_all(parent).await?;
                    }
                    tokio::fs::write(&full_path, &file_change.content).await?;
                }
                FileAction::Deleted => {
                    if full_path.exists() {
                        tokio::fs::remove_file(&full_path).await?;
                    }
                }
            }
        }
        for doc_change in &coder_output.generated_docs {
            let target_dir = self.get_codebase_docs_root()?;
            let full_path = target_dir.join(&doc_change.relative_path);
            // TODO: Implement applying doc_change to full_path.
            logs.push(GlobalLogEntry {
                id: Uuid::new_v4().to_string(),
                timestamp: 0,
                level: LogLevel::Debug,
                component: "WorkspaceService".into(),
                message: format!(
                    "Applying doc change: {:?} to {}",
                    doc_change.action,
                    full_path.display()
                ),
                task_id: Some(coder_output.task_id.clone()),
                details: None,
            });
            match doc_change.action {
                FileAction::Created | FileAction::Modified => {
                    if let Some(parent) = full_path.parent() {
                        tokio::fs::create_dir_all(parent).await?;
                    }
                    tokio::fs::write(&full_path, &doc_change.content).await?;
                }
                FileAction::Deleted => { /* ... */ }
            }
        }
        Ok(logs)
    }

    pub async fn run_verification_stage(
        &self,
        stage: &str,
        project_root_str: &str,
        emit_progress_fn: Arc<dyn Fn(String) + Send + Sync>,
    ) -> AppResult<(String, String, i32, Vec<GlobalLogEntry>)> {
        let mut logs = Vec::new();
        let codebase_root = PathBuf::from(project_root_str).join("codebase");
        let args: Vec<&str> = match stage {
            "fmt" => vec!["fmt", "--all", "--check"],
            "clippy" => vec![
                "clippy",
                "--all-targets",
                "--all-features",
                "--",
                "-D",
                "warnings",
            ],
            "test" => vec!["test", "--all-targets", "--all-features", "--no-fail-fast"],
            "check" => vec!["check", "--all-targets", "--all-features"],
            _ => {
                return Err(AppError::Operation(format!(
                    "Unknown verification stage: {}",
                    stage
                )))
            }
        };
        logs.push(GlobalLogEntry {
            id: Uuid::new_v4().to_string(),
            timestamp: 0,
            level: LogLevel::Debug,
            component: "WorkspaceService".into(),
            message: format!(
                "Running cargo {} at {}",
                args.join(" "),
                codebase_root.display()
            ),
            task_id: None,
            details: None,
        });

        // TODO: Implement robust async command execution with StdCommand or tokio::process::Command.
        // Capture stdout, stderr, exit_code. Stream output using emit_progress_fn.
        // This is a simplified blocking approach for demonstration.
        let process = StdCommand::new("cargo")
            .current_dir(&codebase_root)
            .args(&args)
            .stdout(Stdio::piped())
            .stderr(Stdio::piped())
            .spawn()
            .map_err(|e| AppError::Operation(format!("Failed to spawn cargo {:?}: {}", args, e)))?;

        let mut stdout_str = String::new();
        let mut stderr_str = String::new();
        // Reading stdout
        if let Some(stdout_pipe) = process.stdout {
            let reader = BufReader::new(stdout_pipe);
            for line_result in reader.lines() {
                if let Ok(line) = line_result {
                    emit_progress_fn(format!("[{}:stdout] {}", stage, line));
                    stdout_str.push_str(&line);
                    stdout_str.push('\n');
                }
            }
        }
        // Reading stderr
        if let Some(stderr_pipe) = process.stderr {
            let reader = BufReader::new(stderr_pipe);
            for line_result in reader.lines() {
                if let Ok(line) = line_result {
                    emit_progress_fn(format!("[{}:stderr] {}", stage, line));
                    stderr_str.push_str(&line);
                    stderr_str.push('\n');
                }
            }
        }
        let status = process
            .wait_with_output()
            .map_err(|e| AppError::Operation(format!("Cargo command failed to complete: {}", e)))?
            .status;

        Ok((stdout_str, stderr_str, status.code().unwrap_or(-1), logs))
    }

    pub async fn search_code_with_sidecar_ripgrep(
        &self,
        query: &str,
        file_pattern: Option<&str>,
        project_root_str: &str,
    ) -> AppResult<(String, Vec<GlobalLogEntry>)> {
        let mut logs = Vec::new();
        let codebase_root = PathBuf::from(project_root_str).join("codebase");
        // TODO: Implement ripgrep sidecar execution as detailed before.
        // Ensure `binaries/rg` is correctly configured in tauri.conf.json and bundled.
        // Capture JSON output from ripgrep.
        logs.push(GlobalLogEntry {
            id: Uuid::new_v4().to_string(),
            timestamp: 0,
            level: LogLevel::Debug,
            component: "WorkspaceService".into(),
            message: format!(
                "Running ripgrep sidecar with query: '{}', pattern: {:?}",
                query, file_pattern
            ),
            task_id: None,
            details: None,
        });

        let mut rg_args = vec![query.to_string(), ".".to_string(), "--json".to_string()];
        if let Some(pattern) = file_pattern {
            rg_args.extend_from_slice(&["-g".to_string(), pattern.to_string()]);
        }

        let (mut rx, mut child) = TauriCommand::new_sidecar("binaries/rg")?
            .args(rg_args)
            .current_dir(codebase_root)
            .spawn()?;
        let mut output_json_lines = Vec::new();
        // ... (ripgrep output collection logic as before) ...
        while let Some(event) = rx.recv().await {
            /* ... handle CommandEvent ... */
            if let tauri::api::process::CommandEvent::Stdout(line) = event {
                output_json_lines.push(line);
            }
        }
        let _status = child.wait().await?; // Ensure process finishes

        Ok((output_json_lines.join("\n"), logs))
    }

    pub async fn git_commit_changes(
        &self,
        project_root_str: &str,
        message: &str,
        task_id: Option<&str>,
    ) -> AppResult<Vec<GlobalLogEntry>> {
        let mut logs = Vec::new();
        let codebase_root = PathBuf::from(project_root_str).join("codebase"); // Commits usually happen in codebase
                                                                              // TODO: Implement `git add .` and `git commit -m "{message}"` in `codebase_root`.
                                                                              // Use StdCommand or tokio::process::Command.
        logs.push(GlobalLogEntry {
            id: Uuid::new_v4().to_string(),
            timestamp: 0,
            level: LogLevel::Info,
            component: "WorkspaceService".into(),
            message: format!("Git committing changes with message: {}", message),
            task_id: task_id.map(String::from),
            details: None,
        });
        Ok(logs)
    }
}
