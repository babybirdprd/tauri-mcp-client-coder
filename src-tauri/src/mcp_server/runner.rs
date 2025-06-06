// Using the full version from our discussion
use crate::app_state::AppServices;
use crate::error::Result as AppResult;
use crate::mcp_server::handler::InternalMcpHandler;
use rust_mcp_sdk::mcp_server::{hyper_server, HyperServerOptions};
use rust_mcp_sdk::schema::{
    Implementation, InitializeResult, ServerCapabilities, ServerCapabilitiesTools,
    LATEST_PROTOCOL_VERSION,
};
use std::sync::Arc;

pub async fn start_internal_mcp_server(
    services: Arc<AppServices>,
    project_root: String,
    port: u16,
) -> AppResult<()> {
    let server_details = InitializeResult {
        /* ... */ server_info: Implementation::default(),
        capabilities: ServerCapabilities::default(),
        instructions: None,
        protocol_version: LATEST_PROTOCOL_VERSION.to_string(),
        ..Default::default()
    };
    let handler = InternalMcpHandler {
        services,
        project_root,
    };
    let server_options = HyperServerOptions {
        host: "127.0.0.1".to_string(),
        port,
        ..Default::default()
    };
    let server = hyper_server::create_server(server_details, handler, server_options);
    tracing::info!("Starting Internal MCP Tool Server on port {}...", port);
    server.start().await.map_err(|e| e.into())
}
