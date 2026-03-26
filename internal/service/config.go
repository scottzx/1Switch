package service

import (
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"
	"strings"

	"iclaw-admin-api/internal/model"
)

// ConfigPaths 配置路径
var ConfigPaths = struct {
	OpenClawJSON string
	EnvFile     string
}{
	OpenClawJSON: GetConfigDir() + "/openclaw.json",
	EnvFile:     GetConfigDir() + "/env",
}

// GetConfig 获取完整配置
func GetConfig() (map[string]interface{}, error) {
	data, err := os.ReadFile(ConfigPaths.OpenClawJSON)
	if err != nil {
		if os.IsNotExist(err) {
			return make(map[string]interface{}), nil
		}
		return nil, err
	}

	var result map[string]interface{}
	if err := json.Unmarshal(data, &result); err != nil {
		return nil, err
	}

	return result, nil
}

// SaveConfig 保存配置
func SaveConfig(config map[string]interface{}) error {
	data, err := json.MarshalIndent(config, "", "  ")
	if err != nil {
		return err
	}

	// 确保目录存在
	dir := filepath.Dir(ConfigPaths.OpenClawJSON)
	if err := os.MkdirAll(dir, 0700); err != nil {
		return err
	}

	return os.WriteFile(ConfigPaths.OpenClawJSON, data, 0600)
}

// GetEnvValue 获取环境变量
func GetEnvValue(key string) (string, error) {
	data, err := os.ReadFile(ConfigPaths.EnvFile)
	if err != nil {
		if os.IsNotExist(err) {
			return "", nil
		}
		return "", err
	}

	lines := strings.Split(string(data), "\n")
	for _, line := range lines {
		line = strings.TrimSpace(line)
		if strings.HasPrefix(line, "export ") {
			line = line[7:]
		}
		if strings.HasPrefix(line, key+"=") {
			value := strings.TrimPrefix(line, key+"=")
			value = strings.Trim(strings.Trim(value, "\"'"), "\"")
			return value, nil
		}
	}

	return "", nil
}

// SaveEnvValue 保存环境变量
func SaveEnvValue(key, value string) error {
	data, err := os.ReadFile(ConfigPaths.EnvFile)
	if err != nil && !os.IsNotExist(err) {
		return err
	}

	lines := []string{}
	if len(data) > 0 {
		lines = strings.Split(string(data), "\n")
	}

	// 更新或添加
	found := false
	for i, line := range lines {
		trimmed := strings.TrimSpace(line)
		if strings.HasPrefix(trimmed, "export ") {
			trimmed = trimmed[7:]
		}
		if strings.HasPrefix(trimmed, key+"=") {
			lines[i] = fmt.Sprintf("export %s=\"%s\"", key, value)
			found = true
			break
		}
	}

	if !found {
		lines = append(lines, fmt.Sprintf("export %s=\"%s\"", key, value))
	}

	// 确保目录存在
	dir := filepath.Dir(ConfigPaths.EnvFile)
	if err := os.MkdirAll(dir, 0700); err != nil {
		return err
	}

	return os.WriteFile(ConfigPaths.EnvFile, []byte(strings.Join(lines, "\n")+"\n"), 0600)
}

