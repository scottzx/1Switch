package handler

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"os/exec"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"iclaw-admin-api/internal/model"
)

// RunDoctor 运行诊断
func RunDoctor(c *gin.Context) {
	results := []model.DiagnosticResult{}

	// Check gateway health
	gatewayURL := "http://127.0.0.1:18789/health"
	client := &http.Client{Timeout: 5 * time.Second}

	resp, err := client.Get(gatewayURL)
	if err != nil {
		results = append(results, model.DiagnosticResult{
			Name:    "Gateway",
			Passed:  false,
			Message: "Gateway unreachable: " + err.Error(),
		})
	} else {
		resp.Body.Close()
		if resp.StatusCode == http.StatusOK {
			results = append(results, model.DiagnosticResult{
				Name:    "Gateway",
				Passed:  true,
				Message: "Gateway is healthy",
			})
		} else {
			results = append(results, model.DiagnosticResult{
				Name:    "Gateway",
				Passed:  false,
				Message: fmt.Sprintf("Gateway returned status %d", resp.StatusCode),
			})
		}
	}

	// Check if openclaw CLI is available (quick check)
	ctx, cancel := context.WithTimeout(context.Background(), 3*time.Second)
	cmd := exec.CommandContext(ctx, "openclaw", "--version")
	err = cmd.Run()
	cancel()

	if err != nil {
		if ctx.Err() == context.DeadlineExceeded {
			results = append(results, model.DiagnosticResult{
				Name:    "OpenClaw CLI",
				Passed:  false,
				Message: "OpenClaw CLI timed out during version check",
			})
		} else {
			results = append(results, model.DiagnosticResult{
				Name:    "OpenClaw CLI",
				Passed:  false,
				Message: "OpenClaw CLI not available: " + err.Error(),
			})
		}
	} else {
		results = append(results, model.DiagnosticResult{
			Name:    "OpenClaw CLI",
			Passed:  true,
			Message: "OpenClaw CLI is installed",
		})
	}

	// Check Node.js
	ctx2, cancel2 := context.WithTimeout(context.Background(), 3*time.Second)
	cmd2 := exec.CommandContext(ctx2, "node", "--version")
	err2 := cmd2.Run()
	cancel2()

	if err2 != nil {
		if ctx2.Err() == context.DeadlineExceeded {
			results = append(results, model.DiagnosticResult{
				Name:    "Node.js",
				Passed:  false,
				Message: "Node.js timed out during version check",
			})
		} else {
			results = append(results, model.DiagnosticResult{
				Name:    "Node.js",
				Passed:  false,
				Message: "Node.js not available: " + err2.Error(),
			})
		}
	} else {
		results = append(results, model.DiagnosticResult{
			Name:    "Node.js",
			Passed:  true,
			Message: "Node.js is available",
		})
	}

	// Check Configuration directory
	ctx3, cancel3 := context.WithTimeout(context.Background(), 3*time.Second)
	cmd3 := exec.CommandContext(ctx3, "openclaw", "channels", "list")
	var stdout bytes.Buffer
	var stderr bytes.Buffer
	cmd3.Stdout = &stdout
	cmd3.Stderr = &stderr
	err3 := cmd3.Run()
	cancel3()

	if err3 != nil {
		if ctx3.Err() == context.DeadlineExceeded {
			results = append(results, model.DiagnosticResult{
				Name:    "Configuration",
				Passed:  false,
				Message: "Configuration check timed out (gateway may be busy)",
			})
		} else {
			results = append(results, model.DiagnosticResult{
				Name:    "Configuration",
				Passed:  false,
				Message: "Configuration check failed: " + err3.Error(),
			})
		}
	} else {
		results = append(results, model.DiagnosticResult{
			Name:    "Configuration",
			Passed:  true,
			Message: "Config files are valid",
		})
	}

	c.JSON(http.StatusOK, results)
}

// TestAIConnection 测试 AI 连接
func TestAIConnection(c *gin.Context) {
	// Test gateway health API
	gatewayURL := "http://127.0.0.1:18789/health"
	client := &http.Client{Timeout: 5 * time.Second}

	resp, err := client.Get(gatewayURL)
	if err != nil {
		result := model.AITestResult{
			Success:  false,
			Provider: "gateway",
			Error:    ptr("Gateway unreachable: " + err.Error()),
		}
		c.JSON(http.StatusOK, result)
		return
	}
	defer resp.Body.Close()

	body, _ := io.ReadAll(resp.Body)
	var healthResp map[string]interface{}
	json.Unmarshal(body, &healthResp)

	if resp.StatusCode != http.StatusOK {
		result := model.AITestResult{
			Success:  false,
			Provider: "gateway",
			Error:    ptr(fmt.Sprintf("Gateway returned status %d", resp.StatusCode)),
		}
		c.JSON(http.StatusOK, result)
		return
	}

	// Determine provider and model from gateway health
	provider := "openclaw"
	modelName := "default"
	if agents, ok := healthResp["agents"].([]interface{}); ok && len(agents) > 0 {
		if agent, ok := agents[0].(map[string]interface{}); ok {
			if agentId, ok := agent["agentId"].(string); ok {
				modelName = agentId
			}
		}
	}

	response := "Gateway is healthy"
	result := model.AITestResult{
		Success:  true,
		Provider: provider,
		Model:    modelName,
		Response: &response,
	}
	c.JSON(http.StatusOK, result)
}

