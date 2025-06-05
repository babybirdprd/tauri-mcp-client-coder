This GlobalSearch.tsx component would then be added to one of the main views, like the Dashboard or as a persistent search bar in the Nav or header.

Summary of Tantivy Integration:

KnowledgeManagerService now encapsulates Tantivy index creation, management, document addition/updating, and searching.

A Tantivy schema is defined for various document types.

Initial indexing (rebuild_full_index) scans project directories.

Incremental updates (update_document_in_index) are intended to be called after file modifications (e.g., by WorkspaceService.apply_coder_output or a file watcher).

PlannerAgent now uses Tantivy search results to gather more relevant context for the CoderAgent.

syn crate is conceptually included for extracting Rust symbols to enhance code searchability (implementation stubbed).

New Tauri commands (rebuild_project_search_index, search_project_globally) expose Tantivy functionality to the frontend.

A placeholder React component (GlobalSearch.tsx) demonstrates how the UI might interact with the Tantivy search.

This makes the system's internal knowledge retrieval much more powerful.

Consolidated TODO List (Including Tantivy)

Rust Backend (src-tauri/):

All previous TODOs remain relevant, plus:

services/knowledge_manager.rs (Tantivy Specific):

TODO: build_tantivy_schema: Finalize schema fields, consider tokenizers for different languages/content.

TODO: extract_rust_symbols: Fully implement using syn::visit::Visit to traverse AST and extract function, struct, enum, trait, impl names, and potentially comments or docstrings associated with them.

TODO: open_or_create_index: Ensure robust error handling for index corruption (e.g., offer to delete and rebuild).

TODO: add_document_to_index:

Implement extraction of last_modified timestamp from file metadata and add to Tantivy doc.

Implement title extraction for Markdown (e.g., first H1).

Implement tag extraction (e.g., from frontmatter in Markdown, or keywords from content).

TODO: rebuild_full_index: Optimize file reading and document processing for large projects. Consider parallelizing parts of the indexing if safe.

TODO: update_document_in_index: Ensure it's called correctly after WorkspaceService.apply_coder_output (this requires a notification mechanism or direct call).

TODO: search_index:

Implement SnippetGenerator to provide highlighted search snippets in results.

Allow more advanced query construction (e.g., field-specific queries, boolean operators) passed from UI or agents.

Consider adding faceting capabilities based on doc_type or tags.

TODO: get_crate_documentation_summary: If local summaries are indexed in Tantivy, query them here.

TODO: qualify_and_add_crate: After generating/fetching a crate summary, add it to the Tantivy index with doc_type: "crate_summary_doc".

agents/planner.rs (Tantivy Usage):

TODO: prepare_context_for_coder:

Implement sophisticated keyword/symbol extraction from task.description.

Construct meaningful Tantivy queries based on these extractions.

Handle and combine results from multiple Tantivy searches (e.g., for code, for docs).

Implement logic for summarizing or selecting snippets from Tantivy results to respect LLM context window limits.

main.rs (Tantivy Commands & Integration):

TODO: Ensure rebuild_project_search_index is exposed and can be called from UI (e.g., in Settings).

TODO: Ensure initialize_project triggers an initial rebuild_full_index or checks if index exists and is current.

TODO: After WorkspaceService.apply_coder_output successfully applies changes, ensure KnowledgeManagerService.update_document_in_index is called for each affected file. This might involve the run_main_execution_loop coordinating this call.

React Frontend (src/):

All previous frontend TODOs remain relevant, plus:

utils/tauriApi.ts:

TODO: Add TypeScript interface for TantivySearchResultItem matching the Rust struct.

TODO: Add API functions for rebuild_project_search_index and search_project_globally.

New Component GlobalSearch.tsx:

TODO: Integrate this component into the main UI (e.g., in Nav.tsx or Dashboard.tsx).

TODO: Allow selection of doc_type_filter in the UI.

TODO: Display snippet_html (if provided) using dangerouslySetInnerHTML.

TODO: Make search results clickable, e.g., opening the file or a preview.

Settings View (SettingsView.tsx):

TODO: Add a button to trigger tauriApi.rebuildProjectSearchIndex().

TODO: Display index status (e.g., last indexed time, number of documents - requires new Tauri commands).

This integration of Tantivy significantly elevates the system's capability to leverage its local knowledge base effectively.