// GetAIConfig 获取 AI 配置概览
func GetAIConfig() (*model.AIConfigOverview, error) {
	config, err := GetConfig()
	if err != nil {
		return nil, err
	}

	overview := &model.AIConfigOverview{
		ConfiguredProviders: []model.ConfiguredProvider{},
		AvailableModels:    []string{},
	}

	// 获取主模型
	if agents, ok := config["agents"].(map[string]interface{}); ok {
		if defaults, ok := agents["defaults"].(map[string]interface{}); ok {
			if model, ok := defaults["model"].(map[string]interface{}); ok {
				if primary, ok := model["primary"].(string); ok {
					overview.PrimaryModel = &primary
				}
			}
		}
	}

	// 获取配置的 providers
	if models, ok := config["models"].(map[string]interface{}); ok {
		if providers, ok := models["providers"].(map[string]interface{}); ok {
			for name, pData := range providers {
				pMap, ok := pData.(map[string]interface{})
				if !ok {
					continue
				}

				cp := model.ConfiguredProvider{
					Name:   name,
					Models: []model.ConfiguredModel{},
				}

				if baseURL, ok := pMap["baseUrl"].(string); ok {
					cp.BaseURL = baseURL
				}

				if apiKey, ok := pMap["apiKey"].(string); ok && apiKey != "" {
					cp.HasAPIKey = true
					masked := apiKey[:4] + "..." + apiKey[len(apiKey)-4:]
					cp.APIKeyMasked = &masked
				}

				if modelsList, ok := pMap["models"].([]interface{}); ok {
					for _, mData := range modelsList {
						if mMap, ok := mData.(map[string]interface{}); ok {
							cm := model.ConfiguredModel{}
							if id, ok := mMap["id"].(string); ok {
								cm.ID = id
								cm.FullID = name + "/" + id
							}
							if name, ok := mMap["name"].(string); ok {
								cm.Name = name
							}
							if api, ok := mMap["api"].(string); ok {
								cm.APIType = &api
							}
							if cw, ok := mMap["contextWindow"].(float64); ok {
								cwUint := uint32(cw)
								cm.ContextWindow = &cwUint
							}
							if mt, ok := mMap["maxTokens"].(float64); ok {
								mtUint := uint32(mt)
								cm.MaxTokens = &mtUint
							}
							if overview.PrimaryModel != nil && cm.FullID == *overview.PrimaryModel {
								cm.IsPrimary = true
							}
							cp.Models = append(cp.Models, cm)
						}
					}
				}

				overview.ConfiguredProviders = append(overview.ConfiguredProviders, cp)
			}
		}
	}

	// 获取可用模型列表
	if agents, ok := config["agents"].(map[string]interface{}); ok {
		if defaults, ok := agents["defaults"].(map[string]interface{}); ok {
			if modelsMap, ok := defaults["models"].(map[string]interface{}); ok {
				for fullID := range modelsMap {
					overview.AvailableModels = append(overview.AvailableModels, fullID)
				}
			}
		}
	}

	return overview, nil
}

// ValidateConfig 验证配置
func ValidateConfig(config map[string]interface{}) (bool, []string) {
	var errors []string

	// 基本 JSON 验证
	data, err := json.Marshal(config)
	if err != nil {
		errors = append(errors, fmt.Sprintf("无效的 JSON: %v", err))
		return false, errors
	}

	// 重新解析验证
	var test map[string]interface{}
	if err := json.Unmarshal(data, &test); err != nil {
		errors = append(errors, fmt.Sprintf("配置格式错误: %v", err))
		return false, errors
	}

	return len(errors) == 0, errors
}

// GetGatewayToken 获取或创建 gateway token
func GetGatewayToken() (string, error) {
	config, err := GetConfig()
	if err != nil {
		return "", err
	}

	// 尝试从配置中获取
	if gateway, ok := config["gateway"].(map[string]interface{}); ok {
		if auth, ok := gateway["auth"].(map[string]interface{}); ok {
			if token, ok := auth["token"].(string); ok && token != "" {
				return token, nil
			}
		}
	}

	// 生成默认 token
	defaultToken := "openclaw-manager-local-token"
	return defaultToken, nil
}

// GetDashboardURL 获取 dashboard URL
func GetDashboardURL() string {
	return fmt.Sprintf("http://localhost:%d", ServicePort)
}

