package handler

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"iclaw-admin-api/internal/model"
	"iclaw-admin-api/internal/service"
)

// OfficialProviders 官方 Provider 预设
var OfficialProviders = []model.OfficialProvider{
	{
		ID:             "openai",
		Name:           "OpenAI",
		Icon:           "",
		DefaultBaseURL: strPtr("https://api.openai.com"),
		APIType:        "openai-completions",
		SuggestedModels: []model.SuggestedModel{
			{ID: "gpt-4o", Name: "GPT-4o", Recommended: true, ContextWindow: uintPtr(128000), MaxTokens: uintPtr(4096)},
			{ID: "gpt-4o-mini", Name: "GPT-4o mini", Recommended: false, ContextWindow: uintPtr(128000), MaxTokens: uintPtr(16384)},
			{ID: "gpt-4-turbo", Name: "GPT-4 Turbo", Recommended: false, ContextWindow: uintPtr(128000), MaxTokens: uintPtr(4096)},
			{ID: "gpt-3.5-turbo", Name: "GPT-3.5 Turbo", Recommended: false, ContextWindow: uintPtr(16385), MaxTokens: uintPtr(4096)},
		},
		RequiresAPIKey: true,
		DocsURL:        strPtr("https://platform.openai.com/docs"),
	},
	{
		ID:             "anthropic",
		Name:           "Anthropic",
		Icon:           "",
		DefaultBaseURL: strPtr("https://api.anthropic.com"),
		APIType:        "anthropic-messages",
		SuggestedModels: []model.SuggestedModel{
			{ID: "claude-sonnet-4-20250514", Name: "Claude Sonnet 4", Recommended: true, ContextWindow: uintPtr(200000), MaxTokens: uintPtr(8192)},
			{ID: "claude-3-5-sonnet-latest", Name: "Claude 3.5 Sonnet", Recommended: false, ContextWindow: uintPtr(200000), MaxTokens: uintPtr(8192)},
			{ID: "claude-3-5-haiku-latest", Name: "Claude 3.5 Haiku", Recommended: false, ContextWindow: uintPtr(200000), MaxTokens: uintPtr(8192)},
			{ID: "claude-3-opus-latest", Name: "Claude 3 Opus", Recommended: false, ContextWindow: uintPtr(200000), MaxTokens: uintPtr(4096)},
		},
		RequiresAPIKey: true,
		DocsURL:        strPtr("https://docs.anthropic.com"),
	},
	{
		ID:             "deepseek",
		Name:           "DeepSeek",
		Icon:           "",
		DefaultBaseURL: strPtr("https://api.deepseek.com"),
		APIType:        "openai-completions",
		SuggestedModels: []model.SuggestedModel{
			{ID: "deepseek-chat", Name: "DeepSeek Chat", Recommended: true, ContextWindow: uintPtr(64000), MaxTokens: uintPtr(4096)},
			{ID: "deepseek-coder", Name: "DeepSeek Coder", Recommended: false, ContextWindow: uintPtr(64000), MaxTokens: uintPtr(4096)},
		},
		RequiresAPIKey: true,
		DocsURL:        strPtr("https://platform.deepseek.com/docs"),
	},
}

func strPtr(s string) *string { return &s }
func uintPtr(u uint32) *uint32 { return &u }

// GetOfficialProviders 获取官方 Provider 列表
func GetOfficialProviders(c *gin.Context) {
	c.JSON(http.StatusOK, OfficialProviders)
}

// GetAIConfig 获取 AI 配置概览
func GetAIConfig(c *gin.Context) {
	overview, err := service.GetAIConfig()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, overview)
}

// SaveProvider 保存 Provider
func SaveProvider(c *gin.Context) {
	var req model.ProviderRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	config, err := service.GetConfig()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	// 确保 models 和 providers 结构存在
	if config["models"] == nil {
		config["models"] = map[string]interface{}{}
	}
	modelsMap := config["models"].(map[string]interface{})
	if modelsMap["providers"] == nil {
		modelsMap["providers"] = map[string]interface{}{}
	}
	providersMap := modelsMap["providers"].(map[string]interface{})

	// 构建 provider 配置
	providerConfig := map[string]interface{}{
		"baseUrl": req.BaseURL,
		"apiKey":  req.APIKey,
		"models":  []map[string]interface{}{},
	}

	// 如果提供了模型列表，转换格式
	if len(req.Models) > 0 {
		modelsList := make([]map[string]interface{}, 0, len(req.Models))
		for _, modelName := range req.Models {
			modelsList = append(modelsList, map[string]interface{}{
				"id":   modelName,
				"name": modelName,
				"api":  req.APIType,
			})
		}
		providerConfig["models"] = modelsList
	}

	providersMap[req.Name] = providerConfig

	if err := service.SaveConfig(config); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Provider saved successfully"})
}

