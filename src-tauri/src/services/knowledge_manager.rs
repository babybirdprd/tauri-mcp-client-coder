use std::sync::Arc;
use parking_lot::Mutex;
use std::path::{Path, PathBuf};
use tantivy::collector::{TopDocs, Count};
use tantivy::query::QueryParser;
use tantivy::schema::*;
use tantivy::{doc, Index, IndexWriter, IndexReader, ReloadPolicy, DocAddress, Term};
use walkdir::WalkDir;
use crate::services::workspace::WorkspaceService; // To read files
use crate::models::{CrateInfo, GlobalLogEntry, LogLevel, ProjectSettings, Task};
use crate::error::{Result as AppResult, AppError};
use crate::baml_client::BamlClient;
use uuid::Uuid;

// --- Tantivy Schema Definition ---
// We'll define fields that are common across different document types.
const FIELD_ID: &str = "id"; // Relative path, unique identifier
const FIELD_PROJECT_ROOT: &str = "project_root";
const FIELD_DOC_TYPE: &str = "doc_type"; // "rust_code", "code_doc", "spec_doc", "crate_summary_doc"
const FIELD_TITLE: &str = "title"; // Filename or extracted H1
const FIELD_CONTENT: &str = "content"; // Full text content
const FIELD_SYMBOLS: &str = "symbols"; // For rust_code: function names, struct names, etc.
const FIELD_TAGS: &str = "tags"; // General tags/keywords
const FIELD_LAST_MODIFIED: &str = "last_modified"; // u64 timestamp

fn build_tantivy_schema() -> Schema {
    let mut schema_builder = Schema::builder();
    schema_builder.add_text_field(FIELD_ID, STRING | STORED); // Unique ID, path
    schema_builder.add_text_field(FIELD_PROJECT_ROOT, STRING | STORED);
    schema_builder.add_text_field(FIELD_DOC_TYPE, STRING | STORED | FAST); // Fast for filtering/faceting
    schema_builder.add_text_field(FIELD_TITLE, TEXT | STORED);
    schema_builder.add_text_field(FIELD_CONTENT, TEXT | STORED);
    schema_builder.add_text_field(FIELD_SYMBOLS, TEXT | STORED); // For code symbols
    schema_builder.add_text_field(FIELD_TAGS, TEXT | STORED | FAST); // For keywords
    schema_builder.add_u64_field(FIELD_LAST_MODIFIED, INDEXED | STORED | FAST);
    schema_builder.build()
}

// --- Rust Code Symbol Extraction (Conceptual) ---
fn extract_rust_symbols(code: &str) -> Vec<String> {
    let mut symbols = Vec::new();
    // TODO: Use `syn::parse_file` and a `syn::visit::Visit` implementation
    // to traverse the AST and extract names of functions, structs, enums, traits, impls.
    // For brevity, this is a placeholder.
    // Example:
    // if let Ok(syntax_tree) = syn::parse_file(code) {
    //     struct SymbolVisitor<'a> { symbols: &'a mut Vec<String> }
    //     impl<'ast, 'a> syn::visit::Visit<'ast> for SymbolVisitor<'a> {
    //         fn visit_item_fn(&mut self, i: &'ast syn::ItemFn) {
    //             self.symbols.push(i.sig.ident.to_string());
    //             syn::visit::visit_item_fn(self, i);
    //         }
    //         // ... visit other items like ItemStruct, ItemEnum, etc. ...
    //     }
    //     let mut visitor = SymbolVisitor { symbols: &mut symbols };
    //     visitor.visit_file(&syntax_tree);
    // }
    if code.contains("fn main") { symbols.push("main".to_string()); } // Very basic stub
    symbols
}


pub struct KnowledgeManagerService {
    workspace_service: Arc<Mutex<WorkspaceService>>,
    baml_client: Arc<BamlClient>,
    index: Option<Index>, // Tantivy index
    reader: Option<IndexReader>, // Tantivy reader
    schema: Schema,
    // current_project_root_for_index: Option<PathBuf>, // To know which project index is open
}

