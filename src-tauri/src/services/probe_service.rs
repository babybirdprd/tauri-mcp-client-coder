use crate::error::{AppError, Result as AppResult};
use crate::models::GlobalLogEntry;
use parking_lot::Mutex;
use probe::models::{CodeBlock, LimitedSearchResults, SearchLimits, SearchResult};
use probe::query::{perform_query, QueryOptions};
use probe::search::perform_probe;
use probe::extract::process_file_for_extraction;
use std::collections::HashMap;
use std::path::{Path, PathBuf};
use std::sync::Arc;

/// Service that provides probe-based code search and analysis functionality
pub struct ProbeService {
    query_cache: Mutex<HashMap<String, Vec<SearchResult>>>,
}

impl ProbeService {
    pub fn new() -> Self {
        Self {
            query_cache: Mutex::new(HashMap::new()),
        }
    }

    /// Search for code with the given query in the specified directory
    pub async fn search_code(
        &self,
        query: &str,
        directory_path: &Path,
        file_extensions: Option<Vec<String>>,
        max_results: Option<usize>,
        context_lines: Option<usize>,
    ) -> AppResult<(Vec<SearchResult>, Vec<GlobalLogEntry>)> {
        let mut logs = Vec::new();
        
        logs.push(GlobalLogEntry::info(
            "ProbeService".into(),
            format!("Searching for code with query: '{}' in {}", query, directory_path.display()),
            None,
            None,
        ));

        // Use the search functionality from the probe crate
        let limits = SearchLimits {
            max_results: max_results.unwrap_or(50),
            max_context_lines: context_lines.unwrap_or(3),
        };

        let results = perform_probe(
            query,
            directory_path.to_str().ok_or_else(|| AppError::IO("Invalid directory path".into()))?,
            file_extensions.unwrap_or_else(|| vec![]),
            limits,
        )
        .map_err(|e| AppError::External(format!("Probe search error: {}", e)))?;

        logs.push(GlobalLogEntry::info(
            "ProbeService".into(),
            format!("Found {} results for query: '{}'", results.len(), query),
            None,
            None,
        ));

        Ok((results, logs))
    }

    /// Execute a structured query using probe's query engine
    pub async fn execute_query(
        &self,
        query: &str,
        directory_path: &Path,
        language: Option<String>,
    ) -> AppResult<(Vec<CodeBlock>, Vec<GlobalLogEntry>)> {
        let mut logs = Vec::new();
        
        logs.push(GlobalLogEntry::info(
            "ProbeService".into(),
            format!("Executing structured query: '{}' in {}", query, directory_path.display()),
            None,
            None,
        ));

        let options = QueryOptions {
            language: language,
            allow_tests: true,
            ..Default::default()
        };

        let results = perform_query(
            query,
            directory_path.to_str().ok_or_else(|| AppError::IO("Invalid directory path".into()))?,
            &options,
        )
        .map_err(|e| AppError::External(format!("Probe query error: {}", e)))?;

        logs.push(GlobalLogEntry::info(
            "ProbeService".into(),
            format!("Found {} code blocks for query: '{}'", results.len(), query),
            None,
            None,
        ));

        Ok((results, logs))
    }

    /// Extract code blocks from a specific file
    pub async fn extract_from_file(
        &self,
        file_path: &Path,
        pattern: Option<&str>,
    ) -> AppResult<(Vec<CodeBlock>, Vec<GlobalLogEntry>)> {
        let mut logs = Vec::new();
        
        logs.push(GlobalLogEntry::info(
            "ProbeService".into(),
            format!("Extracting code from file: {}", file_path.display()),
            None,
            None,
        ));

        // Determine file extension for language detection
        let extension = file_path
            .extension()
            .and_then(|ext| ext.to_str())
            .unwrap_or("");

        let file_content = std::fs::read_to_string(file_path)
            .map_err(|e| AppError::IO(format!("Failed to read file: {}", e)))?;

        let blocks = process_file_for_extraction(
            &file_content,
            extension,
            pattern,
            true, // allow_tests
            None, // No custom options
        )
        .map_err(|e| AppError::External(format!("Probe extraction error: {}", e)))?;

        logs.push(GlobalLogEntry::info(
            "ProbeService".into(),
            format!("Extracted {} code blocks from file", blocks.len()),
            None,
            None,
        ));

        Ok((blocks, logs))
    }
}