// DeleteProvider 删除 Provider
func DeleteProvider(c *gin.Context) {
	providerName := c.Param("name")
	if providerName == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "provider name is required"})
		return
	}

	config, err := service.GetConfig()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	// 从 providers 中删除
	deleted := false
	if modelsMap, ok := config["models"].(map[string]interface{}); ok {
		if providersMap, ok := modelsMap["providers"].(map[string]interface{}); ok {
			if _, exists := providersMap[providerName]; exists {
				delete(providersMap, providerName)
				deleted = true
			}
		}
	}

	// 从可用模型中删除该 provider 的所有模型
	if agentsMap, ok := config["agents"].(map[string]interface{}); ok {
		if defaultsMap, ok := agentsMap["defaults"].(map[string]interface{}); ok {
			if modelsMap, ok := defaultsMap["models"].(map[string]interface{}); ok {
				prefix := providerName + "/"
				for modelID := range modelsMap {
					if len(modelID) > len(prefix) && modelID[:len(prefix)] == prefix {
						delete(modelsMap, modelID)
					}
				}
			}
		}
	}

	if !deleted {
		c.JSON(http.StatusNotFound, gin.H{"error": "provider not found"})
		return
	}

	if err := service.SaveConfig(config); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Provider deleted successfully"})
}

// SetPrimaryModel 设置主模型
func SetPrimaryModel(c *gin.Context) {
	var req model.PrimaryModelRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	if req.ModelID == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "modelId is required"})
		return
	}

	config, err := service.GetConfig()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	// 确保路径存在: agents -> defaults -> model -> primary
	if config["agents"] == nil {
		config["agents"] = map[string]interface{}{}
	}
	agentsMap, ok := config["agents"].(map[string]interface{})
	if !ok {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "invalid agents config"})
		return
	}
	if agentsMap["defaults"] == nil {
		agentsMap["defaults"] = map[string]interface{}{}
	}
	defaultsMap, ok := agentsMap["defaults"].(map[string]interface{})
	if !ok {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "invalid agents.defaults config"})
		return
	}
	if defaultsMap["model"] == nil {
		defaultsMap["model"] = map[string]interface{}{}
	}
	modelMap, ok := defaultsMap["model"].(map[string]interface{})
	if !ok {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "invalid agents.defaults.model config"})
		return
	}
	modelMap["primary"] = req.ModelID

	if err := service.SaveConfig(config); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Primary model set successfully"})
}

// AddAvailableModel 添加可用模型
func AddAvailableModel(c *gin.Context) {
	var req model.PrimaryModelRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	if req.ModelID == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "modelId is required"})
		return
	}

	config, err := service.GetConfig()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	// 确保路径存在: agents -> defaults -> models
	if config["agents"] == nil {
		config["agents"] = map[string]interface{}{}
	}
	agentsMap := config["agents"].(map[string]interface{})
	if agentsMap["defaults"] == nil {
		agentsMap["defaults"] = map[string]interface{}{}
	}
	defaultsMap := agentsMap["defaults"].(map[string]interface{})
	if defaultsMap["models"] == nil {
		defaultsMap["models"] = map[string]interface{}{}
	}
	modelsMap := defaultsMap["models"].(map[string]interface{})

	// 添加模型（值为空对象）
	modelsMap[req.ModelID] = map[string]interface{}{}

	if err := service.SaveConfig(config); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Model added successfully"})
}

// RemoveAvailableModel 移除模型
func RemoveAvailableModel(c *gin.Context) {
	var req model.PrimaryModelRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	if req.ModelID == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "modelId is required"})
		return
	}

	config, err := service.GetConfig()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	removed := false
	if agentsMap, ok := config["agents"].(map[string]interface{}); ok {
		if defaultsMap, ok := agentsMap["defaults"].(map[string]interface{}); ok {
			if modelsMap, ok := defaultsMap["models"].(map[string]interface{}); ok {
				if _, exists := modelsMap[req.ModelID]; exists {
					delete(modelsMap, req.ModelID)
					removed = true
				}
			}
		}
	}

	if !removed {
		c.JSON(http.StatusNotFound, gin.H{"error": "model not found"})
		return
	}

	if err := service.SaveConfig(config); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Model removed successfully"})
}