impl KnowledgeManagerService {
    pub fn new(workspace_service: Arc<Mutex<WorkspaceService>>, baml_client: Arc<BamlClient>) -> Self {
        Self {
            workspace_service,
            baml_client,
            index: None,
            reader: None,
            schema: build_tantivy_schema(),
            // current_project_root_for_index: None,
        }
    }

    fn log_entry(&self, message: String, level: LogLevel, details: Option<serde_json::Value>) -> GlobalLogEntry {
        GlobalLogEntry { id: Uuid::new_v4().to_string(), timestamp: std::time::SystemTime::now().duration_since(std::time::UNIX_EPOCH).unwrap_or_default().as_millis() as u64, level, component: "KnowledgeManager".to_string(), message, task_id: None, details }
    }

    fn get_index_path(&self, project_root_str: &str) -> PathBuf {
        PathBuf::from(project_root_str).join(".cognito_pilot_index")
    }

    pub async fn open_or_create_index(&mut self, project_root_str: &str) -> AppResult<Vec<GlobalLogEntry>> {
        let mut logs = Vec::new();
        let index_path = self.get_index_path(project_root_str);
        logs.push(self.log_entry(format!("Opening/Creating Tantivy index at: {}", index_path.display()), LogLevel::Info, None));

        let index = if !index_path.exists() {
            std::fs::create_dir_all(&index_path).map_err(|e| AppError::Io(format!("Failed to create index dir: {}", e)))?;
            Index::create_in_dir(&index_path, self.schema.clone())?
        } else {
            Index::open_in_dir(&index_path).map_err(|e| AppError::Io(format!("Failed to open index: {}. Consider deleting the index directory if corrupted.", e)))?
        };

        let reader = index.reader_builder()
            .reload_policy(ReloadPolicy::OnCommit) // Or Manual
            .try_into()?;

        self.index = Some(index);
        self.reader = Some(reader);
        // self.current_project_root_for_index = Some(PathBuf::from(project_root_str));
        logs.push(self.log_entry("Tantivy index initialized successfully.".into(), LogLevel::Info, None));
        Ok(logs)
    }

    pub async fn add_document_to_index(
        &self, index_writer: &mut IndexWriter, project_root_str: &str, relative_path_str: &str, doc_type: &str, content: &str,
    ) -> AppResult<()> {
        let id_field = self.schema.get_field(FIELD_ID).unwrap();
        let project_root_field = self.schema.get_field(FIELD_PROJECT_ROOT).unwrap();
        let doc_type_field = self.schema.get_field(FIELD_DOC_TYPE).unwrap();
        let title_field = self.schema.get_field(FIELD_TITLE).unwrap();
        let content_field = self.schema.get_field(FIELD_CONTENT).unwrap();
        let symbols_field = self.schema.get_field(FIELD_SYMBOLS).unwrap();
        // let tags_field = self.schema.get_field(FIELD_TAGS).unwrap();
        let last_modified_field = self.schema.get_field(FIELD_LAST_MODIFIED).unwrap();

        // Delete existing document with the same ID (path) before adding new one
        let id_term = Term::from_field_text(id_field, relative_path_str);
        index_writer.delete_term(id_term);

        let mut doc = Document::default();
        doc.add_text(id_field, relative_path_str);
        doc.add_text(project_root_field, project_root_str);
        doc.add_text(doc_type_field, doc_type);
        doc.add_text(title_field, Path::new(relative_path_str).file_name().unwrap_or_default().to_string_lossy()); // Simple title
        doc.add_text(content_field, content);

        if doc_type == "rust_code" {
            let symbols = extract_rust_symbols(content);
            for symbol in symbols {
                doc.add_text(symbols_field, &symbol);
            }
        }
        // TODO: Add last_modified from file metadata
        // let metadata = tokio::fs::metadata(PathBuf::from(project_root_str).join(relative_path_str)).await?;
        // let modified_timestamp = metadata.modified()?.duration_since(std::time::UNIX_EPOCH).map_err(|_| AppError::Operation("Time error".into()))?.as_secs();
        // doc.add_u64(last_modified_field, modified_timestamp);


        index_writer.add_document(doc)?;
        Ok(())
    }

