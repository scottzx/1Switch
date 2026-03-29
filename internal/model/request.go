package model

// LoginRequest 登录请求
type LoginRequest struct {
	Pin string `json:"pin" binding:"required"`
}

// LoginResponse 登录响应
type LoginResponse struct {
	Token     string `json:"token"`
	ExpiresIn int    `json:"expiresIn"`
}

// WifiConnectRequest Wi-Fi 连接请求
type WifiConnectRequest struct {
	SSID     string `json:"ssid" binding:"required"`
	Password string `json:"password"`
}

// ApStartRequest AP 热点启动请求
type ApStartRequest struct {
	SSID     string `json:"ssid"`
	Password string `json:"password"`
}

// ConfigUpdateRequest 配置更新请求
type ConfigUpdateRequest struct {
	Config map[string]interface{} `json:"config" binding:"required"`
}

// ConfigValidateRequest 配置验证请求
type ConfigValidateRequest struct {
	Config map[string]interface{} `json:"config" binding:"required"`
}

// ConfigValidateResponse 配置验证响应
type ConfigValidateResponse struct {
	Valid  bool     `json:"valid"`
	Errors []string `json:"errors"`
}

// ProviderRequest Provider 保存请求
type ProviderRequest struct {
	Name    string `json:"name" binding:"required"`
	BaseURL string `json:"baseUrl" binding:"required"`
	APIKey  string `json:"apiKey"`
	APIType string `json:"apiType" binding:"required"`
	Models  []string `json:"models"`
}

// PrimaryModelRequest 主模型设置请求
type PrimaryModelRequest struct {
	ModelID string `json:"modelId" binding:"required"`
}

// ChannelSaveRequest 渠道保存请求
type ChannelSaveRequest struct {
	ChannelType string                 `json:"channelType" binding:"required"`
	Enabled     bool                   `json:"enabled"`
	Config      map[string]interface{} `json:"config"`
}

// AgentSaveRequest Agent 保存请求
type AgentSaveRequest struct {
	Agent AgentConfig `json:"agent" binding:"required"`
}

// SecurityFixRequest 安全修复请求
type SecurityFixRequest struct {
	IssueIDs []string `json:"issue_ids" binding:"required"`
}

// SendTestMessageRequest 发送测试消息请求
type SendTestMessageRequest struct {
	Target string `json:"target" binding:"required"`
}

// DeviceInfoRequest 设备信息更新请求
type DeviceInfoRequest struct {
	Hostname string `json:"hostname"`
	Serial   string `json:"serial"`
	IP       string `json:"ip"`
}
