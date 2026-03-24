import axios from 'axios';

// Use relative path so it works with any port when served by the same origin
const BASE_URL = '';

const apiClient = axios.create({
  baseURL: BASE_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Internal response types matching Go backend
interface MessageResponse {
  message: string;
}

interface ConfigResponse {
  config: Record<string, unknown>;
}

interface EnvValueResponse {
  value: string | null;
}

interface GatewayTokenResponse {
  token: string;
}

interface DashboardURLResponse {
  url: string;
}

// Types from Go backend models - use null to match frontend expectations
// (Go pointers become undefined, converting to null for compatibility)
export interface ServiceStatus {
  running: boolean;
  pid: number | null;
  port: number;
  uptime_seconds: number | null;
  memory_mb: number | null;
  cpu_percent: number | null;
}

// Helper to convert Go undefined/nil to null
function nilToNull<T>(val: T | undefined): T | null {
  return val === undefined ? null : val;
}

export interface SystemInfo {
  os: string;
  os_version: string;
  arch: string;
  openclaw_installed: boolean;
  openclaw_version?: string;
  node_version?: string;
  config_dir: string;
}

export interface DiagnosticResult {
  name: string;
  passed: boolean;
  message: string;
  suggestion?: string;
}

export interface AITestResult {
  success: boolean;
  provider: string;
  model: string;
  response?: string;
  error?: string;
  latency_ms?: number;
}

export interface ChannelTestResult {
  success: boolean;
  channel: string;
  message: string;
  error?: string;
}

export interface OfficialProvider {
  id: string;
  name: string;
  icon: string;
  default_base_url?: string;
  api_type: string;
  suggested_models: SuggestedModel[];
  requires_api_key: boolean;
  docs_url?: string;
}

export interface SuggestedModel {
  id: string;
  name: string;
  description?: string;
  context_window?: number;
  max_tokens?: number;
  recommended: boolean;
}

export interface ConfiguredProvider {
  name: string;
  base_url: string;
  api_key_masked?: string;
  has_api_key: boolean;
  models: ConfiguredModel[];
}

export interface ConfiguredModel {
  full_id: string;
  id: string;
  name: string;
  api_type?: string;
  context_window?: number;
  max_tokens?: number;
  is_primary: boolean;
}

export interface AIConfigOverview {
  primary_model?: string;
  configured_providers: ConfiguredProvider[];
  available_models: string[];
}

export interface ChannelConfig {
  id: string;
  channel_type: string;
  enabled: boolean;
  config: Record<string, unknown>;
}

export interface ModelConfig {
  id: string;
  name: string;
  api?: string;
  input: string[];
  context_window?: number;
  max_tokens?: number;
  reasoning?: boolean;
  cost?: {
    input: number;
    output: number;
    cache_read: number;
    cache_write: number;
  };
}

// System monitoring types (from admin-ui)
export interface SystemInfo {
  hostname: string;
  os: string;
  kernel: string;
  uptime: number;
  cpu_model: string;
  cpu_cores: number;
  memory_total: number;
  memory_used: number;
}

export interface ServiceStatusDetail {
  name: string;
  active: boolean;
  running: boolean;
  pid?: number;
}

export interface SystemStatus {
  services: ServiceStatusDetail[];
}

export interface SystemUsage {
  cpu_percent: number;
  memory_percent: number;
  memory_used: number;
  memory_total: number;
  disk_percent: number;
  disk_total: number;
  disk_used: number;
}

export interface NetworkInterface {
  name: string;
  ip: string;
  mac: string;
  type: string;
  state: string;
}

export interface WifiNetwork {
  ssid: string;
  bssid: string;
  signal: number;
  security: string;
  frequency: number;
}

export interface ApStatus {
  active: boolean;
  ssid?: string;
  ip?: string;
}

// System monitoring API (from admin-ui)
export const systemApi = {
  info: async (): Promise<SystemInfo> => {
    const response = await apiClient.get<SystemInfo>('/api/system/info');
    return response.data;
  },
  status: async (): Promise<SystemStatus> => {
    const response = await apiClient.get<SystemStatus>('/api/system/status');
    return response.data;
  },
  usage: async (): Promise<SystemUsage> => {
    const response = await apiClient.get<SystemUsage>('/api/system/usage');
    return response.data;
  },
  restartOpenclaw: async (): Promise<void> => {
    await apiClient.post('/api/system/openclaw/restart');
  },
};

// Network API (from admin-ui)
export const networkApi = {
  interfaces: async (): Promise<NetworkInterface[]> => {
    const response = await apiClient.get<NetworkInterface[]>('/api/network/interfaces');
    return response.data;
  },
  wifiScan: async (): Promise<WifiNetwork[]> => {
    const response = await apiClient.get<WifiNetwork[]>('/api/network/wifi/scan');
    return response.data;
  },
  wifiConnect: async (ssid: string, password?: string): Promise<void> => {
    await apiClient.post('/api/network/wifi/connect', { ssid, password });
  },
  apStatus: async (): Promise<ApStatus> => {
    const response = await apiClient.get<ApStatus>('/api/network/ap');
    return response.data;
  },
  apStart: async (): Promise<void> => {
    await apiClient.post('/api/network/ap/start');
  },
  apStop: async (): Promise<void> => {
    await apiClient.post('/api/network/ap/stop');
  },
};

// Legacy types for backward compatibility
export interface AIProviderOption {
  id: string;
  name: string;
  icon: string;
  default_base_url: string | null;
  models: AIModelOption[];
  requires_api_key: boolean;
}

export interface AIModelOption {
  id: string;
  name: string;
  description: string | null;
  recommended: boolean;
}

// API client
export const api = {
  // Service management
  getServiceStatus: async (): Promise<ServiceStatus> => {
    const response = await apiClient.get<ServiceStatus>('/api/service/status');
    const data = response.data;
    return {
      running: data.running,
      pid: nilToNull(data.pid),
      port: data.port,
      uptime_seconds: nilToNull(data.uptime_seconds),
      memory_mb: nilToNull(data.memory_mb),
      cpu_percent: nilToNull(data.cpu_percent),
    };
  },

  startService: async (): Promise<string> => {
    const response = await apiClient.post<MessageResponse>('/api/service/start');
    return response.data.message;
  },

  stopService: async (): Promise<string> => {
    const response = await apiClient.post<MessageResponse>('/api/service/stop');
    return response.data.message;
  },

  restartService: async (): Promise<string> => {
    const response = await apiClient.post<MessageResponse>('/api/service/restart');
    return response.data.message;
  },

  getLogs: async (lines?: number): Promise<string[]> => {
    const response = await apiClient.get<string[]>('/api/service/logs', {
      params: { lines },
    });
    return response.data;
  },

  // System info
  getSystemInfo: async (): Promise<SystemInfo> => {
    const response = await apiClient.get<SystemInfo>('/api/system/info');
    return response.data;
  },

  // Config management
  getConfig: async (): Promise<Record<string, unknown>> => {
    const response = await apiClient.get<ConfigResponse>('/api/config');
    return response.data.config;
  },

  saveConfig: async (config: Record<string, unknown>): Promise<string> => {
    const response = await apiClient.put<MessageResponse>('/api/config', { config });
    return response.data.message;
  },

  getEnvValue: async (key: string): Promise<string | null> => {
    const response = await apiClient.get<EnvValueResponse>(`/api/config/env/${key}`);
    return response.data.value;
  },

  saveEnvValue: async (key: string, value: string): Promise<string> => {
    const response = await apiClient.put<MessageResponse>(`/api/config/env/${key}`, { value });
    return response.data.message;
  },

  validateConfig: async (config: Record<string, unknown>): Promise<{ valid: boolean; errors: string[] }> => {
    const response = await apiClient.post<{ valid: boolean; errors: string[] }>('/api/config/validate', { config });
    return response.data;
  },

  // Gateway
  getGatewayToken: async (): Promise<string> => {
    const response = await apiClient.get<GatewayTokenResponse>('/api/gateway/token');
    return response.data.token;
  },

  getDashboardURL: async (): Promise<string> => {
    const response = await apiClient.get<DashboardURLResponse>('/api/gateway/dashboard-url');
    return response.data.url;
  },

  // AI providers (official)
  getOfficialProviders: async (): Promise<OfficialProvider[]> => {
    const response = await apiClient.get<OfficialProvider[]>('/api/ai/providers/official');
    return response.data;
  },

  getAIConfig: async (): Promise<AIConfigOverview> => {
    const response = await apiClient.get<AIConfigOverview>('/api/ai/config');
    return response.data;
  },

  saveProvider: async (
    providerName: string,
    baseUrl: string,
    apiKey: string | null,
    apiType: string,
    models: ModelConfig[]
  ): Promise<string> => {
    const response = await apiClient.post<MessageResponse>('/api/ai/provider', {
      name: providerName,
      baseUrl,
      apiKey,
      apiType,
      models,
    });
    return response.data.message;
  },

  deleteProvider: async (providerName: string): Promise<string> => {
    const response = await apiClient.delete<MessageResponse>(`/api/ai/provider/${providerName}`);
    return response.data.message;
  },

  setPrimaryModel: async (modelId: string): Promise<string> => {
    const response = await apiClient.post<MessageResponse>('/api/ai/primary-model', { modelId });
    return response.data.message;
  },

  addAvailableModel: async (modelId: string): Promise<string> => {
    const response = await apiClient.post<MessageResponse>('/api/ai/model', { modelId });
    return response.data.message;
  },

  removeAvailableModel: async (modelId: string): Promise<string> => {
    const response = await apiClient.delete<MessageResponse>(`/api/ai/model/${modelId}`);
    return response.data.message;
  },

  // Channels
  getChannelsConfig: async (): Promise<ChannelConfig[]> => {
    const response = await apiClient.get<ChannelConfig[]>('/api/channels');
    return response.data;
  },

  saveChannelConfig: async (channel: ChannelConfig): Promise<string> => {
    const response = await apiClient.put<MessageResponse>('/api/channels', channel);
    return response.data.message;
  },

  clearChannelConfig: async (channelType: string): Promise<string> => {
    const response = await apiClient.delete<MessageResponse>(`/api/channels/${channelType}`);
    return response.data.message;
  },

  // Diagnostics
  runDoctor: async (): Promise<DiagnosticResult[]> => {
    const response = await apiClient.get<DiagnosticResult[]>('/api/diagnostics/doctor');
    return response.data;
  },

  testAIConnection: async (): Promise<AITestResult> => {
    const response = await apiClient.get<AITestResult>('/api/diagnostics/ai-test');
    return response.data;
  },

  testChannel: async (channelType: string): Promise<ChannelTestResult> => {
    const response = await apiClient.get<ChannelTestResult>(`/api/diagnostics/channel/${channelType}`);
    return response.data;
  },

  sendTestMessage: async (channelType: string, target: string): Promise<ChannelTestResult> => {
    const response = await apiClient.post<ChannelTestResult>(`/api/diagnostics/channel/${channelType}/send`, { target });
    return response.data;
  },

  startChannelLogin: async (channelType: string): Promise<string> => {
    const response = await apiClient.post<MessageResponse>(`/api/diagnostics/channel/${channelType}/login`);
    return response.data.message;
  },

  // Agents
  getAgents: async (): Promise<unknown[]> => {
    const response = await apiClient.get<unknown[]>('/api/agents');
    return response.data;
  },

  saveAgent: async (agent: unknown): Promise<string> => {
    const response = await apiClient.post<MessageResponse>('/api/agents', { agent });
    return response.data.message;
  },

  deleteAgent: async (agentId: string): Promise<string> => {
    const response = await apiClient.delete<MessageResponse>(`/api/agents/${agentId}`);
    return response.data.message;
  },

  setDefaultAgent: async (agentId: string): Promise<string> => {
    const response = await apiClient.post<MessageResponse>(`/api/agents/default/${agentId}`);
    return response.data.message;
  },

  // Skills
  getSkills: async (): Promise<unknown[]> => {
    const response = await apiClient.get<unknown[]>('/api/skills');
    return response.data;
  },

  installSkill: async (skillId: string): Promise<string> => {
    const response = await apiClient.post<MessageResponse>(`/api/skills/install/${skillId}`);
    return response.data.message;
  },

  uninstallSkill: async (skillId: string): Promise<string> => {
    const response = await apiClient.post<MessageResponse>(`/api/skills/uninstall/${skillId}`);
    return response.data.message;
  },

  saveSkillConfig: async (skillId: string, enabled: boolean, config: Record<string, unknown>): Promise<string> => {
    const response = await apiClient.put<MessageResponse>('/api/skills/config', {
      skill_id: skillId,
      enabled,
      config,
    });
    return response.data.message;
  },

  installCustomSkill: async (): Promise<string> => {
    const response = await apiClient.post<MessageResponse>('/api/skills/install-custom');
    return response.data.message;
  },

  // Security
  runSecurityScan: async (): Promise<unknown[]> => {
    const response = await apiClient.get<unknown[]>('/api/security/scan');
    return response.data;
  },

  fixSecurityIssues: async (issueIds: string[]): Promise<unknown> => {
    const response = await apiClient.post<unknown>('/api/security/fix', { issue_ids: issueIds });
    return response.data;
  },

  // Install
  checkEnvironment: async (): Promise<unknown> => {
    const response = await apiClient.get<unknown>('/api/install/environment');
    return response.data;
  },

  installNodeJS: async (): Promise<string> => {
    const response = await apiClient.post<MessageResponse>('/api/install/nodejs');
    return response.data.message;
  },

  installOpenClaw: async (): Promise<string> => {
    const response = await apiClient.post<MessageResponse>('/api/install/openclaw');
    return response.data.message;
  },

  initConfig: async (): Promise<string> => {
    const response = await apiClient.post<MessageResponse>('/api/install/init-config');
    return response.data.message;
  },

  openInstallTerminal: async (terminalType: string): Promise<string> => {
    const response = await apiClient.post<MessageResponse>(`/api/install/terminal/${terminalType}`);
    return response.data.message;
  },

  uninstallOpenClaw: async (): Promise<string> => {
    const response = await apiClient.delete<MessageResponse>('/api/install/openclaw');
    return response.data.message;
  },

  checkUpdate: async (): Promise<unknown> => {
    const response = await apiClient.get<unknown>('/api/install/update-check');
    return response.data;
  },

  updateOpenClaw: async (): Promise<string> => {
    const response = await apiClient.post<MessageResponse>('/api/install/update');
    return response.data.message;
  },

  // Legacy AI providers (for backward compatibility)
  getAIProviders: async (): Promise<AIProviderOption[]> => {
    const providers = await api.getOfficialProviders();
    return providers.map((p) => ({
      id: p.id,
      name: p.name,
      icon: p.icon,
      default_base_url: p.default_base_url ?? null,
      models: p.suggested_models.map((m) => ({
        id: m.id,
        name: m.name,
        description: m.description ?? null,
        recommended: m.recommended,
      })),
      requires_api_key: p.requires_api_key,
    }));
  },
};

export default api;