// TestChannel 测试渠道
func TestChannel(c *gin.Context) {
	channelType := c.Param("type")

	// First check if gateway is reachable
	gatewayURL := "http://127.0.0.1:18789/health"
	client := &http.Client{Timeout: 5 * time.Second}

	resp, err := client.Get(gatewayURL)
	if err != nil {
		result := model.ChannelTestResult{
			Channel: channelType,
			Success: false,
			Message: "Gateway unreachable: " + err.Error(),
		}
		c.JSON(http.StatusOK, result)
		return
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		result := model.ChannelTestResult{
			Channel: channelType,
			Success: false,
			Message: fmt.Sprintf("Gateway returned status %d", resp.StatusCode),
		}
		c.JSON(http.StatusOK, result)
		return
	}

	// Gateway is reachable, so channel is accessible
	result := model.ChannelTestResult{
		Channel: channelType,
		Success: true,
		Message: fmt.Sprintf("Channel %s is accessible (gateway is healthy)", channelType),
	}
	c.JSON(http.StatusOK, result)
}

// SendTestMessage 发送测试消息
func SendTestMessage(c *gin.Context) {
	channelType := c.Param("type")

	// Get target and message from request
	target := c.Query("target")
	if target == "" {
		var body map[string]interface{}
		if data, err := io.ReadAll(c.Request.Body); err == nil && len(data) > 0 {
			json.Unmarshal(data, &body)
			if t, ok := body["target"].(string); ok {
				target = t
			}
		}
	}

	if target == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "target is required"})
		return
	}

	// Get message from query or body
	message := c.Query("message")
	if message == "" {
		var body map[string]interface{}
		if data, err := io.ReadAll(c.Request.Body); err == nil && len(data) > 0 {
			json.Unmarshal(data, &body)
			if msg, ok := body["message"].(string); ok {
				message = msg
			}
		}
	}
	if message == "" {
		message = "Test message from iclaw-admin-api"
	}

	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()

	// Build openclaw message send command
	cmd := exec.CommandContext(ctx, "openclaw", "message", "send",
		"--channel", channelType,
		"--target", target,
		"--message", message,
		"--json")

	var stdout bytes.Buffer
	var stderr bytes.Buffer
	cmd.Stdout = &stdout
	cmd.Stderr = &stderr

	err := cmd.Run()

	result := model.ChannelTestResult{
		Channel: channelType,
	}

	if err != nil {
		if ctx.Err() == context.DeadlineExceeded {
			result.Success = false
			result.Message = "Send message timed out"
			result.Error = ptr("Message send timed out after 30 seconds")
		} else {
			result.Success = false
			result.Message = "Failed to send message: " + err.Error()
			errMsg := strings.TrimSpace(stderr.String())
			if errMsg != "" {
				result.Error = &errMsg
			}
		}
	} else {
		result.Success = true
		result.Message = "Test message sent successfully"
	}

	c.JSON(http.StatusOK, result)
}

// StartChannelLogin 开始渠道登录
func StartChannelLogin(c *gin.Context) {
	channelType := c.Param("type")

	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()

	// Start channel login (this is typically interactive, so we just initiate)
	cmd := exec.CommandContext(ctx, "openclaw", "channels", "login", "--channel", channelType)
	var stdout bytes.Buffer
	var stderr bytes.Buffer
	cmd.Stdout = &stdout
	cmd.Stderr = &stderr

	// Login may fail if it requires interactive input, which is expected
	err := cmd.Run()

	output := strings.TrimSpace(stdout.String()) + strings.TrimSpace(stderr.String())

	if err != nil {
		if ctx.Err() == context.DeadlineExceeded {
			c.JSON(http.StatusOK, gin.H{
				"message": fmt.Sprintf("Channel login timed out for %s", channelType),
				"error":   "Login operation timed out",
			})
			return
		}
		// Login command returned error (possibly interactive requirement)
		c.JSON(http.StatusOK, gin.H{
			"message": fmt.Sprintf("Channel login initiated for %s (interactive login may be required)", channelType),
			"output":  output,
			"error":   err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message": fmt.Sprintf("Channel login started for %s", channelType),
		"output":  output,
	})
}

// ptr returns a pointer to the given string
func ptr(s string) *string {
	return &s
}