    pub async fn rebuild_full_index(&mut self, project_root_str: &str, settings: &ProjectSettings) -> AppResult<Vec<GlobalLogEntry>> {
        let mut logs = Vec::new();
        if self.index.is_none() || self.reader.is_none() {
            let init_logs = self.open_or_create_index(project_root_str).await?;
            logs.extend(init_logs);
        }
        let index = self.index.as_ref().ok_or(AppError::Operation("Index not initialized for rebuild".into()))?;
        let mut index_writer = index.writer(50_000_000)?; // 50MB heap for writer

        logs.push(self.log_entry(format!("Starting full index rebuild for project: {}", project_root_str), LogLevel::Info, None));
        let ws = self.workspace_service.lock();

        let paths_to_index = vec![
            (PathBuf::from(project_root_str).join("codebase"), "rust_code", vec!["rs"]),
            (PathBuf::from(project_root_str).join("codebase-docs"), "code_doc", vec!["md"]),
            (PathBuf::from(project_root_str).join("docs/specs"), "spec_doc", vec!["md"]),
            (PathBuf::from(project_root_str).join("docs/crate-docs"), "crate_summary_doc", vec!["md"]), // Local summaries
        ];

        for (dir_to_scan, doc_type, extensions) in paths_to_index {
            if !dir_to_scan.exists() {
                logs.push(self.log_entry(format!("Directory not found for indexing: {}, skipping.", dir_to_scan.display()), LogLevel::Warn, None));
                continue;
            }
            logs.push(self.log_entry(format!("Indexing directory: {} as type '{}'", dir_to_scan.display(), doc_type), LogLevel::Debug, None));
            for entry in WalkDir::new(dir_to_scan).into_iter().filter_map(|e| e.ok()) {
                if entry.file_type().is_file() {
                    let path = entry.path();
                    if let Some(ext_str) = path.extension().and_then(|e| e.to_str()) {
                        if extensions.contains(&ext_str) {
                            let relative_path = path.strip_prefix(project_root_str).unwrap_or(path); // Path relative to project root
                            match ws.read_file_from_project(project_root_str, &relative_path.to_string_lossy()).await {
                                Ok(content) => {
                                    if let Err(e) = self.add_document_to_index(&mut index_writer, project_root_str, &relative_path.to_string_lossy(), doc_type, &content).await {
                                        logs.push(self.log_entry(format!("Failed to index {}: {:?}", relative_path.display(), e), LogLevel::Error, None));
                                    }
                                }
                                Err(e) => {
                                    logs.push(self.log_entry(format!("Failed to read {} for indexing: {:?}", relative_path.display(), e), LogLevel::Error, None));
                                }
                            }
                        }
                    }
                }
            }
        }
        index_writer.commit()?;
        // self.reader.as_ref().unwrap().reload()?; // Reload reader after commit
        logs.push(self.log_entry("Full index rebuild completed.".into(), LogLevel::Info, None));
        Ok(logs)
    }

    pub async fn update_document_in_index(&mut self, project_root_str: &str, relative_path_str: &str, doc_type: &str) -> AppResult<Vec<GlobalLogEntry>> {
        let mut logs = Vec::new();
         if self.index.is_none() {
            let init_logs = self.open_or_create_index(project_root_str).await?;
            logs.extend(init_logs);
        }
        let index = self.index.as_ref().ok_or(AppError::Operation("Index not initialized for update".into()))?;
        let mut index_writer = index.writer(10_000_000)?; // Smaller heap for single update

        logs.push(self.log_entry(format!("Updating document in index: {}", relative_path_str), LogLevel::Debug, None));
        let ws = self.workspace_service.lock();
        match ws.read_file_from_project(project_root_str, relative_path_str).await {
            Ok(content) => {
                if let Err(e) = self.add_document_to_index(&mut index_writer, project_root_str, relative_path_str, doc_type, &content).await {
                    logs.push(self.log_entry(format!("Failed to update index for {}: {:?}", relative_path_str, e), LogLevel::Error, None));
                    return Err(e);
                }
            }
            Err(AppError::Io(_)) => { // File might have been deleted
                let id_field = self.schema.get_field(FIELD_ID).unwrap();
                let id_term = Term::from_field_text(id_field, relative_path_str);
                index_writer.delete_term(id_term);
                logs.push(self.log_entry(format!("Document deleted from index (file not found): {}", relative_path_str), LogLevel::Debug, None));
            }
            Err(e) => {
                logs.push(self.log_entry(format!("Failed to read {} for index update: {:?}", relative_path_str, e), LogLevel::Error, None));
                return Err(e);
            }
        }
        index_writer.commit()?;
        Ok(logs)
    }


