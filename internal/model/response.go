package model

// ServiceStatus 服务运行状态
type ServiceStatus struct {
	Running        bool    `json:"running"`
	Pid            *uint32 `json:"pid,omitempty"`
	Port           uint16  `json:"port"`
	UptimeSeconds  *uint64 `json:"uptime_seconds,omitempty"`
	MemoryMb       *float64 `json:"memory_mb,omitempty"`
	CpuPercent     *float64 `json:"cpu_percent,omitempty"`
}

// SystemInfo 系统信息
type SystemInfo struct {
	OS               string  `json:"os"`
	OSVersion        string  `json:"os_version"`
	Arch             string  `json:"arch"`
	OpenClawInstalled bool   `json:"openclaw_installed"`
	OpenClawVersion  *string `json:"openclaw_version,omitempty"`
	NodeVersion      *string `json:"node_version,omitempty"`
	ConfigDir        string  `json:"config_dir"`
}

// DiagnosticResult 诊断结果
type DiagnosticResult struct {
	Name       string  `json:"name"`
	Passed     bool    `json:"passed"`
	Message    string  `json:"message"`
	Suggestion *string `json:"suggestion,omitempty"`
}

// AITestResult AI 连接测试结果
type AITestResult struct {
	Success    bool    `json:"success"`
	Provider   string  `json:"provider"`
	Model      string  `json:"model"`
	Response   *string `json:"response,omitempty"`
	Error      *string `json:"error,omitempty"`
	LatencyMs  *uint64 `json:"latency_ms,omitempty"`
}

// ChannelTestResult 渠道测试结果
type ChannelTestResult struct {
	Success bool    `json:"success"`
	Channel string  `json:"channel"`
	Message string  `json:"message"`
	Error   *string `json:"error,omitempty"`
}

// SecurityIssue 安全风险项
type SecurityIssue struct {
	ID          string  `json:"id"`
	Title       string  `json:"title"`
	Description string  `json:"description"`
	Severity    string  `json:"severity"`
	Fixable     bool    `json:"fixable"`
	Fixed       bool    `json:"fixed"`
	Category    string  `json:"category"`
	Detail      *string `json:"detail,omitempty"`
}

// SecurityFixResult 安全修复结果
type SecurityFixResult struct {
	Success            bool     `json:"success"`
	Message            string   `json:"message"`
	FixedIDs           []string `json:"fixed_ids"`
	FailedIDs          []string `json:"failed_ids"`
	ManualInstructions *string  `json:"manual_instructions,omitempty"`
}

// OfficialProvider 官方 Provider 预设
type OfficialProvider struct {
	ID               string           `json:"id"`
	Name             string           `json:"name"`
	Icon             string           `json:"icon"`
	DefaultBaseURL   *string          `json:"default_base_url,omitempty"`
	APIType          string           `json:"api_type"`
	SuggestedModels  []SuggestedModel `json:"suggested_models"`
	RequiresAPIKey   bool             `json:"requires_api_key"`
	DocsURL          *string          `json:"docs_url,omitempty"`
}

// SuggestedModel 推荐模型
type SuggestedModel struct {
	ID            string  `json:"id"`
	Name          string  `json:"name"`
	Description   *string `json:"description,omitempty"`
	ContextWindow *uint32 `json:"context_window,omitempty"`
	MaxTokens     *uint32 `json:"max_tokens,omitempty"`
	Recommended   bool    `json:"recommended"`
}

// ConfiguredProvider 已配置的 Provider
type ConfiguredProvider struct {
	Name         string             `json:"name"`
	BaseURL      string             `json:"base_url"`
	APIKeyMasked *string            `json:"api_key_masked,omitempty"`
	HasAPIKey    bool               `json:"has_api_key"`
	Models       []ConfiguredModel  `json:"models"`
}

// ConfiguredModel 已配置的模型
type ConfiguredModel struct {
	FullID        string  `json:"full_id"`
	ID            string  `json:"id"`
	Name          string  `json:"name"`
	APIType       *string `json:"api_type,omitempty"`
	ContextWindow *uint32 `json:"context_window,omitempty"`
	MaxTokens     *uint32 `json:"max_tokens,omitempty"`
	IsPrimary     bool    `json:"is_primary"`
}

