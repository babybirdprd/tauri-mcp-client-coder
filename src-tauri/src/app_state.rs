use crate::agents::coder::CoderAgent;
use crate::agents::planner::PlannerAgent;
use crate::models::{CrateInfo, GlobalLogEntry, ProjectSettings, ProjectStatus, Task};
use crate::services::knowledge_manager::KnowledgeManagerService;
use crate::services::workspace::WorkspaceService;
use parking_lot::Mutex;
use std::sync::Arc;
// HumanInterfaceService is more about how commands interact with AppHandle, not stored directly here.
use crate::baml_client::BamlClient;
use crate::error::Result as AppResult; // For consistency

#[derive(Clone, Debug, Default)]
pub struct CurrentProjectSession {
    pub project_path: Option<String>,
    pub status: ProjectStatus,
    pub active_spec_file: Option<String>,
    pub tasks: Vec<Task>,
    pub current_task_id_executing: Option<String>, // Task currently in ExecutingTask state
    pub logs: Vec<GlobalLogEntry>,                 // Limited size buffer for recent logs
    pub known_crates: Vec<CrateInfo>,
}

pub struct AppServices {
    pub workspace_service: Arc<Mutex<WorkspaceService>>,
    pub knowledge_manager_service: Arc<Mutex<KnowledgeManagerService>>,
}

pub struct AppAgents {
    pub planner_agent: Arc<Mutex<PlannerAgent>>,
    pub coder_agent: Arc<Mutex<CoderAgent>>,
}

pub struct AppState {
    pub settings: Arc<Mutex<ProjectSettings>>,
    pub current_project_session: Arc<Mutex<CurrentProjectSession>>,
    pub services: Arc<AppServices>,
    pub agents: Arc<AppAgents>,
    pub baml_client: Arc<BamlClient>,
}

impl AppState {
    pub fn new() -> Self {
        let settings = Arc::new(Mutex::new(ProjectSettings::default())); // TODO: Load settings from disk

        let baml_client = Arc::new(BamlClient::new(
            settings.lock().llm_api_key.clone(),
            settings.lock().tier1_llm_model_alias.clone(),
            settings.lock().tier2_llm_model_alias.clone(),
        ));

        let workspace_service = Arc::new(Mutex::new(WorkspaceService::new()));
        let knowledge_manager_service = Arc::new(Mutex::new(KnowledgeManagerService::new(
            workspace_service.clone(),
            baml_client.clone(),
        )));

        let services = Arc::new(AppServices {
            workspace_service: workspace_service.clone(),
            knowledge_manager_service,
        });

        let agents = Arc::new(AppAgents {
            planner_agent: Arc::new(Mutex::new(PlannerAgent::new(
                services.clone(),
                baml_client.clone(),
            ))),
            coder_agent: Arc::new(Mutex::new(CoderAgent::new(
                services.clone(),
                baml_client.clone(),
            ))),
        });

        Self {
            settings,
            current_project_session: Arc::new(Mutex::new(CurrentProjectSession::default())),
            services,
            agents,
            baml_client,
        }
    }

    // Log adding will be handled by a utility function in main.rs using AppHandle
}
