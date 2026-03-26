package handler

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"iclaw-admin-api/internal/model"
)

// RunDoctor 运行诊断 (placeholder)
func RunDoctor(c *gin.Context) {
	results := []model.DiagnosticResult{
		{Name: "OpenClaw", Passed: true, Message: "OpenClaw is installed"},
		{Name: "Node.js", Passed: true, Message: "Node.js is available"},
		{Name: "Configuration", Passed: true, Message: "Config files are valid"},
	}
	c.JSON(http.StatusOK, results)
}

// TestAIConnection 测试 AI 连接 (placeholder)
func TestAIConnection(c *gin.Context) {
	response := "AI connection successful (placeholder)"
	result := model.AITestResult{
		Success:  true,
		Provider: "openai",
		Model:    "gpt-4o",
		Response: &response,
	}
	c.JSON(http.StatusOK, result)
}

// TestChannel 测试渠道 (placeholder)
func TestChannel(c *gin.Context) {
	channelType := c.Param("type")
	result := model.ChannelTestResult{
		Success: true,
		Channel: channelType,
		Message: "Channel test passed (placeholder)",
	}
	c.JSON(http.StatusOK, result)
}

// SendTestMessage 发送测试消息 (placeholder)
func SendTestMessage(c *gin.Context) {
	channelType := c.Param("type")
	result := model.ChannelTestResult{
		Success: true,
		Channel: channelType,
		Message: "Test message sent (placeholder)",
	}
	c.JSON(http.StatusOK, result)
}

// StartChannelLogin 开始渠道登录 (placeholder)
func StartChannelLogin(c *gin.Context) {
	channelType := c.Param("type")
	c.JSON(http.StatusOK, gin.H{"message": "Channel login started for " + channelType + " (placeholder)"})
}