// AIConfigOverview AI 配置概览
type AIConfigOverview struct {
	PrimaryModel       *string               `json:"primary_model,omitempty"`
	ConfiguredProviders []ConfiguredProvider  `json:"configured_providers"`
	AvailableModels    []string               `json:"available_models"`
}

// ChannelConfig 渠道配置
type ChannelConfig struct {
	ID           string                 `json:"id"`
	ChannelType  string                 `json:"channel_type"`
	Enabled      bool                   `json:"enabled"`
	Config       map[string]interface{} `json:"config"`
}

// SkillDefinition 技能定义
type SkillDefinition struct {
	ID            string                 `json:"id"`
	Name          string                 `json:"name"`
	Description   string                 `json:"description"`
	Icon          string                 `json:"icon"`
	Source        string                 `json:"source"`
	Version       *string                `json:"version,omitempty"`
	Author        *string                `json:"author,omitempty"`
	PackageName   *string                `json:"package_name,omitempty"`
	ClawhubSlug   *string                `json:"clawhub_slug,omitempty"`
	Installed     bool                   `json:"installed"`
	Enabled       bool                   `json:"enabled"`
	ConfigFields  []SkillConfigField     `json:"config_fields"`
	ConfigValues  map[string]interface{} `json:"config_values"`
	DocsURL       *string                `json:"docs_url,omitempty"`
	Category      *string                `json:"category,omitempty"`
}

// SkillConfigField 技能配置字段
type SkillConfigField struct {
	Key           string                  `json:"key"`
	Label         string                  `json:"label"`
	FieldType     string                  `json:"field_type"`
	Placeholder   *string                 `json:"placeholder,omitempty"`
	Options       *[]SkillSelectOption    `json:"options,omitempty"`
	Required      bool                    `json:"required"`
	DefaultValue  *string                 `json:"default_value,omitempty"`
	HelpText      *string                 `json:"help_text,omitempty"`
}

// SkillSelectOption 技能下拉选项
type SkillSelectOption struct {
	Value string `json:"value"`
	Label string `json:"label"`
}

// SkillSaveRequest 技能保存请求
type SkillSaveRequest struct {
	SkillID string                 `json:"skill_id"`
	Enabled bool                   `json:"enabled"`
	Config  map[string]interface{} `json:"config"`
}

// AgentConfig Agent 配置
type AgentConfig struct {
	ID              string          `json:"id"`
	Name            string          `json:"name"`
	Emoji           string          `json:"emoji"`
	Theme           *string         `json:"theme,omitempty"`
	Workspace       string          `json:"workspace"`
	AgentDir        *string         `json:"agentDir,omitempty"`
	Model           *string         `json:"model,omitempty"`
	IsDefault       bool            `json:"isDefault"`
	SandboxMode     string          `json:"sandboxMode"`
	ToolsProfile    *string         `json:"toolsProfile,omitempty"`
	ToolsAllow      []string        `json:"toolsAllow"`
	ToolsDeny       []string        `json:"toolsDeny"`
	Bindings        []AgentBinding  `json:"bindings"`
	MentionPatterns []string        `json:"mentionPatterns"`
	SubagentAllow   []string        `json:"subagentAllow"`
}

// AgentBinding Agent 渠道绑定
type AgentBinding struct {
	AgentID   *string `json:"agentId,omitempty"`
	Channel   string  `json:"channel"`
	AccountID *string `json:"accountId,omitempty"`
}

// EnvironmentStatus 环境状态
type EnvironmentStatus struct {
	NodeInstalled    bool    `json:"node_installed"`
	NodeVersion      *string `json:"node_version,omitempty"`
	OpenClawInstalled bool   `json:"openclaw_installed"`
	OpenClawVersion  *string `json:"openclaw_version,omitempty"`
	ConfigDirExists  bool    `json:"config_dir_exists"`
	ConfigDir        string  `json:"config_dir"`
}

// InstallResult 安装结果
type InstallResult struct {
	Success bool   `json:"success"`
	Message string `json:"message"`
}

// UpdateInfo 更新信息
type UpdateInfo struct {
	CurrentVersion *string `json:"current_version,omitempty"`
	LatestVersion  *string `json:"latest_version,omitempty"`
	UpdateAvailable bool   `json:"update_available"`
}
