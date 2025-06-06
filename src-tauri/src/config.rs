use crate::error::{Result as AppResult, AppError};
use serde::{Deserialize, Serialize};
use std::path::Path;

#[derive(Serialize, Deserialize, Debug, Clone)]
#[serde(default)]
pub struct ProjectConfig {
    pub code_root: String,
    pub specs_dir: String,
    pub architecture_file: String,
    pub code_docs_dir: String,
    pub enabled_internal_tools: Vec<String>,
}

impl Default for ProjectConfig {
    fn default() -> Self {
        Self {
            code_root: ".".to_string(),
            specs_dir: "docs/specifications".to_string(),
            architecture_file: "docs/architecture.md".to_string(),
            code_docs_dir: "docs/code_documentation".to_string(),
            enabled_internal_tools: vec!["*".to_string()],
        }
    }
}

impl ProjectConfig {
    pub async fn load(project_root: &Path) -> AppResult<Self> {
        let config_path = project_root.join("cognito_pilot.toml");
        if !config_path.exists() {
            return Ok(ProjectConfig::default());
        }
        let content = tokio::fs::read_to_string(&config_path).await?;
        toml::from_str(&content).map_err(|e| AppError::Config(format!("Failed to parse cognito_pilot.toml: {}", e)))
    }
}