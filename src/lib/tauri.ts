// Re-export all types from the new API service
export type {
  ServiceStatus,
  SystemInfo,
  AIProviderOption,
  AIModelOption,
  OfficialProvider,
  SuggestedModel,
  ConfiguredProvider,
  ConfiguredModel,
  AIConfigOverview,
  ModelConfig,
  ChannelConfig,
  DiagnosticResult,
  AITestResult,
} from '../services/api';

import { api as apiClient, systemApi, networkApi } from '../services/api';
import { apiLogger } from './logger';

// Wrappers to maintain backward compatibility with existing Tauri API interface
// The actual implementation now calls the Go backend via REST API

async function apiCallWithLog<T>(apiCall: () => Promise<T>): Promise<T> {
  try {
    const result = await apiCall();
    return result;
  } catch (error) {
    apiLogger.apiError('api', error);
    throw error;
  }
}

// Re-export the api client with backward-compatible interface
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const api: Record<string, (...args: any[]) => Promise<any>> = {
  // Service management
  getServiceStatus: () => apiCallWithLog(() => apiClient.getServiceStatus()),
  startService: () => apiCallWithLog(() => apiClient.startService()),
  stopService: () => apiCallWithLog(() => apiClient.stopService()),
  restartService: () => apiCallWithLog(() => apiClient.restartService()),
  getLogs: (lines?: number) => apiCallWithLog(() => apiClient.getLogs(lines)),

  // System information
  getSystemInfo: () => apiCallWithLog(() => apiClient.getSystemInfo()),
  checkOpenclawInstalled: () => apiCallWithLog(async () => {
    const info = await apiClient.getSystemInfo();
    return info.openclaw_installed;
  }),
  getOpenclawVersion: () => apiCallWithLog(async () => {
    const info = await apiClient.getSystemInfo();
    return info.openclaw_version ?? null;
  }),

  // Configuration management
  getConfig: () => apiCallWithLog(() => apiClient.getConfig()),
  saveConfig: (config: unknown) => apiCallWithLog(() => apiClient.saveConfig(config as Record<string, unknown>)),
  getEnvValue: (key: string) => apiCallWithLog(() => apiClient.getEnvValue(key)),
  saveEnvValue: (key: string, value: string) => apiCallWithLog(() => apiClient.saveEnvValue(key, value)),
  validateConfig: (config: unknown) => apiCallWithLog(() => apiClient.validateConfig?.(config as Record<string, unknown>)),

  // Gateway
  getGatewayToken: () => apiCallWithLog(() => apiClient.getGatewayToken()),
  getDashboardURL: () => apiCallWithLog(() => apiClient.getDashboardURL()),

  // AI Provider (legacy compatibility)
  getAIProviders: () => apiCallWithLog(() => apiClient.getAIProviders()),
  getOfficialProviders: () => apiCallWithLog(() => apiClient.getOfficialProviders()),
  getAIConfig: () => apiCallWithLog(() => apiClient.getAIConfig()),
  saveProvider: (providerName: string, baseUrl: string, apiKey: string | null, apiType: string, models: unknown[]) =>
    apiCallWithLog(() => apiClient.saveProvider(providerName, baseUrl, apiKey, apiType, models as Parameters<typeof apiClient.saveProvider>[4])),
  deleteProvider: (providerName: string) => apiCallWithLog(() => apiClient.deleteProvider(providerName)),
  setPrimaryModel: (modelId: string) => apiCallWithLog(() => apiClient.setPrimaryModel(modelId)),
  addAvailableModel: (modelId: string) => apiCallWithLog(() => apiClient.addAvailableModel(modelId)),
  removeAvailableModel: (modelId: string) => apiCallWithLog(() => apiClient.removeAvailableModel(modelId)),

  // Channels
  getChannelsConfig: () => apiCallWithLog(() => apiClient.getChannelsConfig()),
  saveChannelConfig: (channel: unknown) => apiCallWithLog(() => apiClient.saveChannelConfig(channel as Parameters<typeof apiClient.saveChannelConfig>[0])),
  clearChannelConfig: (channelType: string) => apiCallWithLog(() => apiClient.clearChannelConfig(channelType)),

  // Diagnostics
  runDoctor: () => apiCallWithLog(() => apiClient.runDoctor()),
  testAIConnection: () => apiCallWithLog(() => apiClient.testAIConnection()),
  testChannel: (channelType: string) => apiCallWithLog(() => apiClient.testChannel(channelType)),
  sendTestMessage: (channelType: string, target: string) => apiCallWithLog(() => apiClient.sendTestMessage(channelType, target)),
  startChannelLogin: (channelType: string) => apiCallWithLog(() => apiClient.startChannelLogin(channelType)),

  // Agents
  getAgents: () => apiCallWithLog(() => apiClient.getAgents()),
  saveAgent: (agent: unknown) => apiCallWithLog(() => apiClient.saveAgent(agent)),
  deleteAgent: (agentId: string) => apiCallWithLog(() => apiClient.deleteAgent(agentId)),
  setDefaultAgent: (agentId: string) => apiCallWithLog(() => apiClient.setDefaultAgent(agentId)),

  // Skills
  getSkills: () => apiCallWithLog(() => apiClient.getSkills()),
  installSkill: (skillId: string) => apiCallWithLog(() => apiClient.installSkill(skillId)),
  uninstallSkill: (skillId: string) => apiCallWithLog(() => apiClient.uninstallSkill(skillId)),
  saveSkillConfig: (skillId: string, enabled: boolean, config: Record<string, unknown>) =>
    apiCallWithLog(() => apiClient.saveSkillConfig(skillId, enabled, config)),
  installCustomSkill: () => apiCallWithLog(() => apiClient.installCustomSkill()),

  // Security
  runSecurityScan: () => apiCallWithLog(() => apiClient.runSecurityScan()),
  fixSecurityIssues: (issueIds: string[]) => apiCallWithLog(() => apiClient.fixSecurityIssues(issueIds)),

  // Install
  checkEnvironment: () => apiCallWithLog(() => apiClient.checkEnvironment()),
  installNodeJS: () => apiCallWithLog(() => apiClient.installNodeJS()),
  installOpenClaw: () => apiCallWithLog(() => apiClient.installOpenClaw()),
  initConfig: () => apiCallWithLog(() => apiClient.initConfig()),
  openInstallTerminal: (terminalType: string) => apiCallWithLog(() => apiClient.openInstallTerminal(terminalType)),
  uninstallOpenClaw: () => apiCallWithLog(() => apiClient.uninstallOpenClaw()),
  checkUpdate: () => apiCallWithLog(() => apiClient.checkUpdate()),
  updateOpenClaw: () => apiCallWithLog(() => apiClient.updateOpenClaw()),

  // System monitoring (from admin-ui)
  getDeviceSystemInfo: () => apiCallWithLog(() => systemApi.info()),
  getSystemStatus: () => apiCallWithLog(() => systemApi.status()),
  getSystemUsage: () => apiCallWithLog(() => systemApi.usage()),
  restartOpenClaw: () => apiCallWithLog(() => systemApi.restartOpenclaw()),

  // Network / WiFi (from admin-ui)
  getNetworkInterfaces: () => apiCallWithLog(() => networkApi.interfaces()),
  wifiScan: () => apiCallWithLog(() => networkApi.wifiScan()),
  wifiConnect: (ssid: string, password?: string) =>
    apiCallWithLog(() => networkApi.wifiConnect(ssid, password)),
  getApStatus: () => apiCallWithLog(() => networkApi.apStatus()),
  startAp: () => apiCallWithLog(() => networkApi.apStart()),
  stopAp: () => apiCallWithLog(() => networkApi.apStop()),
};

// isTauri is no longer relevant - we're using REST API
export function isTauri(): boolean {
  return false;
}