// GetAgentsList 获取 Agent 列表
func GetAgentsList() ([]model.AgentConfig, error) {
	config, err := GetConfig()
	if err != nil {
		return nil, err
	}

	// 读取 agents.list 数组
	agentsList, ok := config["agents"].(map[string]interface{})
	if !ok {
		agentsList = make(map[string]interface{})
	}

	listRaw, ok := agentsList["list"].([]interface{})
	if !ok {
		listRaw = []interface{}{}
	}

	// 读取顶层 bindings 数组
	allBindingsRaw, ok := config["bindings"].([]interface{})
	if !ok {
		allBindingsRaw = []interface{}{}
	}

	// 解析 bindings
	allBindings := make([]model.AgentBinding, 0)
	for _, b := range allBindingsRaw {
		if bMap, ok := b.(map[string]interface{}); ok {
			binding := model.AgentBinding{
				Channel: getString(bMap, "channel"),
			}
			if accountID, ok := bMap["accountId"].(string); ok {
				binding.AccountID = &accountID
			}
			allBindings = append(allBindings, binding)
		}
	}

	// 解析 agents
	agents := make([]model.AgentConfig, 0)
	for _, entry := range listRaw {
		if entryMap, ok := entry.(map[string]interface{}); ok {
			agent := parseAgentEntry(entryMap, allBindings)
			agents = append(agents, agent)
		}
	}

	// 如果没有任何 Agent，生成一个默认的 main Agent
	if len(agents) == 0 {
		defaultWorkspace := "~/.openclaw/workspace"
		if ws, ok := agentsList["defaults"].(map[string]interface{}); ok {
			if wsStr, ok := ws["workspace"].(string); ok {
				defaultWorkspace = wsStr
			}
		}

		agents = append(agents, model.AgentConfig{
			ID:              "main",
			Name:            "Main Agent",
			Emoji:           "🤖",
			Theme:           strPtr("General AI Assistant"),
			Workspace:       defaultWorkspace,
			IsDefault:       true,
			SandboxMode:     "off",
			ToolsAllow:      []string{"*"},
			ToolsDeny:       []string{},
			Bindings:        []model.AgentBinding{},
			MentionPatterns: []string{},
			SubagentAllow:   []string{"*"},
		})
	}

	// 确保至少有一个默认 Agent
	hasDefault := false
	for _, a := range agents {
		if a.IsDefault {
			hasDefault = true
			break
		}
	}
	if !hasDefault && len(agents) > 0 {
		agents[0].IsDefault = true
	}

	return agents, nil
}

// parseAgentEntry 解析单个 agent 条目
func parseAgentEntry(entry map[string]interface{}, allBindings []model.AgentBinding) model.AgentConfig {
	id := getString(entry, "id")
	if id == "" {
		id = "main"
	}

	isDefault := getBool(entry, "default")

	// name 和 emoji 可能直接在顶层，也可能嵌套在 identity 里
	name := getString(entry, "name")
	emoji := getString(entry, "emoji")
	if name == "" {
		if identity, ok := entry["identity"].(map[string]interface{}); ok {
			name = getString(identity, "name")
		}
	}
	if name == "" {
		name = "Agent"
	}
	if emoji == "" {
		if identity, ok := entry["identity"].(map[string]interface{}); ok {
			emoji = getString(identity, "emoji")
		}
	}
	if emoji == "" {
		emoji = "🤖"
	}

	var theme *string
	if identity, ok := entry["identity"].(map[string]interface{}); ok {
		if t, ok := identity["theme"].(string); ok {
			theme = &t
		}
	}

	workspace := getString(entry, "workspace")
	if workspace == "" {
		workspace = "~/.openclaw/workspace"
	}

	sandboxMode := getString(entry, "sandboxMode")
	if sandboxMode == "" {
		sandboxMode = "off"
	}

	toolsProfile := ""
	if tp, ok := entry["toolsProfile"].(string); ok {
		toolsProfile = tp
	}

	toolsAllow := parseStringArray(entry["toolsAllow"])
	toolsDeny := parseStringArray(entry["toolsDeny"])

	// 从全局 bindings 中提取属于该 agent 的绑定
	agentID := id
	bindings := make([]model.AgentBinding, 0)
	for _, b := range allBindings {
		if b.AgentID != nil && *b.AgentID == agentID {
			bindings = append(bindings, b)
		}
	}

	mentionPatterns := []string{}
	if groupChat, ok := entry["groupChat"].(map[string]interface{}); ok {
		mentionPatterns = parseStringArray(groupChat["mentionPatterns"])
	}

	subagentAllow := []string{}
	if subagents, ok := entry["subagents"].(map[string]interface{}); ok {
		if allow, ok := subagents["allowAgents"].([]interface{}); ok {
			for _, a := range allow {
				if s, ok := a.(string); ok {
					subagentAllow = append(subagentAllow, s)
				}
			}
		}
	}

	return model.AgentConfig{
		ID:              id,
		Name:            name,
		Emoji:           emoji,
		Theme:           theme,
		Workspace:       workspace,
		IsDefault:       isDefault,
		SandboxMode:     sandboxMode,
		ToolsProfile:    &toolsProfile,
		ToolsAllow:      toolsAllow,
		ToolsDeny:       toolsDeny,
		Bindings:        bindings,
		MentionPatterns: mentionPatterns,
		SubagentAllow:   subagentAllow,
	}
}

// getString 从 map 获取字符串值
func getString(m map[string]interface{}, key string) string {
	if v, ok := m[key].(string); ok {
		return v
	}
	return ""
}

