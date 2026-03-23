// Compatibility shim for Tauri invoke
// Maps legacy Tauri command names to the new REST API

import { api } from './tauri';

// Map of Tauri command names to API calls
const commandMap: Record<string, (args?: Record<string, unknown>) => Promise<unknown>> = {
  // Service
  get_service_status: () => api.getServiceStatus(),
  start_service: () => api.startService(),
  stop_service: () => api.stopService(),
  restart_service: () => api.restartService(),
  get_logs: (args) => api.getLogs(args?.lines as number | undefined),

  // System
  get_system_info: () => api.getSystemInfo(),
  check_openclaw_installed: () => api.checkOpenclawInstalled(),
  get_openclaw_version: () => api.getOpenclawVersion(),

  // Config
  get_config: () => api.getConfig(),
  save_config: (args) => api.saveConfig(args?.config),
  get_env_value: (args) => api.getEnvValue(args?.key as string),
  save_env_value: (args) => api.saveEnvValue(args?.key as string, args?.value as string),
  validate_config: (args) => api.validateConfig?.(args?.config),

  // Gateway
  get_gateway_token: () => api.getGatewayToken(),
  get_dashboard_url: () => api.getDashboardURL(),

  // AI
  get_ai_providers: () => api.getAIProviders(),
  get_official_providers: () => api.getOfficialProviders(),
  get_ai_config: () => api.getAIConfig(),
  save_provider: (args) => api.saveProvider(
    args?.providerName as string,
    args?.baseUrl as string,
    args?.apiKey as string | null,
    args?.apiType as string,
    args?.models as unknown[]
  ),
  delete_provider: (args) => api.deleteProvider(args?.providerName as string),
  set_primary_model: (args) => api.setPrimaryModel(args?.modelId as string),
  add_available_model: (args) => api.addAvailableModel(args?.modelId as string),
  remove_available_model: (args) => api.removeAvailableModel(args?.modelId as string),

  // Channels
  get_channels_config: () => api.getChannelsConfig(),
  save_channel_config: (args) => api.saveChannelConfig(args?.channel),
  clear_channel_config: (args) => api.clearChannelConfig(args?.channelId as string),
  test_channel: (args) => api.testChannel(args?.channelType as string),
  send_test_message: (args) => api.sendTestMessage(args?.channelType as string, args?.target as string),
  start_channel_login: (args) => api.startChannelLogin(args?.channelType as string),
  check_feishu_plugin: () => Promise.resolve({ installed: false, version: null, plugin_name: null }),
  install_feishu_plugin: () => Promise.resolve('Feishu plugin installation not implemented'),
  check_qqbot_plugin: () => Promise.resolve({ installed: false, version: null, plugin_name: null }),
  install_qqbot_plugin: () => Promise.resolve('QQBot plugin installation not implemented'),

  // Agents
  get_agents_list: () => api.getAgents(),
  save_agent: (args) => api.saveAgent(args?.agent),
  delete_agent: (args) => api.deleteAgent(args?.agentId as string),
  set_default_agent: (args) => api.setDefaultAgent(args?.agentId as string),

  // Skills
  get_skills_list: () => api.getSkills(),
  get_skills: () => api.getSkills(),
  install_skill: (args) => api.installSkill(args?.skillId as string),
  uninstall_skill: (args) => api.uninstallSkill(args?.skillId as string),
  save_skill_config: (args) => api.saveSkillConfig(
    args?.skillId as string,
    args?.enabled as boolean,
    args?.config as Record<string, unknown>
  ),
  install_custom_skill: () => api.installCustomSkill(),

  // Security
  run_security_scan: () => api.runSecurityScan(),
  fix_security_issues: (args) => api.fixSecurityIssues(args?.issue_ids as string[]),

  // Diagnostics
  run_doctor: () => api.runDoctor(),
  test_ai_connection: () => api.testAIConnection(),

  // Install
  check_environment: () => api.checkEnvironment(),
  install_nodejs: () => api.installNodeJS(),
  install_openclaw: () => api.installOpenClaw(),
  init_openclaw_config: () => api.initConfig(),
  init_config: () => api.initConfig(),
  open_install_terminal: (args) => api.openInstallTerminal(args?.installType as string || args?.type as string),
  uninstall_openclaw: () => api.uninstallOpenClaw(),
  check_openclaw_update: () => api.checkUpdate(),
  update_openclaw: () => api.updateOpenClaw(),
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function invoke<T = any>(cmd: string, args?: Record<string, any>): Promise<T> {
  const handler = commandMap[cmd];
  if (!handler) {
    throw new Error(`Unknown Tauri command: ${cmd}`);
  }
  return handler(args) as Promise<T>;
}
