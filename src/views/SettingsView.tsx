import React, { useState, useEffect } from 'react';
import { tauriApi } from '../utils/tauriApi';
import type { ProjectSettings } from '../types';
import { Save, Bot, GitCommit, Server, SearchCode } from 'lucide-react';

const SettingCard: React.FC<{ title: string; icon: React.ElementType; children: React.ReactNode }> = ({ title, icon: Icon, children }) => (
    <div className="bg-surface p-6 rounded-lg shadow-lg">
        <h3 className="text-xl font-semibold text-text-main mb-4 flex items-center"><Icon className="h-5 w-5 mr-3 text-primary"/>{title}</h3>
        <div className="space-y-4">{children}</div>
    </div>
);

const SettingRow: React.FC<{ label: string; description: string; children: React.ReactNode }> = ({ label, description, children }) => (
    <div>
        <label className="block text-sm font-medium text-text-main">{label}</label>
        <div className="flex items-center justify-between gap-4">
            <p className="text-xs text-text-secondary flex-grow">{description}</p>
            {children}
        </div>
    </div>
);

const SettingsView: React.FC = () => {
  const [settings, setSettings] = useState<ProjectSettings | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    tauriApi.loadSettings().then(setSettings);
  }, []);

  const handleSave = async () => {
    if (!settings) return;
    setIsSaving(true);
    try {
      await tauriApi.saveSettings(settings);
      // TODO: Show a success toast/notification
    } catch (error) {
      console.error("Failed to save settings:", error);
      // TODO: Show an error toast/notification
    } finally {
      setIsSaving(false);
    }
  };

  const handleRebuildIndex = async () => {
    try {
        await tauriApi.rebuildProjectSearchIndex();
        alert("Search index rebuild initiated. Check the logs for progress.");
    } catch (error) {
        console.error("Failed to start index rebuild:", error);
    }
  };

  if (!settings) {
    return <div>Loading settings...</div>;
  }

  const handleSettingChange = (key: keyof ProjectSettings, value: any) => {
    setSettings(prev => prev ? { ...prev, [key]: value } : null);
  };

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <div>
            <h1 className="text-3xl font-bold text-text-main">System Settings</h1>
            <p className="text-text-secondary mt-1">Configure the behavior of the AI agents and system services.</p>
        </div>
        <button onClick={handleSave} disabled={isSaving} className="bg-primary hover:bg-primary-hover text-white font-bold py-2 px-4 rounded flex items-center gap-2 disabled:opacity-50">
            <Save className="h-4 w-4"/>{isSaving ? 'Saving...' : 'Save Settings'}
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="space-y-8">
            <SettingCard title="AI Model Configuration" icon={Bot}>
                <SettingRow label="Tier 1 Model Alias" description="High-capability model for planning and complex coding.">
                    <input type="text" value={settings.tier1_llm_model_alias} onChange={e => handleSettingChange('tier1_llm_model_alias', e.target.value)} className="p-2 rounded bg-background text-text-main border border-border w-48"/>
                </SettingRow>
                <SettingRow label="Tier 2 Model Alias" description="Faster, cost-effective model for summarization and simple tasks.">
                    <input type="text" value={settings.tier2_llm_model_alias} onChange={e => handleSettingChange('tier2_llm_model_alias', e.target.value)} className="p-2 rounded bg-background text-text-main border border-border w-48"/>
                </SettingRow>
                <SettingRow label="LLM API Key" description="Your API key. Stored securely.">
                    <input type="password" value={settings.llm_api_key || ''} onChange={e => handleSettingChange('llm_api_key', e.target.value)} className="p-2 rounded bg-background text-text-main border border-border w-48"/>
                </SettingRow>
            </SettingCard>

            <SettingCard title="Autonomy & Git" icon={GitCommit}>
                <SettingRow label="Autonomy Level" description="Control how much the AI can do without your approval.">
                    <select value={settings.autonomy_level} onChange={e => handleSettingChange('autonomy_level', e.target.value)} className="p-2 rounded bg-background text-text-main border border-border w-48">
                        <option value="FullAutopilot">Full Autopilot</option>
                        <option value="ApprovalCheckpoints">Approval Checkpoints</option>
                        <option value="ManualStepThrough">Manual Step-Through</option>
                    </select>
                </SettingRow>
                <SettingRow label="Git Commit Strategy" description="How changes are committed to version control.">
                    <select value={settings.git_commit_strategy} onChange={e => handleSettingChange('git_commit_strategy', e.target.value)} className="p-2 rounded bg-background text-text-main border border-border w-48">
                        <option value="PerTask">Per Task</option>
                        <option value="PerFeature">Per Feature</option>
                        <option value="Manual">Manual</option>
                    </select>
                </SettingRow>
                <SettingRow label="Max Self-Correction Attempts" description="How many times the AI will try to fix its own errors before asking for help.">
                    <input type="number" min="0" max="10" value={settings.max_self_correction_attempts} onChange={e => handleSettingChange('max_self_correction_attempts', parseInt(e.target.value))} className="p-2 rounded bg-background text-text-main border border-border w-24"/>
                </SettingRow>
            </SettingCard>
        </div>

        <div className="space-y-8">
            <SettingCard title="External MCP Servers" icon={Server}>
                <p className="text-sm text-text-secondary">Manage connections to external tool servers (e.g., GitHub, Jira) to extend the AI's capabilities.</p>
                {/* TODO: Implement UI for listing, adding, and removing external servers */}
                <div className="text-center p-4 border-2 border-dashed border-border rounded-lg">
                    <p className="text-text-secondary">External server management coming soon.</p>
                </div>
            </SettingCard>

            <SettingCard title="Search Index" icon={SearchCode}>
                <p className="text-sm text-text-secondary">The local Tantivy search index provides fast, relevant context to the AI. Rebuild it if you make significant changes outside this application.</p>
                <button onClick={handleRebuildIndex} className="bg-purple-600 hover:bg-purple-700 text-white font-bold py-2 px-4 rounded w-full">
                    Rebuild Project Search Index
                </button>
            </SettingCard>
        </div>
      </div>
    </div>
  );
};

export default SettingsView;