// getBool 从 map 获取布尔值
func getBool(m map[string]interface{}, key string) bool {
	if v, ok := m[key].(bool); ok {
		return v
	}
	return false
}

// parseStringArray 解析字符串数组
func parseStringArray(v interface{}) []string {
	if arr, ok := v.([]interface{}); ok {
		result := make([]string, 0, len(arr))
		for _, item := range arr {
			if s, ok := item.(string); ok {
				result = append(result, s)
			}
		}
		return result
	}
	return []string{}
}

// strPtr 返回字符串指针
func strPtr(s string) *string {
	return &s
}

// SaveAgent 保存 Agent
func SaveAgent(agent *model.AgentConfig) error {
	config, err := GetConfig()
	if err != nil {
		return err
	}

	// 确保 agents 和 agents.list 存在
	if config["agents"] == nil {
		config["agents"] = map[string]interface{}{}
	}
	agentsMap := config["agents"].(map[string]interface{})
	if agentsMap["list"] == nil {
		agentsMap["list"] = []interface{}{}
	}
	if config["bindings"] == nil {
		config["bindings"] = []interface{}{}
	}

	// 将 AgentConfig 转换为 JSON 条目
	entry := agentToJSON(agent)

	// 更新或添加到 agents.list
	list := agentsMap["list"].([]interface{})
	found := false
	for i, a := range list {
		aMap, ok := a.(map[string]interface{})
		if !ok {
			continue
		}
		if getString(aMap, "id") == agent.ID {
			list[i] = entry
			found = true
			break
		}
	}
	if !found {
		list = append(list, entry)
	}
	agentsMap["list"] = list

	return SaveConfig(config)
}

// agentToJSON 将 AgentConfig 转换为 JSON 条目
func agentToJSON(agent *model.AgentConfig) map[string]interface{} {
	entry := map[string]interface{}{
		"id":        agent.ID,
		"workspace": agent.Workspace,
	}

	if agent.Name != "" {
		entry["name"] = agent.Name
	}
	if agent.Emoji != "" {
		entry["emoji"] = agent.Emoji
	}
	if agent.IsDefault {
		entry["default"] = true
	}
	if agent.SandboxMode != "" && agent.SandboxMode != "off" {
		entry["sandboxMode"] = agent.SandboxMode
	}
	if agent.ToolsProfile != nil && *agent.ToolsProfile != "" {
		entry["toolsProfile"] = *agent.ToolsProfile
	}
	if len(agent.ToolsAllow) > 0 {
		entry["toolsAllow"] = agent.ToolsAllow
	}
	if len(agent.ToolsDeny) > 0 {
		entry["toolsDeny"] = agent.ToolsDeny
	}
	if len(agent.MentionPatterns) > 0 {
		entry["groupChat"] = map[string]interface{}{
			"mentionPatterns": agent.MentionPatterns,
		}
	}
	if len(agent.SubagentAllow) > 0 {
		entry["subagents"] = map[string]interface{}{
			"allowAgents": agent.SubagentAllow,
		}
	}

	return entry
}

// DeleteAgent 删除 Agent
func DeleteAgent(agentID string) error {
	if agentID == "main" {
		return fmt.Errorf("cannot delete main agent")
	}

	config, err := GetConfig()
	if err != nil {
		return err
	}

	// 从 agents.list 移除
	if agentsMap, ok := config["agents"].(map[string]interface{}); ok {
		if list, ok := agentsMap["list"].([]interface{}); ok {
			newList := make([]interface{}, 0, len(list))
			for _, a := range list {
				aMap, ok := a.(map[string]interface{})
				if !ok {
					continue
				}
				if getString(aMap, "id") != agentID {
					newList = append(newList, a)
				}
			}
			agentsMap["list"] = newList
		}
	}

	// 从 bindings 移除
	if bindings, ok := config["bindings"].([]interface{}); ok {
		newBindings := make([]interface{}, 0, len(bindings))
		for _, b := range bindings {
			bMap, ok := b.(map[string]interface{})
			if !ok {
				continue
			}
			if aid := getString(bMap, "agentId"); aid != agentID {
				newBindings = append(newBindings, b)
			}
		}
		config["bindings"] = newBindings
	}

	return SaveConfig(config)
}