    #[derive(Serialize, Deserialize, Debug)]
    pub struct TantivySearchResultItem {
        pub score: f32,
        pub relative_path: String,
        pub title: String,
        pub doc_type: String,
        pub snippet_html: Option<String>, // With highlighted terms
    }

    pub async fn search_index(
        &self, query_str: &str, limit: usize, doc_type_filter: Option<&str>, project_root_str: &str
    ) -> AppResult<(Vec<TantivySearchResultItem>, Vec<GlobalLogEntry>)> {
        let mut logs = Vec::new();
        if self.reader.is_none() {
            // Attempt to open index if not already open for this project
            // This assumes KM service might be long-lived but project context changes.
            // A better approach is to ensure open_or_create_index is called when project is loaded.
            let init_logs = self.open_or_create_index(project_root_str).await?; // Ensure index is open
            logs.extend(init_logs);
        }
        let reader = self.reader.as_ref().ok_or(AppError::Operation("Tantivy reader not available.".into()))?;
        reader.reload()?; // Ensure reader has latest commits

        let searcher = reader.searcher();
        let id_field = self.schema.get_field(FIELD_ID).unwrap();
        let title_field = self.schema.get_field(FIELD_TITLE).unwrap();
        let content_field = self.schema.get_field(FIELD_CONTENT).unwrap();
        let symbols_field = self.schema.get_field(FIELD_SYMBOLS).unwrap();
        let doc_type_f = self.schema.get_field(FIELD_DOC_TYPE).unwrap();

        // Default fields to search: title, content, symbols
        let default_search_fields = vec![title_field, content_field, symbols_field];
        let query_parser = QueryParser::for_index(self.index.as_ref().unwrap(), default_search_fields);

        let mut final_query_str = query_str.to_string();
        if let Some(dt_filter) = doc_type_filter {
            final_query_str = format!("({}) AND {}:\"{}\"", query_str, FIELD_DOC_TYPE, dt_filter);
        }

        let query = query_parser.parse_query(&final_query_str)
            .map_err(|e| AppError::Operation(format!("Failed to parse Tantivy query '{}': {}", final_query_str, e)))?;

        let top_docs = searcher.search(&query, &TopDocs::with_limit(limit))?;
        let mut results = Vec::new();

        for (score, doc_address) in top_docs {
            let retrieved_doc = searcher.doc(doc_address)?;
            let relative_path = retrieved_doc.get_first(id_field).and_then(|v| v.as_text()).unwrap_or("").to_string();
            let title = retrieved_doc.get_first(title_field).and_then(|v| v.as_text()).unwrap_or(&relative_path).to_string();
            let doc_type_val = retrieved_doc.get_first(doc_type_f).and_then(|v| v.as_text()).unwrap_or("unknown").to_string();

            // TODO: Generate snippet with highlighting
            // let mut snippet_generator = SnippetGenerator::create(&searcher, &*query, content_field)?;
            // let snippet = snippet_generator.snippet_from_doc(&retrieved_doc);
            // let snippet_html = snippet.to_html(); // This highlights terms

            results.push(TantivySearchResultItem {
                score, relative_path, title, doc_type: doc_type_val, snippet_html: None, // Some(snippet_html)
            });
        }
        logs.push(self.log_entry(format!("Tantivy search for '{}' yielded {} results.", query_str, results.len()), LogLevel::Debug, Some(serde_json::json!({"query": query_str, "filter": doc_type_filter, "limit": limit}))));
        Ok((results, logs))
    }

    // ... get_crate_documentation_summary, update_project_file_index, qualify_and_add_crate, get_known_crates ...
    // These would remain, but update_project_file_index might become less critical if Tantivy search is good.
    // qualify_and_add_crate would also add the crate summary to Tantivy index.
}
