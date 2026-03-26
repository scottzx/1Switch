package handler

import (
	"fmt"
	"net/http"

	"github.com/gin-gonic/gin"
	"iclaw-admin-api/internal/model"
	"iclaw-admin-api/internal/service"
)

// GetConfig 获取配置
// @Summary 获取配置
// @Tags Config
// @Produce json
// @Success 200 {object} map[string]interface{}
// @Router /api/config [get]
func GetConfig(c *gin.Context) {
	config, err := service.GetConfig()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"config": config})
}

// SaveConfig 保存配置
// @Summary 保存配置
// @Tags Config
// @Accept json
// @Produce json
// @Param config body model.ConfigUpdateRequest true "配置"
// @Success 200 {string} string
// @Router /api/config [put]
func SaveConfig(c *gin.Context) {
	var req model.ConfigUpdateRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	if err := service.SaveConfig(req.Config); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "配置已保存"})
}

// GetEnvValue 获取环境变量
// @Summary 获取环境变量
// @Tags Config
// @Produce json
// @Param key path string true "key"
// @Success 200 {string} string
// @Router /api/config/env/{key} [get]
func GetEnvValue(c *gin.Context) {
	key := c.Param("key")
	value, err := service.GetEnvValue(key)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"value": value})
}

// SaveEnvValue 保存环境变量
// @Summary 保存环境变量
// @Tags Config
// @Accept json
// @Produce json
// @Param key path string true "key"
// @Param value body string true "value"
// @Success 200 {string} string
// @Router /api/config/env/{key} [put]
func SaveEnvValue(c *gin.Context) {
	key := c.Param("key")
	var req struct {
		Value string `json:"value"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	if err := service.SaveEnvValue(key, req.Value); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "环境变量已保存"})
}

// ValidateConfig 验证配置
// @Summary 验证配置
// @Tags Config
// @Accept json
// @Produce json
// @Param config body model.ConfigValidateRequest true "配置"
// @Success 200 {object} model.ConfigValidateResponse
// @Router /api/config/validate [post]
func ValidateConfig(c *gin.Context) {
	var req model.ConfigValidateRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	valid, errors := service.ValidateConfig(req.Config)
	c.JSON(http.StatusOK, model.ConfigValidateResponse{
		Valid:  valid,
		Errors: errors,
	})
}

// GetGatewayToken 获取 gateway token
// @Summary 获取 gateway token
// @Tags Gateway
// @Produce json
// @Success 200 {string} string
// @Router /api/gateway/token [get]
func GetGatewayToken(c *gin.Context) {
	token, err := service.GetGatewayToken()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"token": token})
}

// GetDashboardURL 获取 dashboard URL
// @Summary 获取 dashboard URL
// @Tags Gateway
// @Produce json
// @Success 200 {string} string
// @Router /api/gateway/dashboard-url [get]
func GetDashboardURL(c *gin.Context) {
	token, err := service.GetGatewayToken()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	url := fmt.Sprintf("http://localhost:%d?token=%s", service.ServicePort, token)
	c.JSON(http.StatusOK, gin.H{"url": url})
}