// SetDefaultAgent 设置默认 Agent
func SetDefaultAgent(agentID string) error {
	config, err := GetConfig()
	if err != nil {
		return err
	}

	if agentsMap, ok := config["agents"].(map[string]interface{}); ok {
		if list, ok := agentsMap["list"].([]interface{}); ok {
			for _, a := range list {
				aMap, ok := a.(map[string]interface{})
				if !ok {
					continue
				}
				id := getString(aMap, "id")
				if id == agentID {
					aMap["default"] = true
				} else {
					delete(aMap, "default")
				}
			}
			agentsMap["list"] = list
		}
	}

	return SaveConfig(config)
}

// GetChannelsConfig 获取渠道配置
func GetChannelsConfig() ([]model.ChannelConfig, error) {
	config, err := GetConfig()
	if err != nil {
		return nil, err
	}

	channelsObj, ok := config["channels"].(map[string]interface{})
	if !ok {
		channelsObj = make(map[string]interface{})
	}

	// 支持的渠道类型
	channelTypes := []struct {
		id       string
		typeName string
	}{
		{"telegram", "telegram"},
		{"discord", "discord"},
		{"slack", "slack"},
		{"feishu", "feishu"},
		{"whatsapp", "whatsapp"},
		{"imessage", "imessage"},
		{"wechat", "wechat"},
		{"dingtalk", "dingtalk"},
		{"dingtalk-connector", "dingtalk-connector"},
		{"msteams", "msteams"},
		{"signal", "signal"},
	}

	channels := make([]model.ChannelConfig, 0)
	for _, ct := range channelTypes {
		channelConfig, ok := channelsObj[ct.id].(map[string]interface{})
		if !ok {
			channelConfig = make(map[string]interface{})
		}

		enabled := getBool(channelConfig, "enabled")

		// 过滤掉 enabled 字段，只保留真正的配置
		configMap := make(map[string]interface{})
		for k, v := range channelConfig {
			if k != "enabled" {
				configMap[k] = v
			}
		}

		channels = append(channels, model.ChannelConfig{
			ID:          ct.id,
			ChannelType: ct.typeName,
			Enabled:     enabled,
			Config:      configMap,
		})
	}

	return channels, nil
}

// SaveChannelConfig 保存渠道配置
func SaveChannelConfig(channelType string, enabled bool, config map[string]interface{}) error {
	cfg, err := GetConfig()
	if err != nil {
		return err
	}

	// 确保 channels 对象存在
	if cfg["channels"] == nil {
		cfg["channels"] = make(map[string]interface{})
	}
	channelsMap := cfg["channels"].(map[string]interface{})

	// 构建渠道配置对象
	channelConfig := make(map[string]interface{})
	for k, v := range config {
		channelConfig[k] = v
	}
	channelConfig["enabled"] = enabled

	channelsMap[channelType] = channelConfig

	// 确保 plugins.allow 数组存在
	if cfg["plugins"] == nil {
		cfg["plugins"] = map[string]interface{}{
			"allow":   []interface{}{},
			"entries": map[string]interface{}{},
		}
	}
	pluginsMap := cfg["plugins"].(map[string]interface{})
	if pluginsMap["allow"] == nil {
		pluginsMap["allow"] = []interface{}{}
	}
	if pluginsMap["entries"] == nil {
		pluginsMap["entries"] = map[string]interface{}{}
	}

	// 将渠道添加到 plugins.allow 数组（如果不存在）
	allowArr := pluginsMap["allow"].([]interface{})
	found := false
	for _, a := range allowArr {
		if a == channelType {
			found = true
			break
		}
	}
	if !found {
		pluginsMap["allow"] = append(allowArr, channelType)
	}

	return SaveConfig(cfg)
}

// ClearChannelConfig 清除渠道配置
func ClearChannelConfig(channelType string) error {
	cfg, err := GetConfig()
	if err != nil {
		return err
	}

	// 从 channels 中删除
	if channelsMap, ok := cfg["channels"].(map[string]interface{}); ok {
		delete(channelsMap, channelType)
	}

	// 从 plugins.allow 中删除
	if pluginsMap, ok := cfg["plugins"].(map[string]interface{}); ok {
		if allowArr, ok := pluginsMap["allow"].([]interface{}); ok {
			newAllow := make([]interface{}, 0, len(allowArr))
			for _, a := range allowArr {
				if a != channelType {
					newAllow = append(newAllow, a)
				}
			}
			pluginsMap["allow"] = newAllow
		}
	}

	return SaveConfig(cfg)
}
